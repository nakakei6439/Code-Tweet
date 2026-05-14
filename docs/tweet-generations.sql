-- Apply this in Supabase SQL Editor before enabling generation history.

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
