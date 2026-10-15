-- kana dojo phase 1: user profiles + cloud progress
-- paste this whole file into supabase > sql editor > run. safe to run more than once

-- profiles: one row per user, created automatically on signup
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  avatar_kana text not null default 'か',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint display_name_length check (display_name is null or char_length(display_name) between 1 and 40),
  constraint avatar_kana_one_char check (char_length(avatar_kana) = 1),
  constraint avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 1000)
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- progress: the whole learning state as json, one row per user.
-- rev goes up by one on every save so two devices can't silently overwrite each other
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  rev integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint progress_is_object check (jsonb_typeof(progress) = 'object'),
  constraint settings_is_object check (jsonb_typeof(settings) = 'object'),
  -- keeps one account from filling the database
  constraint progress_size check (pg_column_size(progress) < 2000000),
  constraint settings_size check (pg_column_size(settings) < 20000)
);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_progress_touch on public.user_progress;
create trigger user_progress_touch before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- make a profile when someone signs up (email or google).
-- picks the username they typed if it's valid and free, otherwise builds one
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text;
  base text;
  candidate text;
  tries int := 0;
begin
  wanted := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  base := lower(regexp_replace(
    coalesce(nullif(wanted, ''), split_part(coalesce(new.email, ''), '@', 1), 'learner'),
    '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then base := base || 'kana'; end if;
  base := left(base, 15);

  candidate := case when wanted ~ '^[a-z0-9_]{3,20}$' then wanted else base end;
  while exists (select 1 from public.profiles p where lower(p.username) = candidate) and tries < 20 loop
    candidate := base || floor(random() * 10000)::int::text;
    tries := tries + 1;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    left(nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''), 40),
    left(new.raw_user_meta_data ->> 'avatar_url', 1000)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- row level security: every user can only ever touch their own rows
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "read own progress" on public.user_progress;
create policy "read own progress" on public.user_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own progress" on public.user_progress;
create policy "insert own progress" on public.user_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "update own progress" on public.user_progress;
create policy "update own progress" on public.user_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- column level limits on top of rls: users can edit their name/avatar,
-- never their id or timestamps. logged out visitors get nothing
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_kana) on public.profiles to authenticated;
grant select, insert on public.user_progress to authenticated;
grant update (progress, settings, rev) on public.user_progress to authenticated;
