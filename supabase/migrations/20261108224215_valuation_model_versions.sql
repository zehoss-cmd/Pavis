-- Immutable organization model versions; legacy assessments retain equal weights.
create table public.valuation_models (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 name text not null check(name=btrim(name) and char_length(name) between 1 and 80),
 version text not null check(version=btrim(version) and char_length(version) between 1 and 40),
 description text check(description is null or (description=btrim(description) and char_length(description) between 1 and 1000)),
 legal_weight integer not null check(legal_weight between 0 and 100),
 technical_weight integer not null check(technical_weight between 0 and 100),
 market_weight integer not null check(market_weight between 0 and 100),
 commercial_weight integer not null check(commercial_weight between 0 and 100),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 check(legal_weight+technical_weight+market_weight+commercial_weight=100),
 unique(organization_id,id), unique(organization_id,name,version)
);
create index valuation_models_org_created on public.valuation_models(organization_id,created_at desc,id desc);
alter table public.valuation_models enable row level security;
revoke all on public.valuation_models from public,anon,authenticated;
grant select on public.valuation_models to authenticated;
grant insert(organization_id,name,version,description,legal_weight,technical_weight,market_weight,commercial_weight) on public.valuation_models to authenticated;
create policy valuation_model_read on public.valuation_models for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=valuation_models.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy valuation_model_insert on public.valuation_models for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=valuation_models.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create function private.valuation_model_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 new.created_by:=coalesce(new.created_by,auth.uid());
 return new;
end $$;
revoke all on function private.valuation_model_created() from public,anon,authenticated;
create trigger valuation_model_created before insert on public.valuation_models for each row execute function private.valuation_model_created();
create function private.valuation_model_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(new.organization_id,auth.uid(),'valuation.model.created',new.id);
 return new;
end $$;
revoke all on function private.valuation_model_audit() from public,anon,authenticated;
create trigger valuation_model_audit after insert on public.valuation_models for each row execute function private.valuation_model_audit();
alter table public.valuation_assessments
 add column model_id uuid,
 add column legal_weight integer not null default 25 check(legal_weight between 0 and 100),
 add column technical_weight integer not null default 25 check(technical_weight between 0 and 100),
 add column market_weight integer not null default 25 check(market_weight between 0 and 100),
 add column commercial_weight integer not null default 25 check(commercial_weight between 0 and 100),
 add column weighted_score numeric(3,2) generated always as ((legal_score*legal_weight+technical_score*technical_weight+market_score*market_weight+commercial_score*commercial_weight)::numeric/100) stored,
 add constraint valuation_weight_total check(legal_weight+technical_weight+market_weight+commercial_weight=100),
 add constraint valuation_model_tenant_fk foreign key(organization_id,model_id) references public.valuation_models(organization_id,id) on delete restrict;
create index valuation_assessments_model on public.valuation_assessments(organization_id,model_id) where model_id is not null;
grant insert(model_id) on public.valuation_assessments to authenticated;
create or replace function private.valuation_guard() returns trigger language plpgsql set search_path='' as $$
declare model public.valuation_models%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.status <> 'draft' then raise exception 'initial status must be draft'; end if;
  new.created_by:=coalesce(new.created_by,auth.uid());
  if new.model_id is not null then
   select * into model from public.valuation_models where organization_id=new.organization_id and id=new.model_id;
   if not found then raise exception 'model unavailable' using errcode='23503'; end if;
   new.legal_weight:=model.legal_weight;new.technical_weight:=model.technical_weight;new.market_weight:=model.market_weight;new.commercial_weight:=model.commercial_weight;
  else
   new.legal_weight:=25;new.technical_weight:=25;new.market_weight:=25;new.commercial_weight:=25;
  end if;
 elsif old.status='final' then raise exception 'finalized assessment is immutable' using errcode='42501';
 elsif tg_op='UPDATE' then
  new.updated_at:=now();
  if new.status='final' then new.finalized_at:=now();new.finalized_by:=auth.uid(); end if;
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
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
  insert into public.valuation_assessments(id,organization_id,asset_id,model_id,assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note,created_by,created_at) values(v.id,v.organization_id,v.asset_id,v.model_id,v.assessment_date,v.legal_score,v.technical_score,v.market_score,v.commercial_score,v.legal_note,v.technical_note,v.market_note,v.commercial_note,v.created_by,v.created_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;

-- Preserve unused models when an otherwise empty organization is deleted and restored.
alter table private.organization_recycle_bin add column models_snapshot jsonb not null default '[]'::jsonb;
create or replace function private.delete_empty_organization(p_org uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); org public.organizations%rowtype; member public.organization_members%rowtype; logs jsonb; models jsonb;
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
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) into models from public.valuation_models m where m.organization_id=p_org;
 insert into private.organization_recycle_bin(organization_id,deleted_by,organization_snapshot,membership_snapshot,audit_snapshot,models_snapshot) values(p_org,actor,to_jsonb(org),to_jsonb(member),logs,models);
 delete from public.valuation_models where organization_id=p_org;
 delete from public.audit_logs where organization_id=p_org;
 delete from public.organization_members where organization_id=p_org;
 delete from public.organizations where id=p_org;
end $$;
create or replace function private.restore_deleted_organization(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
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
 insert into public.valuation_models(id,organization_id,name,version,description,legal_weight,technical_weight,market_weight,commercial_weight,created_by,created_at) select m.id,m.organization_id,m.name,m.version,m.description,m.legal_weight,m.technical_weight,m.market_weight,m.commercial_weight,m.created_by,m.created_at from jsonb_populate_recordset(null::public.valuation_models,r.models_snapshot) m;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org.id,auth.uid(),'organization.restored',org.id);
 delete from private.organization_recycle_bin where id=r.id;
end $$;
