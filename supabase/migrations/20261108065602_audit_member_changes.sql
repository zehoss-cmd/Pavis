-- Preserve legacy rows as NULL. Record only role and membership state, never credentials.
alter table public.audit_logs
  add column previous_role text,
  add column new_role text,
  add column previous_status text,
  add column new_status text;
alter table public.audit_logs add constraint audit_member_change_details_valid check (
  (previous_role is null and new_role is null and previous_status is null and new_status is null)
  or (
    action = 'organization.member.updated'
    and previous_role is not null and previous_role in ('admin','ip_manager','analyst','licensing_manager','viewer')
    and new_role is not null and new_role in ('admin','ip_manager','analyst','licensing_manager','viewer')
    and previous_status is not null and previous_status in ('active','inactive')
    and new_status is not null and new_status in ('active','inactive')
  )
);

create or replace function private.set_organization_member(p_org uuid, p_user uuid, p_role text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); old_role text; old_status text; active_admins bigint;
begin
  if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
  if p_role is null or p_role not in ('admin','ip_manager','analyst','licensing_manager','viewer')
     or p_status is null or p_status not in ('active','inactive') then
    raise exception 'invalid member state' using errcode='22023';
  end if;
  perform 1 from public.organizations where id=p_org for update;
  if not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.role='admin' and m.status='active') then
    raise exception 'not authorized' using errcode='42501';
  end if;
  select m.role,m.status into old_role,old_status from public.organization_members m where m.organization_id=p_org and m.user_id=p_user for update;
  if not found then raise exception 'member not found' using errcode='P0002'; end if;
  if old_role='admin' and old_status='active' and (p_role<>'admin' or p_status<>'active') then
    select count(*) into active_admins from public.organization_members m where m.organization_id=p_org and m.role='admin' and m.status='active';
    if active_admins <= 1 then raise exception 'at least one active admin required' using errcode='23514'; end if;
  end if;
  if old_role=p_role and old_status=p_status then return; end if;
  update public.organization_members set role=p_role,status=p_status where organization_id=p_org and user_id=p_user;
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id,previous_role,new_role,previous_status,new_status)
    values (p_org,actor,'organization.member.updated',p_user,old_role,p_role,old_status,p_status);
end $$;
