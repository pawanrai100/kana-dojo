\set ON_ERROR_STOP off
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo expect error: insert row for someone else
insert into public.user_progress (user_id) values ('11111111-1111-1111-1111-111111111111');
\echo expect error: change own profile id
update public.profiles set id = '44444444-4444-4444-4444-444444444444' where id = auth.uid();
\echo expect error: delete progress
delete from public.user_progress;
\echo expect error: taken username
update public.profiles set username = 'pawan_dojo' where id = auth.uid();
\echo expect error: bad username
update public.profiles set username = 'No Spaces!' where id = auth.uid();
\echo expect error: progress not an object
insert into public.user_progress (user_id, progress) values (auth.uid(), '[1,2]');
reset role;
set role anon; set request.jwt.claim.sub = '';
\echo expect error: anon reads
select * from public.user_progress;
select * from public.profiles;
reset role;
\echo final state as superuser:
select p.username, p.avatar_kana, u.progress, u.rev from public.profiles p left join public.user_progress u on u.user_id = p.id order by p.id;
