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
-- src/lib/generationHistory.ts の recordTweetGeneration / recordNoteGeneration が INSERT 成功後に
-- 超過分を同期削除する。TWEET_GENERATION_HISTORY_LIMIT を参照。
create table if not exists tweet_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_type text not null default 'tweet',
  tweets jsonb not null default '[]'::jsonb,
  note jsonb,
  source_url text,
  hashtags text,
  created_at timestamptz not null default now(),
  constraint tweet_generations_type_check
    check (generation_type in ('tweet', 'note')),
  constraint tweet_generations_payload_check
    check (
      (generation_type = 'tweet' and jsonb_typeof(tweets) = 'array' and note is null)
      or
      (generation_type = 'note' and jsonb_typeof(tweets) = 'array' and note is not null)
    )
);

alter table tweet_generations
  add column if not exists generation_type text not null default 'tweet';

alter table tweet_generations
  add column if not exists note jsonb;

alter table tweet_generations
  alter column tweets set default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tweet_generations_type_check'
      and conrelid = 'tweet_generations'::regclass
  ) then
    alter table tweet_generations
      add constraint tweet_generations_type_check
      check (generation_type in ('tweet', 'note'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tweet_generations_payload_check'
      and conrelid = 'tweet_generations'::regclass
  ) then
    alter table tweet_generations
      add constraint tweet_generations_payload_check
      check (
        (generation_type = 'tweet' and jsonb_typeof(tweets) = 'array' and note is null)
        or
        (generation_type = 'note' and jsonb_typeof(tweets) = 'array' and note is not null)
      );
  end if;
end $$;

alter table tweet_generations enable row level security;

drop policy if exists "users_read_own_tweet_generations" on tweet_generations;
create policy "users_read_own_tweet_generations"
  on tweet_generations
  for select
  using (auth.uid() = user_id);

create index if not exists tweet_generations_user_created_at_idx
  on tweet_generations (user_id, created_at desc);
