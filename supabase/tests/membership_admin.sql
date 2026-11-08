begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('20000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rbac-a@example.invalid','',now(),now()),
('20000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rbac-b@example.invalid','',now(),now()),
('20000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rbac-c@example.invalid','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select set_config('test.org',public.create_organization('RBAC A')::text,true);
reset role;
insert into public.organization_members(organization_id,user_id,role) values (current_setting('test.org')::uuid,'20000000-0000-4000-8000-000000000002','viewer');
set local role authenticated;
do $$ declare n int; begin
select count(*) into n from public.list_organization_members(current_setting('test.org')::uuid); if n<>2 then raise exception 'admin cannot list'; end if;
begin perform public.set_organization_member(current_setting('test.org')::uuid,auth.uid(),'viewer','active'); raise exception 'last admin demotion succeeded'; exception when check_violation then null; end;
perform public.set_organization_member(current_setting('test.org')::uuid,'20000000-0000-4000-8000-000000000002','analyst','active');
select count(*) into n from public.audit_logs where action='organization.member.updated'; if n<>1 then raise exception 'audit missing'; end if;
select count(*) into n from public.audit_logs where action='organization.member.updated' and previous_role='viewer' and new_role='analyst' and previous_status='active' and new_status='active'; if n<>1 then raise exception 'audit change details incorrect'; end if;
perform public.set_organization_member(current_setting('test.org')::uuid,'20000000-0000-4000-8000-000000000002','analyst','active');
select count(*) into n from public.audit_logs where action='organization.member.updated'; if n<>1 then raise exception 'no-op created audit record'; end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
do $$ begin
begin perform * from public.list_organization_members(current_setting('test.org')::uuid); raise exception 'nonadmin list succeeded'; exception when insufficient_privilege then null; end;
begin perform public.set_organization_member(current_setting('test.org')::uuid,auth.uid(),'admin','active'); raise exception 'escalation succeeded'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
do $$ begin
begin perform * from public.list_organization_members(current_setting('test.org')::uuid); raise exception 'cross tenant list succeeded'; exception when insufficient_privilege then null; end;
begin perform public.set_organization_member(current_setting('test.org')::uuid,'20000000-0000-4000-8000-000000000002','admin','active'); raise exception 'cross tenant update succeeded'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
do $$ declare n int; begin
perform public.set_organization_member(current_setting('test.org')::uuid,'20000000-0000-4000-8000-000000000002','analyst','inactive');
select count(*) into n from public.audit_logs where action='organization.member.updated' and previous_role='analyst' and new_role='analyst' and previous_status='active' and new_status='inactive'; if n<>1 then raise exception 'status audit details incorrect'; end if;
end $$;
set local role anon;
do $$ begin
begin perform * from public.list_organization_members(current_setting('test.org')::uuid); raise exception 'anonymous list succeeded'; exception when insufficient_privilege then null; end;
end $$;
rollback;
