-- kana dojo: weekly leaderboard
-- paste this whole file into supabase > sql editor > run (after 0001). safe to run more than once

-- everyone signed in shows up unless they flip this off in settings
alter table public.profiles add column if not exists show_on_leaderboard boolean not null default true;
grant update (show_on_leaderboard) on public.profiles to authenticated;

-- the board. progress stays private: this runs as the owner and only hands back
-- a name, belt and one number per person, never the progress itself.
-- score = correct answers between week_start (the viewer's monday) and sunday,
-- read from the day log every device already syncs. capped so junk can't explode it
create or replace function public.weekly_leaderboard(week_start date)
returns table (rank bigint, username text, display_name text, avatar_kana text, belt int, score int, is_me boolean, hidden boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as id
  ),
  s as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_kana,
      p.show_on_leaderboard as shown,
      case when jsonb_typeof(u.progress -> 'belt') = 'number'
        then least(greatest((u.progress ->> 'belt')::numeric, 0), 20)::int else 0 end as belt,
      coalesce((
        select sum(least(greatest((d.value ->> 'correct')::numeric, 0), 5000))::int
        from jsonb_each(case when jsonb_typeof(u.progress -> 'days') = 'object' then u.progress -> 'days' else '{}'::jsonb end) d
        where d.key between to_char(week_start, 'YYYY-MM-DD') and to_char(week_start + 6, 'YYYY-MM-DD')
          and jsonb_typeof(d.value -> 'correct') = 'number'
      ), 0) as score
    from public.profiles p
    left join public.user_progress u on u.user_id = p.id
    where week_start is not null and (select id from me) is not null
  ),
  board as (
    select s.*, rank() over (order by s.score desc) as rank
    from s
    where s.shown and s.score > 0
  )
  select b.rank, b.username, b.display_name, b.avatar_kana, b.belt, b.score, b.id = (select id from me), false
  from board b
  where b.rank <= 50 or b.id = (select id from me)
  union all
  -- you always see your own line, even when you're hidden or haven't played this week
  select null, s.username, s.display_name, s.avatar_kana, s.belt, s.score, true, not s.shown
  from s
  where s.id = (select id from me) and not exists (select 1 from board where board.id = s.id)
  order by 1 nulls last, 2;
$$;

revoke all on function public.weekly_leaderboard(date) from public, anon;
grant execute on function public.weekly_leaderboard(date) to authenticated;
