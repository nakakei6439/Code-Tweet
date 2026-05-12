-- Admin login lockout storage.
-- Apply this in Supabase SQL Editor before enabling the admin security environment variables.

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
