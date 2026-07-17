-- Code Tweet Supabase setup.
-- Apply this file in Supabase SQL Editor for a fresh project or to bring
-- existing tables up to the current schema. It is intentionally idempotent.

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz not null default now()
);

alter table usage_logs enable row level security;

drop policy if exists "users can read own logs" on usage_logs;
create policy "users can read own logs"
  on usage_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own logs" on usage_logs;
create policy "users can insert own logs"
  on usage_logs
  for insert
  with check (auth.uid() = user_id);

create index if not exists usage_logs_user_date_idx
  on usage_logs (user_id, generated_at);

create table if not exists ip_usage_logs (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  generated_at timestamptz not null default now()
);

alter table ip_usage_logs enable row level security;

create index if not exists ip_usage_logs_ip_date_idx
  on ip_usage_logs (ip_hash, generated_at);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free', 'paid')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

drop policy if exists "users_read_own_subscription" on subscriptions;
create policy "users_read_own_subscription"
  on subscriptions
  for select
  using (auth.uid() = user_id);

create table if not exists user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_pat_encrypted text not null,
  github_pat_iv text not null,
  github_pat_tag text not null,
  source text not null default 'pat' check (source in ('pat', 'github_oauth')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table user_tokens
  add column if not exists source text not null default 'pat'
  check (source in ('pat', 'github_oauth'));

alter table user_tokens enable row level security;

drop policy if exists "users_manage_own_tokens" on user_tokens;
drop policy if exists "user_tokens_no_client_access" on user_tokens;
create policy "user_tokens_no_client_access"
  on user_tokens
  for all
  using (false)
  with check (false);

-- GitHub App のインストール対応表。
-- PAT を保存せず、利用者ごとに installation_id（番号）のみを保持する。
-- README 取得時はサーバーがこの id から約1時間で失効する使い捨てトークンを発行する。
create table if not exists github_app_installations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  installation_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table github_app_installations enable row level security;

drop policy if exists "github_app_installations_no_client_access" on github_app_installations;
create policy "github_app_installations_no_client_access"
  on github_app_installations
  for all
  using (false)
  with check (false);

create table if not exists admin_login_attempts (
  identifier text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table admin_login_attempts enable row level security;

drop policy if exists "admin_login_attempts_no_client_access" on admin_login_attempts;
create policy "admin_login_attempts_no_client_access"
  on admin_login_attempts
  for all
  using (false)
  with check (false);

create index if not exists admin_login_attempts_locked_until_idx
  on admin_login_attempts (locked_until);

-- アプリ層の制約: 1 ユーザーあたり最新 50 件のみ保持。
-- src/lib/generationHistory.ts の recordTweetGeneration が INSERT 成功後に
-- 超過分を同期削除する。TWEET_GENERATION_HISTORY_LIMIT を参照。
create table if not exists tweet_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tweets jsonb not null,
  source_url text,
  hashtags text,
  created_at timestamptz not null default now()
);

alter table tweet_generations enable row level security;

drop policy if exists "users_read_own_tweet_generations" on tweet_generations;
create policy "users_read_own_tweet_generations"
  on tweet_generations
  for select
  using (auth.uid() = user_id);

create index if not exists tweet_generations_user_created_at_idx
  on tweet_generations (user_id, created_at desc);

-- 購入クレジット残高。毎月の無料枠とは別管理で、有効期限なしで繰り越す。
-- 書き込みは service role（RPC 経由）のみ。クライアントは本人の select だけ。
create table if not exists user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_credits enable row level security;

drop policy if exists "users_read_own_credits" on user_credits;
create policy "users_read_own_credits"
  on user_credits
  for select
  using (auth.uid() = user_id);

-- Stripe イベント単位のクレジット付与台帳。
-- stripe_event_id を主キーにすることで webhook のリトライ二重発火でも
-- 二重付与が物理的に起きない（冪等性ガードを兼ねる）。
create table if not exists credit_grants (
  stripe_event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null check (credits > 0),
  stripe_session_id text,
  created_at timestamptz not null default now()
);

alter table credit_grants enable row level security;

drop policy if exists "users_read_own_credit_grants" on credit_grants;
create policy "users_read_own_credit_grants"
  on credit_grants
  for select
  using (auth.uid() = user_id);

create index if not exists credit_grants_user_idx
  on credit_grants (user_id, created_at desc);

-- クレジット付与。台帳 insert と残高加算を 1 トランザクションで行う。
-- 既に処理済みイベント（同じ stripe_event_id）なら何もせず false を返す。
create or replace function grant_credits(
  p_event_id text,
  p_user_id uuid,
  p_credits integer,
  p_session_id text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean;
begin
  if p_credits is null or p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  insert into credit_grants (stripe_event_id, user_id, credits, stripe_session_id)
  values (p_event_id, p_user_id, p_credits, p_session_id)
  on conflict (stripe_event_id) do nothing;

  inserted := found;
  if not inserted then
    return false;
  end if;

  insert into user_credits (user_id, balance, updated_at)
  values (p_user_id, p_credits, now())
  on conflict (user_id)
  do update set balance = user_credits.balance + excluded.balance, updated_at = now();

  return true;
end;
$$;

-- クレジット 1 消費。残高 1 以上のときだけ減算し、成否を返す。
-- update の where 条件で残高チェックと減算を atomic に行う（read-modify-write の競合なし）。
create or replace function consume_credit(p_user_id uuid) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update user_credits
  set balance = balance - 1, updated_at = now()
  where user_id = p_user_id and balance >= 1;
  return found;
end;
$$;

-- RPC はサーバー（service role）専用。クライアントの PostgREST 経由呼び出しを禁止する。
revoke execute on function grant_credits(text, uuid, integer, text) from anon, authenticated;
revoke execute on function consume_credit(uuid) from anon, authenticated;
