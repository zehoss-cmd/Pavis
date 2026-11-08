-- Phase 1A: initial tenant-isolated registry. Deletion is intentionally unavailable.
create table public.patent_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check(char_length(btrim(name)) between 1 and 200 and name=btrim(name)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id)
);
create table public.patent_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  family_id uuid,
  title text not null check(char_length(btrim(title)) between 1 and 300 and title=btrim(title)),
  jurisdiction text not null check(jurisdiction ~ '^[A-Z]{2}$'),
  application_number text check(application_number is null or (length(btrim(application_number)) between 1 and 100 and application_number=btrim(application_number))),
  application_number_normalized text generated always as (upper(regexp_replace(application_number,'[[:space:]]','','g'))) stored,
  filing_date date,
  priority_date date,
  legal_status text not null default 'unknown' check(legal_status in ('unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked')),
  source text check(source is null or length(source)<=500),
  verified_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,id),
  foreign key(organization_id,family_id) references public.patent_families(organization_id,id) on delete restrict
);
create unique index patent_assets_application_unique on public.patent_assets(organization_id,jurisdiction,application_number_normalized) where application_number_normalized is not null;
create index patent_assets_org_created on public.patent_assets(organization_id,created_at desc,id desc);
create index patent_assets_org_family on public.patent_assets(organization_id,family_id);
create index patent_families_org_name on public.patent_families(organization_id,name,id);

alter table public.patent_families enable row level security;
alter table public.patent_assets enable row level security;
revoke all on public.patent_families, public.patent_assets from anon,authenticated;
grant select on public.patent_families, public.patent_assets to authenticated;
grant insert(organization_id,name) on public.patent_families to authenticated;
grant update(name) on public.patent_families to authenticated;
grant insert(organization_id,family_id,title,jurisdiction,application_number,filing_date,priority_date,legal_status,source,verified_date) on public.patent_assets to authenticated;
grant update(family_id,title,jurisdiction,application_number,filing_date,priority_date,legal_status,source,verified_date) on public.patent_assets to authenticated;
create policy family_read on public.patent_families for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_families.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy family_insert on public.patent_families for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=patent_families.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy family_update on public.patent_families for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_families.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=patent_families.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy asset_read on public.patent_assets for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy asset_insert on public.patent_assets for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=patent_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy asset_update on public.patent_assets for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=patent_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));

create function private.registry_timestamps() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then new.created_by:=auth.uid(); else new.updated_at:=now(); end if;
  return new;
end $$;
revoke all on function private.registry_timestamps() from public,anon,authenticated;
create trigger families_timestamps before insert or update on public.patent_families for each row execute function private.registry_timestamps();
create trigger assets_timestamps before insert or update on public.patent_assets for each row execute function private.registry_timestamps();
create function private.registry_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(new.organization_id,auth.uid(),case when tg_table_name='patent_families' then 'patent.family.' else 'patent.asset.' end || case when tg_op='INSERT' then 'created' else 'updated' end,new.id);
  return new;
end $$;
revoke all on function private.registry_audit() from public,anon,authenticated;
create trigger families_audit after insert or update on public.patent_families for each row execute function private.registry_audit();
create trigger assets_audit after insert or update on public.patent_assets for each row execute function private.registry_audit();
