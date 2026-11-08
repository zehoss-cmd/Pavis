-- Manual legal status history; source data is never treated as an official live feed.
create table public.patent_legal_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 asset_id uuid not null,
 event_date date not null,
 legal_status text not null check(legal_status in ('unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked')),
 source text check(source is null or (char_length(btrim(source)) between 1 and 500 and source=btrim(source))),
 verified_date date,
 note text check(note is null or (char_length(btrim(note)) between 1 and 1000 and note=btrim(note))),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(organization_id,asset_id) references public.patent_assets(organization_id,id) on delete restrict
);
create index patent_legal_events_org_asset_date on public.patent_legal_events(organization_id,asset_id,event_date desc,id desc);
alter table public.patent_legal_events enable row level security;
revoke all on public.patent_legal_events from public,anon,authenticated;
grant select, delete on public.patent_legal_events to authenticated;
grant insert(organization_id,asset_id,event_date,legal_status,source,verified_date,note) on public.patent_legal_events to authenticated;
grant update(event_date,legal_status,source,verified_date,note) on public.patent_legal_events to authenticated;
create policy legal_event_read on public.patent_legal_events for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_legal_events.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy legal_event_insert on public.patent_legal_events for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=patent_legal_events.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy legal_event_update on public.patent_legal_events for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_legal_events.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=patent_legal_events.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy legal_event_delete on public.patent_legal_events for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_legal_events.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create trigger legal_event_timestamps before insert or update on public.patent_legal_events for each row execute function private.registry_timestamps();
create function private.legal_event_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; target uuid; action_name text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then org:=old.organization_id; target:=old.id; action_name:='patent.legal_event.deleted';
 elsif tg_op='UPDATE' then org:=new.organization_id; target:=new.id; action_name:='patent.legal_event.updated';
 else org:=new.organization_id; target:=new.id; action_name:='patent.legal_event.created'; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org,auth.uid(),action_name,target);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.legal_event_audit() from public,anon,authenticated;
create trigger legal_event_audit after insert or update or delete on public.patent_legal_events for each row execute function private.legal_event_audit();
alter table private.registry_recycle_bin drop constraint registry_recycle_bin_kind_check;
alter table private.registry_recycle_bin add constraint registry_recycle_bin_kind_check check(kind in ('asset','family','portfolio','legal_event'));
create or replace function private.registry_archive() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 k:=case tg_table_name when 'patent_assets' then 'asset' when 'patent_families' then 'family' when 'patent_portfolios' then 'portfolio' when 'patent_legal_events' then 'legal_event' end;
 if k is null then raise exception 'unsupported record'; end if;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,k,old.id,to_jsonb(old),auth.uid());
 return old;
end $$;
create trigger legal_event_archive before delete on public.patent_legal_events for each row execute function private.registry_archive();
create or replace function private.registry_recycle_list(p_org uuid) returns table(id uuid,kind text,record_id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.status='active' and m.role in ('admin','ip_manager')) then raise exception 'not authorized' using errcode='42501'; end if;
 return query select r.id,r.kind,r.record_id,coalesce(r.snapshot->>'title',r.snapshot->>'name','법적 상태 이력 · '||(r.snapshot->>'event_date')),r.deleted_at,r.deleted_at+interval '30 days' from private.registry_recycle_bin r where r.organization_id=p_org and r.deleted_at>now()-interval '30 days' order by r.deleted_at desc,r.id desc limit 200;
end $$;
create or replace function private.registry_recycle_restore(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.registry_recycle_bin%rowtype; a public.patent_assets%rowtype; f public.patent_families%rowtype; p public.patent_portfolios%rowtype; e public.patent_legal_events%rowtype;
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
 elsif r.kind='portfolio' then
  p:=jsonb_populate_record(null::public.patent_portfolios,r.snapshot);
  insert into public.patent_portfolios(id,organization_id,name,description,created_by,created_at,updated_at) values(p.id,p.organization_id,p.name,p.description,p.created_by,p.created_at,p.updated_at);
 elsif r.kind='legal_event' then
  e:=jsonb_populate_record(null::public.patent_legal_events,r.snapshot);
  insert into public.patent_legal_events(id,organization_id,asset_id,event_date,legal_status,source,verified_date,note,created_by,created_at,updated_at) values(e.id,e.organization_id,e.asset_id,e.event_date,e.legal_status,e.source,e.verified_date,e.note,e.created_by,e.created_at,e.updated_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;
