-- Only a sole-admin organization without tenant data or invitations can be deleted.
-- The original organization, membership and audit rows remain recoverable for 30 days.
create table private.organization_recycle_bin (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null unique,
 deleted_by uuid not null references auth.users(id) on delete restrict,
 organization_snapshot jsonb not null,
 membership_snapshot jsonb not null,
 audit_snapshot jsonb not null,
 deleted_at timestamptz not null default now()
);
revoke all on private.organization_recycle_bin from public,anon,authenticated;
create index organization_recycle_bin_owner_date on private.organization_recycle_bin(deleted_by,deleted_at desc,id desc);
create index organization_recycle_bin_expiry on private.organization_recycle_bin(deleted_at);
create function private.delete_empty_organization(p_org uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); org public.organizations%rowtype; member public.organization_members%rowtype; logs jsonb;
begin
 if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
 select * into org from public.organizations where id=p_org for update;
 if not found then raise exception 'organization unavailable' using errcode='P0002'; end if;
 select * into member from public.organization_members where organization_id=p_org and user_id=actor and role='admin' and status='active';
 if not found then raise exception 'not authorized' using errcode='42501'; end if;
 if (select count(*) from public.organization_members where organization_id=p_org)<>1
    or exists(select 1 from public.organization_invitations where organization_id=p_org)
    or exists(select 1 from public.patent_assets where organization_id=p_org)
    or exists(select 1 from public.patent_families where organization_id=p_org)
    or exists(select 1 from public.patent_portfolios where organization_id=p_org)
    or exists(select 1 from public.patent_portfolio_assets where organization_id=p_org)
    or exists(select 1 from private.registry_recycle_bin where organization_id=p_org) then
   raise exception 'organization contains members or data' using errcode='P0001';
 end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,actor,'organization.deleted',p_org);
 select coalesce(jsonb_agg(to_jsonb(a) order by a.occurred_at,a.id),'[]'::jsonb) into logs from public.audit_logs a where a.organization_id=p_org;
 insert into private.organization_recycle_bin(organization_id,deleted_by,organization_snapshot,membership_snapshot,audit_snapshot) values(p_org,actor,to_jsonb(org),to_jsonb(member),logs);
 delete from public.audit_logs where organization_id=p_org;
 delete from public.organization_members where organization_id=p_org;
 delete from public.organizations where id=p_org;
end $$;
revoke all on function private.delete_empty_organization(uuid) from public,anon;
grant execute on function private.delete_empty_organization(uuid) to authenticated;
create function public.delete_empty_organization(p_org uuid) returns void language sql security invoker set search_path='' as $$ select private.delete_empty_organization(p_org); $$;
revoke all on function public.delete_empty_organization(uuid) from public,anon;
grant execute on function public.delete_empty_organization(uuid) to authenticated;
create function private.deleted_organizations() returns table(id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language sql security definer set search_path='' as $$
 select r.id,r.organization_snapshot->>'name',r.deleted_at,r.deleted_at+interval '30 days' from private.organization_recycle_bin r where r.deleted_by=auth.uid() and r.deleted_at>now()-interval '30 days' order by r.deleted_at desc,r.id desc limit 100;
$$;
revoke all on function private.deleted_organizations() from public,anon;
grant execute on function private.deleted_organizations() to authenticated;
create function public.deleted_organizations() returns table(id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language sql security invoker set search_path='' as $$ select * from private.deleted_organizations(); $$;
revoke all on function public.deleted_organizations() from public,anon;
grant execute on function public.deleted_organizations() to authenticated;
create function private.restore_deleted_organization(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.organization_recycle_bin%rowtype; org public.organizations%rowtype; member public.organization_members%rowtype;
begin
 if auth.uid() is null then raise exception 'not authorized' using errcode='42501'; end if;
 select * into r from private.organization_recycle_bin where id=p_id and deleted_by=auth.uid() and deleted_at>now()-interval '30 days' for update;
 if not found then raise exception 'organization unavailable' using errcode='P0002'; end if;
 org:=jsonb_populate_record(null::public.organizations,r.organization_snapshot);
 member:=jsonb_populate_record(null::public.organization_members,r.membership_snapshot);
 insert into public.organizations(id,name,created_at) values(org.id,org.name,org.created_at);
 insert into public.organization_members(organization_id,user_id,role,status,created_at) values(member.organization_id,member.user_id,member.role,member.status,member.created_at);
 insert into public.audit_logs(id,organization_id,actor_user_id,action,target_id,occurred_at,previous_role,new_role,previous_status,new_status)
 select a.id,a.organization_id,a.actor_user_id,a.action,a.target_id,a.occurred_at,a.previous_role,a.new_role,a.previous_status,a.new_status from jsonb_populate_recordset(null::public.audit_logs,r.audit_snapshot) a;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org.id,auth.uid(),'organization.restored',org.id);
 delete from private.organization_recycle_bin where id=r.id;
end $$;
revoke all on function private.restore_deleted_organization(uuid) from public,anon;
grant execute on function private.restore_deleted_organization(uuid) to authenticated;
create function public.restore_deleted_organization(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.restore_deleted_organization(p_id); $$;
revoke all on function public.restore_deleted_organization(uuid) from public,anon;
grant execute on function public.restore_deleted_organization(uuid) to authenticated;
select cron.schedule('pavis-organization-recycle-purge','27 18 * * *',$job$delete from private.organization_recycle_bin where deleted_at<=now()-interval '30 days'$job$);
