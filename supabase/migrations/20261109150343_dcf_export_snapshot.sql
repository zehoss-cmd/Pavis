-- A single RLS-preserving statement returns one consistent assessment and its cash flows.
-- Numeric inputs/results use text so export does not lose decimal precision in JavaScript.
create function public.royalty_dcf_export_snapshot(p_org uuid,p_assessment uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'organization_name',o.name,'asset_id',a.id,'asset_title',a.title,'jurisdiction',a.jurisdiction,
  'assessment_id',d.id,'valuation_date',d.valuation_date,'scenario',d.scenario,'currency',d.currency,
  'years',d.years,'base_sales',d.base_sales::text,'growth_rate',d.growth_rate::text,
  'royalty_rate',d.royalty_rate::text,'contribution_rate',d.contribution_rate::text,
  'annual_cost',d.annual_cost::text,'tax_rate',d.tax_rate::text,'discount_rate',d.discount_rate::text,
  'assumptions',d.assumptions,'model_version',d.model_version,'result',d.result_text,'status',d.status,
  'created_at',to_char(d.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updated_at',to_char(d.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'finalized_at',to_char(d.finalized_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'copied_from_id',d.copied_from_id,'copied_from_snapshot',d.copied_from_snapshot,
  'cashflows',coalesce((select jsonb_agg(to_jsonb(f) order by f.year_number) from public.royalty_dcf_cashflows(p_org,d.id) f),'[]'::jsonb)
 )
 from public.royalty_dcf_assessments d
 join public.patent_assets a on a.organization_id=d.organization_id and a.id=d.asset_id
 join public.organizations o on o.id=d.organization_id
 where d.organization_id=p_org and d.id=p_assessment and d.model_version='royalty-dcf-v1';
$$;
revoke all on function public.royalty_dcf_export_snapshot(uuid,uuid) from public,anon;
grant execute on function public.royalty_dcf_export_snapshot(uuid,uuid) to authenticated;
