\set ON_ERROR_STOP on
-- run after 00 (stub), 0001, 0002 on a fresh database
insert into auth.users values ('a0000000-0000-0000-0000-000000000001','a@x.co','{"username":"alpha"}');
insert into auth.users values ('b0000000-0000-0000-0000-000000000002','b@x.co','{"username":"bravo"}');
insert into auth.users values ('c0000000-0000-0000-0000-000000000003','c@x.co','{"username":"charlie"}');
insert into auth.users values ('d0000000-0000-0000-0000-000000000004','d@x.co','{"username":"delta"}');
-- week of mon 2026-10-26 to sun 2026-11-01
insert into public.user_progress (user_id, progress) values
  ('a0000000-0000-0000-0000-000000000001', '{"belt":3,"days":{"2026-10-26":{"correct":40},"2026-11-01":{"correct":10},"2026-10-25":{"correct":999}}}'),
  ('b0000000-0000-0000-0000-000000000002', '{"belt":"junk","days":{"2026-10-27":{"correct":"lots"},"2026-10-28":{"correct":30}}}'),
  ('c0000000-0000-0000-0000-000000000003', '{"belt":9,"days":{"2026-10-29":{"correct":99999999}}}'),
  ('d0000000-0000-0000-0000-000000000004', '{"days":[1,2,3]}');

set role authenticated; set request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000002';
select * from public.weekly_leaderboard('2026-10-26');
do $$ begin
  assert (select count(*) from public.weekly_leaderboard('2026-10-26')) = 3, 'zero-score delta left off';
  assert (select username from public.weekly_leaderboard('2026-10-26') where rank = 1) = 'charlie', 'charlie first';
  assert (select score from public.weekly_leaderboard('2026-10-26') where username = 'charlie') = 5000, 'silly day capped';
  assert (select score from public.weekly_leaderboard('2026-10-26') where username = 'alpha') = 50, 'only this week counts';
  assert (select score from public.weekly_leaderboard('2026-10-26') where username = 'bravo') = 30, 'junk numbers skipped';
  assert (select belt from public.weekly_leaderboard('2026-10-26') where username = 'bravo') = 0, 'junk belt is 0';
  assert (select is_me from public.weekly_leaderboard('2026-10-26') where username = 'bravo'), 'marks me';
  assert (select count(*) from public.profiles) = 1, 'still only see own profile directly';
  assert (select count(*) from public.user_progress) = 1, 'still only see own progress directly';
end $$;

-- hiding
update public.profiles set show_on_leaderboard = false where id = auth.uid();
do $$ begin
  assert (select hidden from public.weekly_leaderboard('2026-10-26') where username = 'bravo'), 'i still see myself, marked hidden';
  assert (select rank from public.weekly_leaderboard('2026-10-26') where username = 'bravo') is null, 'hidden me has no rank';
end $$;

-- someone else can't see a hidden player, and can't hide others
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
do $$ begin
  assert not exists (select 1 from public.weekly_leaderboard('2026-10-26') where username = 'bravo'), 'hidden player is gone for others';
  assert (select count(*) from public.weekly_leaderboard('2026-10-26')) = 2, 'two left';
end $$;
update public.profiles set show_on_leaderboard = false where id = 'c0000000-0000-0000-0000-000000000003';
reset role;
do $$ begin
  assert (select show_on_leaderboard from public.profiles where username = 'charlie'), 'could not hide someone else';
end $$;

-- delta has never played: sees themselves with no rank
set role authenticated; set request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000004';
do $$ begin
  assert (select score from public.weekly_leaderboard('2026-10-26') where is_me) = 0, 'zero for me';
  assert (select rank from public.weekly_leaderboard('2026-10-26') where is_me) is null, 'no rank yet';
end $$;
reset role;

-- logged out visitors get nothing
\set ON_ERROR_STOP off
set role anon; set request.jwt.claim.sub = '';
\echo expect error: anon calls the board
select * from public.weekly_leaderboard('2026-10-26');
reset role;
\echo leaderboard tests done
