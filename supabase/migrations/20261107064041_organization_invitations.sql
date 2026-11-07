-- Invitations are accepted in-app by an authenticated user with the same verified email.
-- No email is sent by this migration. Direct table access is denied.
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  role text not null check (role in ('ip_manager','analyst','licensing_manager','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);
create unique index organization_invites_pending_unique on public.organization_invitations(organization_id,email) where status='pending';
create index organization_invites_recipient on public.organization_invitations(email,expires_at) where status='pending';
alter table public.organization_invitations enable row level security;
revoke all on public.organization_invitations from anon,authenticated;

create function private.create_organization_invitation(p_org uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); clean_email text:=lower(btrim(p_email)); invite_id uuid;
begin
  if actor is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.role='admin' and m.status='active') then raise exception 'not authorized' using errcode='42501'; end if;
  if clean_email is null or length(clean_email) not between 3 and 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or p_role is null or p_role not in ('ip_manager','analyst','licensing_manager','viewer') then raise exception 'invalid invitation' using errcode='22023'; end if;
  perform 1 from public.organizations where id=p_org for update;
  -- Recheck after acquiring the lock so concurrent deactivation cannot authorize a stale admin.
  if not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.role='admin' and m.status='active') then raise exception 'not authorized' using errcode='42501'; end if;
  update public.organization_invitations set status='expired' where organization_id=p_org and status='pending' and expires_at <= now();
  if (select count(*) from public.organization_invitations where organization_id=p_org and status='pending') >= 20 then raise exception 'pending invitation limit reached' using errcode='23514'; end if;
  insert into public.organization_invitations(organization_id,email,role,invited_by) values(p_org,clean_email,p_role,actor) returning id into invite_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,actor,'organization.invitation.created',invite_id);
  return invite_id;
end $$;
revoke all on function private.create_organization_invitation(uuid,text,text) from public,anon;
grant execute on function private.create_organization_invitation(uuid,text,text) to authenticated;
create function public.create_organization_invitation(p_org uuid,p_email text,p_role text) returns uuid language sql security invoker set search_path='' as $$ select private.create_organization_invitation(p_org,p_email,p_role); $$;
revoke all on function public.create_organization_invitation(uuid,text,text) from public,anon;
grant execute on function public.create_organization_invitation(uuid,text,text) to authenticated;

create function private.list_organization_invitations(p_org uuid) returns table(id uuid,email text,role text,status text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.role='admin' and m.status='active') then raise exception 'not authorized' using errcode='42501'; end if;
 return query select i.id,i.email,i.role,case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at from public.organization_invitations i where i.organization_id=p_org order by i.created_at desc limit 100;
end $$;
revoke all on function private.list_organization_invitations(uuid) from public,anon;
grant execute on function private.list_organization_invitations(uuid) to authenticated;
create function public.list_organization_invitations(p_org uuid) returns table(id uuid,email text,role text,status text,expires_at timestamptz) language sql security invoker set search_path='' as $$ select * from private.list_organization_invitations(p_org); $$;
revoke all on function public.list_organization_invitations(uuid) from public,anon;
grant execute on function public.list_organization_invitations(uuid) to authenticated;

create function private.my_organization_invitations() returns table(id uuid,organization_name text,role text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 if auth.uid() is null then raise exception 'not authorized' using errcode='42501'; end if;
 select lower(btrim(u.email)) into verified_email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.is_anonymous is not true;
 if verified_email is null then return; end if;
 return query select i.id,o.name,i.role,i.expires_at from public.organization_invitations i join public.organizations o on o.id=i.organization_id where i.email=verified_email and i.status='pending' and i.expires_at>now() order by i.created_at desc limit 100;
end $$;
revoke all on function private.my_organization_invitations() from public,anon;
grant execute on function private.my_organization_invitations() to authenticated;
create function public.my_organization_invitations() returns table(id uuid,organization_name text,role text,expires_at timestamptz) language sql security invoker set search_path='' as $$ select * from private.my_organization_invitations(); $$;
revoke all on function public.my_organization_invitations() from public,anon;
grant execute on function public.my_organization_invitations() to authenticated;

create function private.accept_organization_invitation(p_invite uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); verified_email text; invite public.organization_invitations%rowtype;
begin
 if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
 select lower(btrim(u.email)) into verified_email from auth.users u where u.id=actor and u.email_confirmed_at is not null and u.is_anonymous is not true;
 select * into invite from public.organization_invitations where id=p_invite;
 if not found or verified_email is null or invite.email<>verified_email or invite.status<>'pending' or invite.expires_at<=now() then raise exception 'invitation unavailable' using errcode='42501'; end if;
 perform 1 from public.organizations where id=invite.organization_id for update;
 select * into invite from public.organization_invitations where id=p_invite for update;
 if not found or invite.email<>verified_email or invite.status<>'pending' or invite.expires_at<=now() then raise exception 'invitation unavailable' using errcode='42501'; end if;
 insert into public.organization_members(organization_id,user_id,role) values(invite.organization_id,actor,invite.role) on conflict do nothing;
 if not found then raise exception 'invitation unavailable' using errcode='23505'; end if;
 update public.organization_invitations set status='accepted',accepted_by=actor,accepted_at=now() where id=invite.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(invite.organization_id,actor,'organization.invitation.accepted',invite.id);
 return invite.organization_id;
end $$;
revoke all on function private.accept_organization_invitation(uuid) from public,anon;
grant execute on function private.accept_organization_invitation(uuid) to authenticated;
create function public.accept_organization_invitation(p_invite uuid) returns uuid language sql security invoker set search_path='' as $$ select private.accept_organization_invitation(p_invite); $$;
revoke all on function public.accept_organization_invitation(uuid) from public,anon;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;

create function private.revoke_organization_invitation(p_org uuid,p_invite uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.role='admin' and m.status='active') then raise exception 'not authorized' using errcode='42501'; end if;
 update public.organization_invitations set status='revoked' where id=p_invite and organization_id=p_org and status='pending' and expires_at>now();
 if not found then raise exception 'invitation unavailable' using errcode='42501'; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,actor,'organization.invitation.revoked',p_invite);
end $$;
revoke all on function private.revoke_organization_invitation(uuid,uuid) from public,anon;
grant execute on function private.revoke_organization_invitation(uuid,uuid) to authenticated;
create function public.revoke_organization_invitation(p_org uuid,p_invite uuid) returns void language sql security invoker set search_path='' as $$ select private.revoke_organization_invitation(p_org,p_invite); $$;
revoke all on function public.revoke_organization_invitation(uuid,uuid) from public,anon;
grant execute on function public.revoke_organization_invitation(uuid,uuid) to authenticated;
