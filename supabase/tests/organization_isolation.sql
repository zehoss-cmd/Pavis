-- Run in a disposable database with psql -v ON_ERROR_STOP=1. All test data is rolled back.
begin;
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pavis-test-a@example.invalid','',now(),now()),
('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pavis-test-b@example.invalid','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.create_organization('Test A');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select public.create_organization('Test B');
do $$ declare n int; begin
select count(*) into n from public.organizations; if n <> 1 then raise exception 'organization isolation failed %',n; end if;
select count(*) into n from public.organization_members; if n <> 1 then raise exception 'membership isolation failed %',n; end if;
select count(*) into n from public.audit_logs; if n <> 1 then raise exception 'audit isolation failed %',n; end if;
begin insert into public.organization_members(organization_id,user_id,role) values (gen_random_uuid(),auth.uid(),'admin'); raise exception 'unauthorized membership insert succeeded'; exception when insufficient_privilege then null; end;
begin update public.organizations set name='tampered'; raise exception 'unauthorized update succeeded'; exception when insufficient_privilege then null; end;
end $$;
rollback;
