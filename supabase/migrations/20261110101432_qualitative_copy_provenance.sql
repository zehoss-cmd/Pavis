-- Save a protected snapshot of the source when making a new qualitative draft.
alter table public.valuation_assessments add column copied_from_id uuid, add column copied_from_snapshot jsonb,
 add constraint qualitative_copy_snapshot_pair check ((copied_from_id is null and copied_from_snapshot is null) or (copied_from_id is not null and copied_from_snapshot is not null and jsonb_typeof(copied_from_snapshot)='object'));
-- Definer writes provenance columns only after checking and locking current membership.
create function private.copy_qualitative_with_provenance(p_org uuid,p_source uuid)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare result_id uuid;actor uuid:=auth.uid();
begin
 if actor is null then return null; end if;
 perform 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.status='active' and m.role in ('admin','ip_manager') for share;
 if not found then return null; end if;
 insert into public.valuation_assessments(organization_id,asset_id,model_id,assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note,copied_from_id,copied_from_snapshot)
 select a.organization_id,a.asset_id,a.model_id,a.assessment_date,a.legal_score,a.technical_score,a.market_score,a.commercial_score,a.legal_note,a.technical_note,a.market_note,a.commercial_note,a.id,
 jsonb_build_object('assessment_date',a.assessment_date,'status',a.status,'model_version',a.model_version,'model_name',case when a.model_id is null then '기본 모델' else m.name end,'model_revision',case when a.model_id is null then 'qualitative-v1' else m.version end,'weighted_score',a.weighted_score::text,'updated_at',a.updated_at,
 'criteria',jsonb_build_array(jsonb_build_object('key','legal','score',a.legal_score,'weight',a.legal_weight,'note',a.legal_note),jsonb_build_object('key','technical','score',a.technical_score,'weight',a.technical_weight,'note',a.technical_note),jsonb_build_object('key','market','score',a.market_score,'weight',a.market_weight,'note',a.market_note),jsonb_build_object('key','commercial','score',a.commercial_score,'weight',a.commercial_weight,'note',a.commercial_note)))
 from public.valuation_assessments a left join public.valuation_models m on m.organization_id=a.organization_id and m.id=a.model_id
 where a.organization_id=p_org and a.id=p_source and a.model_version='qualitative-v1' and (a.model_id is null or m.id is not null)
 returning id into result_id;
 return result_id;
end $$;
revoke all on function private.copy_qualitative_with_provenance(uuid,uuid) from public,anon,authenticated;
grant execute on function private.copy_qualitative_with_provenance(uuid,uuid) to authenticated;
create function public.copy_qualitative_assessment(p_org uuid,p_source uuid)
returns uuid language sql volatile security invoker set search_path='' as $$ select private.copy_qualitative_with_provenance(p_org,p_source); $$;
revoke all on function public.copy_qualitative_assessment(uuid,uuid) from public,anon;
grant execute on function public.copy_qualitative_assessment(uuid,uuid) to authenticated;
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
  insert into public.valuation_assessments(id,organization_id,asset_id,model_id,copied_from_id,copied_from_snapshot,assessment_date,legal_score,technical_score,market_score,commercial_score,legal_note,technical_note,market_note,commercial_note,created_by,created_at) values(v.id,v.organization_id,v.asset_id,v.model_id,v.copied_from_id,v.copied_from_snapshot,v.assessment_date,v.legal_score,v.technical_score,v.market_score,v.commercial_score,v.legal_note,v.technical_note,v.market_note,v.commercial_note,v.created_by,v.created_at);
 elsif r.kind='royalty_dcf' then
  d:=jsonb_populate_record(null::public.royalty_dcf_assessments,r.snapshot);
  insert into public.royalty_dcf_assessments(id,organization_id,asset_id,copied_from_id,copied_from_snapshot,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,created_by,created_at) values(d.id,d.organization_id,d.asset_id,d.copied_from_id,d.copied_from_snapshot,d.valuation_date,d.scenario,d.currency,d.years,d.base_sales,d.growth_rate,d.royalty_rate,d.contribution_rate,d.annual_cost,d.tax_rate,d.discount_rate,d.assumptions,d.created_by,d.created_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;


-- Read-only, RLS-preserving snapshot of one qualitative assessment and its model.
create or replace function public.qualitative_export_snapshot(p_org uuid,p_assessment uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'organization_name',o.name,'asset_id',a.id,'asset_title',a.title,'jurisdiction',a.jurisdiction,
  'assessment_id',v.id,'assessment_date',v.assessment_date,'status',v.status,
  'model_version',v.model_version,'model_name',case when v.model_id is null then '기본 모델' else m.name end,
  'model_revision',case when v.model_id is null then 'qualitative-v1' else m.version end,
  'model_description',m.description,'weighted_score',v.weighted_score::text,'copied_from_id',v.copied_from_id,'copied_from_snapshot',v.copied_from_snapshot,
  'created_at',to_char(v.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'updated_at',to_char(v.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'finalized_at',to_char(v.finalized_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'criteria',jsonb_build_array(
   jsonb_build_object('key','legal','score',v.legal_score,'weight',v.legal_weight,'note',v.legal_note),
   jsonb_build_object('key','technical','score',v.technical_score,'weight',v.technical_weight,'note',v.technical_note),
   jsonb_build_object('key','market','score',v.market_score,'weight',v.market_weight,'note',v.market_note),
   jsonb_build_object('key','commercial','score',v.commercial_score,'weight',v.commercial_weight,'note',v.commercial_note))
 )
 from public.valuation_assessments v
 join public.patent_assets a on a.organization_id=v.organization_id and a.id=v.asset_id
 join public.organizations o on o.id=v.organization_id
 left join public.valuation_models m on m.organization_id=v.organization_id and m.id=v.model_id
 where v.organization_id=p_org and v.id=p_assessment and v.model_version='qualitative-v1'
  and (v.model_id is null or m.id is not null);
$$;
revoke all on function public.qualitative_export_snapshot(uuid,uuid) from public,anon;
grant execute on function public.qualitative_export_snapshot(uuid,uuid) to authenticated;
