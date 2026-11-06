-- Phase 0: restricted organization bootstrap and read access.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('admin','ip_manager','analyst','licensing_manager','viewer')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
create index organization_members_user_idx on public.organization_members (user_id, organization_id);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null,
  target_id uuid not null,
  occurred_at timestamptz not null default now()
);
create index audit_logs_org_time_idx on public.audit_logs (organization_id, occurred_at desc);
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.organizations, public.organization_members, public.audit_logs from anon, authenticated;
grant select on public.organizations, public.organization_members, public.audit_logs to authenticated;
create policy "members can see own active membership" on public.organization_members for select to authenticated using (user_id = (select auth.uid()) and status = 'active');
create policy "members can see own organizations" on public.organizations for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy "admins can see own audit logs" on public.audit_logs for select to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = audit_logs.organization_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role = 'admin'));

-- Privilege boundary: owner rights are needed solely to atomically insert the initial membership.
create function private.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); new_id uuid;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if org_name is null or char_length(btrim(org_name)) not between 1 and 120 then raise exception 'invalid organization name' using errcode = '22023'; end if;
  insert into public.organizations(name) values (btrim(org_name)) returning id into new_id;
  insert into public.organization_members(organization_id,user_id,role) values (new_id,current_user_id,'admin');
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values (new_id,current_user_id,'organization.created',new_id);
  return new_id;
end $$;
revoke all on function private.create_organization(text) from public, anon;
grant execute on function private.create_organization(text) to authenticated;
create function public.create_organization(org_name text) returns uuid
language sql security invoker set search_path = '' as $$ select private.create_organization(org_name); $$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
