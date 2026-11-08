-- Royalty DCF v1: year-end discounting, no terminal value or tax-loss carryforward.
create table public.royalty_dcf_assessments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 asset_id uuid not null, valuation_date date not null, scenario text not null check(scenario in ('conservative','base','optimistic')),
 currency text not null check(currency in ('KRW','USD','EUR','JPY')), years integer not null check(years between 1 and 20),
 base_sales numeric(15,2) not null check(base_sales between 0 and 1000000000000), growth_rate numeric(5,2) not null check(growth_rate between -100 and 100),
 royalty_rate numeric(5,2) not null check(royalty_rate between 0 and 100), contribution_rate numeric(5,2) not null check(contribution_rate between 0 and 100),
 annual_cost numeric(15,2) not null check(annual_cost between 0 and 1000000000000), tax_rate numeric(5,2) not null check(tax_rate between 0 and 100),
 discount_rate numeric(5,2) not null check(discount_rate between 0 and 100),
 assumptions text check(assumptions is null or (assumptions=btrim(assumptions) and char_length(assumptions) between 1 and 2000)),
 model_version text not null default 'royalty-dcf-v1' check(model_version='royalty-dcf-v1'),
 result numeric(40,2) not null, result_text text not null,
 status text not null default 'draft' check(status in ('draft','final')),
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 finalized_at timestamptz, finalized_by uuid references auth.users(id) on delete restrict,
 unique(organization_id,id), foreign key(organization_id,asset_id) references public.patent_assets(organization_id,id) on delete restrict,
 check((status='draft' and finalized_at is null and finalized_by is null) or (status='final' and finalized_at is not null and finalized_by is not null and assumptions is not null))
);
create index royalty_dcf_org_asset on public.royalty_dcf_assessments(organization_id,asset_id,valuation_date desc,id desc);
alter table public.royalty_dcf_assessments enable row level security;
revoke all on public.royalty_dcf_assessments from public,anon,authenticated;
grant select,delete on public.royalty_dcf_assessments to authenticated;
grant insert(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions) on public.royalty_dcf_assessments to authenticated;
grant update(valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,status) on public.royalty_dcf_assessments to authenticated;
create policy dcf_read on public.royalty_dcf_assessments for select to authenticated using(exists(select 1 from public.organization_members m where m.organization_id=royalty_dcf_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy dcf_insert on public.royalty_dcf_assessments for insert to authenticated with check(exists(select 1 from public.organization_members m where m.organization_id=royalty_dcf_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy dcf_update on public.royalty_dcf_assessments for update to authenticated using(exists(select 1 from public.organization_members m where m.organization_id=royalty_dcf_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check(exists(select 1 from public.organization_members m where m.organization_id=royalty_dcf_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy dcf_delete on public.royalty_dcf_assessments for delete to authenticated using(exists(select 1 from public.organization_members m where m.organization_id=royalty_dcf_assessments.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create function private.royalty_dcf_guard() returns trigger language plpgsql set search_path='' as $$
declare i integer; revenue numeric; income numeric; total numeric:=0;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then if old.status='final' then raise exception 'finalized assessment is immutable' using errcode='42501'; end if; return old; end if;
 if tg_op='INSERT' then
  if new.status<>'draft' then raise exception 'initial status must be draft'; end if;
  new.created_by:=coalesce(new.created_by,auth.uid());
 else
  if old.status='final' then raise exception 'finalized assessment is immutable' using errcode='42501'; end if;
  new.updated_at:=now(); if new.status='final' then new.finalized_at:=now();new.finalized_by:=auth.uid(); end if;
 end if;
 -- Guard before exponentiation, including direct API requests; constraints recheck after calculation.
 if new.years not between 1 and 20 or new.growth_rate not between -100 and 100 or new.discount_rate not between 0 and 100 then raise exception 'invalid assumptions' using errcode='23514'; end if;
 for i in 1..new.years loop
  revenue:=new.base_sales*power(1+new.growth_rate/100,i-1);
  income:=revenue*new.royalty_rate/100*new.contribution_rate/100-new.annual_cost;
  total:=total+(income-greatest(income,0)*new.tax_rate/100)/power(1+new.discount_rate/100,i);
 end loop;
 new.result:=round(total,2);new.result_text:=new.result::text;
 return new;
end $$;
revoke all on function private.royalty_dcf_guard() from public,anon,authenticated;
create trigger royalty_dcf_guard before insert or update or delete on public.royalty_dcf_assessments for each row execute function private.royalty_dcf_guard();
alter table private.registry_recycle_bin drop constraint registry_recycle_bin_kind_check;
alter table private.registry_recycle_bin add constraint registry_recycle_bin_kind_check check(kind in ('asset','family','portfolio','legal_event','valuation','royalty_dcf'));
create function private.royalty_dcf_archive() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,'royalty_dcf',old.id,to_jsonb(old)||jsonb_build_object('_asset_title',(select a.title from public.patent_assets a where a.organization_id=old.organization_id and a.id=old.asset_id),'assessment_date',old.valuation_date),auth.uid());return old;
end $$;
revoke all on function private.royalty_dcf_archive() from public,anon,authenticated;
create trigger royalty_dcf_z_archive before delete on public.royalty_dcf_assessments for each row execute function private.royalty_dcf_archive();
create function private.royalty_dcf_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; target uuid; act text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then org:=old.organization_id;target:=old.id;act:='valuation.dcf.deleted';
 elsif tg_op='INSERT' then org:=new.organization_id;target:=new.id;act:='valuation.dcf.created';
 else org:=new.organization_id;target:=new.id;act:=case when new.status='final' then 'valuation.dcf.finalized' else 'valuation.dcf.updated' end; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org,auth.uid(),act,target);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.royalty_dcf_audit() from public,anon,authenticated;
create trigger royalty_dcf_audit after insert or update or delete on public.royalty_dcf_assessments for each row execute function private.royalty_dcf_audit();
create or replace function private.registry_recycle_restore(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.registry_recycle_bin%rowtype; a public.patent_assets%rowtype; f public.patent_families%rowtype; p public.patent_portfolios%rowtype; e public.patent_legal_events%rowtype; v public.valuation_assessments%rowtype; d public.royalty_dcf_assessments%rowtype;
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
 elsif r.kind='royalty_dcf' then
  d:=jsonb_populate_record(null::public.royalty_dcf_assessments,r.snapshot);
  insert into public.royalty_dcf_assessments(id,organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,created_by,created_at) values(d.id,d.organization_id,d.asset_id,d.valuation_date,d.scenario,d.currency,d.years,d.base_sales,d.growth_rate,d.royalty_rate,d.contribution_rate,d.annual_cost,d.tax_rate,d.discount_rate,d.assumptions,d.created_by,d.created_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;

