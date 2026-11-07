begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('30000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-a@example.invalid','',now(),now()),
('30000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-b@example.invalid','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
insert into public.profiles(user_id,display_name) values (auth.uid(),'사용자 A');
update public.profiles set display_name='사용자 A 수정' where user_id=auth.uid();
do $$ declare n int; begin
select count(*) into n from public.profiles where display_name='사용자 A 수정'; if n<>1 then raise exception 'owner update failed'; end if;
begin insert into public.profiles(user_id,display_name) values ('30000000-0000-4000-8000-000000000002','tampered'); raise exception 'cross user insert succeeded'; exception when insufficient_privilege then null; end;
begin update public.profiles set user_id='30000000-0000-4000-8000-000000000002'; raise exception 'owner reassignment succeeded'; exception when insufficient_privilege then null; end;
begin insert into public.profiles(user_id,display_name) values (auth.uid(),'  '); raise exception 'blank accepted'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
select count(*) into n from public.profiles; if n<>0 then raise exception 'another profile exposed'; end if;
update public.profiles set display_name='tampered' where user_id='30000000-0000-4000-8000-000000000001'; get diagnostics n = row_count; if n<>0 then raise exception 'cross user update succeeded'; end if;
end $$;
insert into public.profiles(user_id,display_name) values(auth.uid(),'사용자 B');
set local role anon;
do $$ begin
begin perform * from public.profiles; raise exception 'anonymous read succeeded'; exception when insufficient_privilege then null; end;
end $$;
rollback;
