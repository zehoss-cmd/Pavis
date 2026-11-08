-- The current organization permissions only; future business roles are intentionally excluded.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
select ('50000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
       'role-matrix-' || n::text || '@example.invalid','',now(),now()
from generate_series(1,6) n;
insert into public.organizations(id,name) values('51000000-0000-4000-8000-000000000001','Role matrix test');
insert into public.organization_members(organization_id,user_id,role,status) values
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','admin','active'),
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','ip_manager','active'),
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000003','analyst','active'),
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','licensing_manager','active'),
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000005','viewer','active'),
('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000006','admin','inactive');
insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','organization.created','51000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$ declare n integer; seen integer; actor uuid; begin
  for n in 1..6 loop
    actor := ('50000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid;
    perform set_config('request.jwt.claim.sub',actor::text,true);
    select count(*) into seen from public.organizations where id='51000000-0000-4000-8000-000000000001';
    if seen <> (case when n=6 then 0 else 1 end) then raise exception 'organization read denied or leaked for role %',n; end if;
    select count(*) into seen from public.audit_logs where organization_id='51000000-0000-4000-8000-000000000001';
    if seen <> (case when n=1 then 1 else 0 end) then raise exception 'audit policy mismatch for role %',n; end if;
    if n=1 then
      perform * from public.list_organization_members('51000000-0000-4000-8000-000000000001');
      perform * from public.list_organization_invitations('51000000-0000-4000-8000-000000000001');
    else
      begin
        perform * from public.list_organization_members('51000000-0000-4000-8000-000000000001');
        raise exception 'non-admin membership list allowed for role %',n;
      exception when insufficient_privilege then null; end;
      begin
        perform * from public.list_organization_invitations('51000000-0000-4000-8000-000000000001');
        raise exception 'non-admin invitation list allowed for role %',n;
      exception when insufficient_privilege then null; end;
      begin
        perform public.create_organization_invitation('51000000-0000-4000-8000-000000000001','role-matrix-target@example.invalid','viewer');
        raise exception 'non-admin invitation creation allowed for role %',n;
      exception when insufficient_privilege then null; end;
    end if;
  end loop;
end $$;
rollback;
