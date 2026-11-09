-- New copies preserve an immutable snapshot, even if the source is later changed or deleted.
-- Historic copies cannot be reconstructed and remain without a source.
alter table public.royalty_dcf_assessments
 add column copied_from_id uuid,
 add column copied_from_snapshot jsonb,
 add constraint dcf_copy_snapshot_pair check ((copied_from_id is null and copied_from_snapshot is null) or (copied_from_id is not null and copied_from_snapshot is not null and jsonb_typeof(copied_from_snapshot)='object'));

-- A private definer is needed solely to populate protected provenance columns. The caller's
-- current membership is locked and checked before any privileged access, and the source is
-- scoped to the same organization. The public wrapper remains security invoker.
create function private.copy_dcf_with_provenance(p_org uuid,p_source uuid,p_scenario text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare result_id uuid; actor uuid:=auth.uid();
begin
 if actor is null or p_scenario not in ('conservative','base','optimistic') then return null; end if;
 perform 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.status='active' and m.role in ('admin','ip_manager') for share;
 if not found then return null; end if;
 insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,copied_from_id,copied_from_snapshot)
 select a.organization_id,a.asset_id,a.valuation_date,p_scenario,a.currency,a.years,a.base_sales,a.growth_rate,a.royalty_rate,a.contribution_rate,a.annual_cost,a.tax_rate,a.discount_rate,a.assumptions,a.id,
  jsonb_build_object('valuation_date',a.valuation_date,'scenario',a.scenario,'status',a.status,'currency',a.currency,'result_text',a.result_text,'model_version',a.model_version,'updated_at',a.updated_at)
 from public.royalty_dcf_assessments a where a.organization_id=p_org and a.id=p_source and a.model_version='royalty-dcf-v1'
 returning id into result_id;
 return result_id;
end $$;
revoke all on function private.copy_dcf_with_provenance(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.copy_dcf_with_provenance(uuid,uuid,text) to authenticated;
create or replace function public.copy_royalty_dcf_assessment(p_org uuid,p_source uuid,p_scenario text)
returns uuid language sql volatile security invoker set search_path='' as $$
 select private.copy_dcf_with_provenance(p_org,p_source,p_scenario);
$$;
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
  insert into public.royalty_dcf_assessments(id,organization_id,asset_id,copied_from_id,copied_from_snapshot,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,created_by,created_at) values(d.id,d.organization_id,d.asset_id,d.copied_from_id,d.copied_from_snapshot,d.valuation_date,d.scenario,d.currency,d.years,d.base_sales,d.growth_rate,d.royalty_rate,d.contribution_rate,d.annual_cost,d.tax_rate,d.discount_rate,d.assumptions,d.created_by,d.created_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;

