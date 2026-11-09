-- Read-only, RLS-preserving snapshot of one qualitative assessment and its model.
create function public.qualitative_export_snapshot(p_org uuid,p_assessment uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'organization_name',o.name,'asset_id',a.id,'asset_title',a.title,'jurisdiction',a.jurisdiction,
  'assessment_id',v.id,'assessment_date',v.assessment_date,'status',v.status,
  'model_version',v.model_version,'model_name',case when v.model_id is null then '기본 모델' else m.name end,
  'model_revision',case when v.model_id is null then 'qualitative-v1' else m.version end,
  'model_description',m.description,'weighted_score',v.weighted_score::text,
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
