-- Member administration: no client-side direct writes, no invite or user discovery.
create function private.list_organization_members(p_org uuid)
returns table(user_id uuid, email text, role text, status text, joined_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.organization_members m where m.organization_id=p_org
      and m.user_id=auth.uid() and m.role='admin' and m.status='active'
  ) then raise exception 'not authorized' using errcode='42501'; end if;
  return query select m.user_id, u.email::text, m.role, m.status, m.created_at
    from public.organization_members m join auth.users u on u.id=m.user_id
    where m.organization_id=p_org order by m.created_at, m.user_id;
end $$;
revoke all on function private.list_organization_members(uuid) from public, anon;
grant execute on function private.list_organization_members(uuid) to authenticated;
create function public.list_organization_members(p_org uuid)
returns table(user_id uuid, email text, role text, status text, joined_at timestamptz)
language sql security invoker set search_path = '' as $$ select * from private.list_organization_members(p_org); $$;
revoke all on function public.list_organization_members(uuid) from public, anon;
grant execute on function public.list_organization_members(uuid) to authenticated;

create function private.set_organization_member(p_org uuid, p_user uuid, p_role text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); old_role text; old_status text; active_admins bigint;
begin
  if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
  if p_role is null or p_role not in ('admin','ip_manager','analyst','licensing_manager','viewer')
     or p_status is null or p_status not in ('active','inactive') then
    raise exception 'invalid member state' using errcode='22023';
  end if;
  -- Serialize all membership changes within an organization; protects last-admin invariant.
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
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id)
    values (p_org,actor,'organization.member.updated',p_user);
end $$;
revoke all on function private.set_organization_member(uuid,uuid,text,text) from public, anon;
grant execute on function private.set_organization_member(uuid,uuid,text,text) to authenticated;
create function public.set_organization_member(p_org uuid,p_user uuid,p_role text,p_status text)
returns void language sql security invoker set search_path = '' as $$ select private.set_organization_member(p_org,p_user,p_role,p_status); $$;
revoke all on function public.set_organization_member(uuid,uuid,text,text) from public, anon;
grant execute on function public.set_organization_member(uuid,uuid,text,text) to authenticated;
