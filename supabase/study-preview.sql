-- OPTIONAL: apply to a separate preview Supabase project, never automatically.
-- Existing production tables are not changed.
create table if not exists public.study_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (octet_length(payload::text) <= 250000),
  revision bigint not null default 1 check (revision > 0)
);
alter table public.study_backups enable row level security;
revoke all on public.study_backups from anon;
grant select, insert, update, delete on public.study_backups to authenticated;
create policy "Read own study backup" on public.study_backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own study backup" on public.study_backups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own study backup" on public.study_backups for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own study backup" on public.study_backups for delete to authenticated using ((select auth.uid()) = user_id);
