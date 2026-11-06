begin;
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
('10000000-0000-4000-8000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pavis-isolation-a@example.invalid','',now(),now()),
('10000000-0000-4000-8000-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pavis-isolation-b@example.invalid','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
select public.create_organization('PAVIS test A');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
select public.create_organization('PAVIS test B');
do $$ declare n int; begin
select count(*) into n from public.organizations where name='PAVIS test A'; if n<>0 then raise exception 'cross tenant organization visible'; end if;
select count(*) into n from public.organizations where name='PAVIS test B'; if n<>1 then raise exception 'own organization missing'; end if;
begin delete from public.organizations; raise exception 'delete succeeded'; exception when insufficient_privilege then null; end;
begin insert into public.audit_logs(organization_id,action,target_id) values(gen_random_uuid(),'fake',gen_random_uuid()); raise exception 'audit spoof succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.organization_members set status='inactive' where user_id='10000000-0000-4000-8000-000000000012';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
do $$ declare n int; begin select count(*) into n from public.organizations; if n<>0 then raise exception 'inactive member retains access'; end if; select count(*) into n from public.audit_logs; if n<>0 then raise exception 'inactive admin retains audit access'; end if; end $$;
set local role anon;
do $$ begin
begin perform public.create_organization('anonymous'); raise exception 'anonymous create succeeded'; exception when insufficient_privilege then null; end;
begin perform * from public.organizations; raise exception 'anonymous read succeeded'; exception when insufficient_privilege then null; end;
end $$;
rollback;
