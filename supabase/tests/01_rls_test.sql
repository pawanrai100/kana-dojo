\set ON_ERROR_STOP on
-- signup creates profiles
insert into auth.users values ('11111111-1111-1111-1111-111111111111','pawan@example.com','{"username":"Pawan_R"}');
insert into auth.users values ('22222222-2222-2222-2222-222222222222','pawan@other.com','{"username":"pawan_r"}');
insert into auth.users values ('33333333-3333-3333-3333-333333333333','a@b.co','{"full_name":"Google Person","avatar_url":"https://x/y.png"}');
select id, username, display_name, avatar_url from public.profiles order by id;
do $$ begin
  assert (select username from public.profiles where id='11111111-1111-1111-1111-111111111111') = 'pawan_r', 'lowercased chosen username';
  assert (select username from public.profiles where id='22222222-2222-2222-2222-222222222222') <> 'pawan_r', 'collision gets suffix';
  assert (select username from public.profiles where id='33333333-3333-3333-3333-333333333333') ~ '^[a-z0-9_]{3,20}$', 'short email still valid';
end $$;

-- user 1
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.user_progress (user_id, progress, settings) values (auth.uid(), '{"totalAnswered":10}', '{"theme":"dark"}');
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'sees only own profile';
  assert (select count(*) from public.user_progress) = 1, 'sees own progress';
end $$;
update public.user_progress set progress='{"totalAnswered":20}', rev = rev + 1 where user_id = auth.uid() and rev = 1;
do $$ begin assert (select rev from public.user_progress) = 2, 'rev bumped'; end $$;
-- stale rev update touches nothing (conflict detection)
update public.user_progress set progress='{"totalAnswered":99}', rev = 2 where user_id = auth.uid() and rev = 1;
do $$ begin assert (select progress->>'totalAnswered' from public.user_progress) = '20', 'stale write ignored'; end $$;
update public.profiles set username = 'pawan_dojo', avatar_kana = 'ね' where id = auth.uid();

-- user 2 attacks user 1
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin assert (select count(*) from public.user_progress) = 0, 'cannot read others progress'; end $$;
update public.user_progress set progress = '{}' where user_id = '11111111-1111-1111-1111-111111111111';
update public.profiles set username = 'hacked' where id = '11111111-1111-1111-1111-111111111111';
