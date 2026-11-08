-- Deleted registry records are retained privately for up to 30 days.
create table private.registry_recycle_bin (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 kind text not null check(kind in ('asset','family','portfolio')),
 record_id uuid not null,
 snapshot jsonb not null,
 deleted_by uuid not null references auth.users(id) on delete restrict,
 deleted_at timestamptz not null default now()
);
revoke all on private.registry_recycle_bin from public,anon,authenticated;
create index registry_recycle_org_deleted on private.registry_recycle_bin(organization_id,deleted_at desc,id desc);
create index registry_recycle_expiry on private.registry_recycle_bin(deleted_at);
-- Clients cannot write created_by; keep original creator when an authorized restore inserts it.
create or replace function private.registry_timestamps() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then if new.created_by is null then new.created_by:=auth.uid(); end if; else new.updated_at:=now(); end if;
 return new;
end $$;
create function private.registry_archive() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 k:=case tg_table_name when 'patent_assets' then 'asset' when 'patent_families' then 'family' when 'patent_portfolios' then 'portfolio' end;
 if k is null then raise exception 'unsupported record'; end if;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,k,old.id,to_jsonb(old),auth.uid());
 return old;
end $$;
revoke all on function private.registry_archive() from public,anon,authenticated;
create trigger assets_archive before delete on public.patent_assets for each row execute function private.registry_archive();
create trigger families_archive before delete on public.patent_families for each row execute function private.registry_archive();
create trigger portfolios_archive before delete on public.patent_portfolios for each row execute function private.registry_archive();
create function public.registry_recycle_list(p_org uuid) returns table(id uuid,kind text,record_id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.status='active' and m.role in ('admin','ip_manager')) then raise exception 'not authorized' using errcode='42501'; end if;
 return query select r.id,r.kind,r.record_id,coalesce(r.snapshot->>'title',r.snapshot->>'name'),r.deleted_at,r.deleted_at+interval '30 days' from private.registry_recycle_bin r where r.organization_id=p_org and r.deleted_at>now()-interval '30 days' order by r.deleted_at desc,r.id desc limit 200;
end $$;
revoke all on function public.registry_recycle_list(uuid) from public,anon;
grant execute on function public.registry_recycle_list(uuid) to authenticated;
create function public.registry_recycle_restore(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.registry_recycle_bin%rowtype; a public.patent_assets%rowtype; f public.patent_families%rowtype; p public.patent_portfolios%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.status='active' and m.role in ('admin','ip_manager')) then raise exception 'not authorized' using errcode='42501'; end if;
 select * into r from private.registry_recycle_bin b where b.organization_id=p_org and b.id=p_id and b.deleted_at>now()-interval '30 days' for update;
 if not found then raise exception 'record unavailable' using errcode='P0002'; end if;
 if r.kind='asset' then
  a:=jsonb_populate_record(null::public.patent_assets,r.snapshot);
  insert into public.patent_assets(id,organization_id,family_id,title,jurisdiction,application_number,filing_date,priority_date,legal_status,source,verified_date,created_by,created_at,updated_at,publication_number,registration_number,rights_holder,inventors) values(a.id,a.organization_id,a.family_id,a.title,a.jurisdiction,a.application_number,a.filing_date,a.priority_date,a.legal_status,a.source,a.verified_date,a.created_by,a.created_at,a.updated_at,a.publication_number,a.registration_number,a.rights_holder,a.inventors);
 elsif r.kind='family' then
  f:=jsonb_populate_record(null::public.patent_families,r.snapshot);
  insert into public.patent_families(id,organization_id,name,created_by,created_at,updated_at) values(f.id,f.organization_id,f.name,f.created_by,f.created_at,f.updated_at);
 else
  p:=jsonb_populate_record(null::public.patent_portfolios,r.snapshot);
  insert into public.patent_portfolios(id,organization_id,name,description,created_by,created_at,updated_at) values(p.id,p.organization_id,p.name,p.description,p.created_by,p.created_at,p.updated_at);
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;
revoke all on function public.registry_recycle_restore(uuid,uuid) from public,anon;
grant execute on function public.registry_recycle_restore(uuid,uuid) to authenticated;
create extension if not exists pg_cron;
select cron.schedule('pavis-registry-recycle-purge','17 18 * * *',$job$delete from private.registry_recycle_bin where deleted_at<=now()-interval '30 days'$job$);
