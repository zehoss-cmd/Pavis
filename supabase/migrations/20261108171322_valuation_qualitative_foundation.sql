-- Phase 2: provisional qualitative model. Scores are not monetary valuations.
create table public.valuation_assessments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 asset_id uuid not null, assessment_date date not null,
 model_version text not null default 'qualitative-v1' check(model_version='qualitative-v1'),
 legal_score integer not null check(legal_score between 0 and 5), technical_score integer not null check(technical_score between 0 and 5),
 market_score integer not null check(market_score between 0 and 5), commercial_score integer not null check(commercial_score between 0 and 5),
 score numeric(3,2) generated always as ((legal_score+technical_score+market_score+commercial_score)::numeric / 4) stored,
 legal_note text check(legal_note is null or char_length(btrim(legal_note)) between 1 and 1000),
 technical_note text check(technical_note is null or char_length(btrim(technical_note)) between 1 and 1000),
 market_note text check(market_note is null or char_length(btrim(market_note)) between 1 and 1000),
 commercial_note text check(commercial_note is null or char_length(btrim(commercial_note)) between 1 and 1000),
 status text not null default 'draft' check(status in ('draft','final')),
 finalized_at timestamptz, finalized_by uuid references auth.users(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id), foreign key(organization_id,asset_id) references public.patent_assets(organization_id,id) on delete restrict,
 check((status='draft' and finalized_at is null and finalized_by is null) or (status='final' and finalized_at is not null and finalized_by is not null and legal_note is not null and technical_note is not null and market_note is not null and commercial_note is not null))
);
create index valuation_org_asset on public.valuation_assessments(organization_id,asset_id,assessment_date desc,id desc);
alter table public.valuation_assessments enable row level security;
revoke all on public.valuation_assessments from public,anon,authenticated;
grant select,delete on public.valuation_assessments to authenticated;
grant insert(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note) on public.valuation_assessments to authenticated;
grant update(assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note,status) on public.valuation_assessments to authenticated;
create policy valuation_read on public.valuation_assessments for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=valuation_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy valuation_insert on public.valuation_assessments for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=valuation_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy valuation_update on public.valuation_assessments for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=valuation_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=valuation_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy valuation_delete on public.valuation_assessments for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=valuation_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create function private.valuation_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.status <> 'draft' then raise exception 'initial status must be draft'; end if;
  new.created_by:=coalesce(new.created_by,auth.uid());
 elsif old.status='final' then raise exception 'finalized assessment is immutable' using errcode='42501';
 elsif tg_op='UPDATE' then
  new.updated_at:=now();
  if new.status='final' then new.finalized_at:=now();new.finalized_by:=auth.uid(); end if;
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.valuation_guard() from public,anon,authenticated;
create trigger valuation_guard before insert or update or delete on public.valuation_assessments for each row execute function private.valuation_guard();
alter table private.registry_recycle_bin drop constraint registry_recycle_bin_kind_check;
alter table private.registry_recycle_bin add constraint registry_recycle_bin_kind_check check(kind in ('asset','family','portfolio','legal_event','valuation'));
create function private.valuation_archive() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,'valuation',old.id,to_jsonb(old)||jsonb_build_object('_asset_title',(select a.title from public.patent_assets a where a.organization_id=old.organization_id and a.id=old.asset_id)),auth.uid());
 return old;
end $$;
revoke all on function private.valuation_archive() from public,anon,authenticated;
create trigger valuation_z_archive before delete on public.valuation_assessments for each row execute function private.valuation_archive();
create function private.valuation_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; target uuid; act text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then org:=old.organization_id;target:=old.id;act:='valuation.deleted';
 elsif tg_op='INSERT' then org:=new.organization_id;target:=new.id;act:='valuation.created';
 else org:=new.organization_id;target:=new.id;act:=case when new.status='final' then 'valuation.finalized' else 'valuation.updated' end; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org,auth.uid(),act,target);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.valuation_audit() from public,anon,authenticated;
create trigger valuation_audit after insert or update or delete on public.valuation_assessments for each row execute function private.valuation_audit();
create or replace function private.registry_recycle_list(p_org uuid) returns table(id uuid,kind text,record_id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=auth.uid() and m.status='active' and m.role in ('admin','ip_manager')) then raise exception 'not authorized' using errcode='42501'; end if;
 return query select r.id,r.kind,r.record_id,coalesce(r.snapshot->>'title',r.snapshot->>'name',coalesce(r.snapshot->>'_asset_title','특허')||' · '||coalesce(r.snapshot->>'event_date',r.snapshot->>'assessment_date')),r.deleted_at,r.deleted_at+interval '30 days' from private.registry_recycle_bin r where r.organization_id=p_org and r.deleted_at>now()-interval '30 days' order by r.deleted_at desc,r.id desc limit 200;
end $$;
create or replace function private.registry_recycle_restore(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.registry_recycle_bin%rowtype; a public.patent_assets%rowtype; f public.patent_families%rowtype; p public.patent_portfolios%rowtype; e public.patent_legal_events%rowtype; v public.valuation_assessments%rowtype;
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
 elsif r.kind='valuation' then
  v:=jsonb_populate_record(null::public.valuation_assessments,r.snapshot);
  insert into public.valuation_assessments(id,organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note,created_by,created_at) values(v.id,v.organization_id,v.asset_id,v.assessment_date,v.legal_score,v.technical_score,v.market_score,v.commercial_score,v.legal_note,v.technical_note,v.market_note,v.commercial_note,v.created_by,v.created_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;
