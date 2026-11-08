-- Copy the source inputs exactly in a single statement; RLS applies to both read and insert.
-- The copy is a new independent draft, not a mutable revision of the source.
create function public.copy_royalty_dcf_assessment(p_org uuid,p_source uuid,p_scenario text)
returns uuid language sql volatile security invoker set search_path='' as $$
 insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions)
 select a.organization_id,a.asset_id,a.valuation_date,p_scenario,a.currency,a.years,a.base_sales,a.growth_rate,a.royalty_rate,a.contribution_rate,a.annual_cost,a.tax_rate,a.discount_rate,a.assumptions
 from public.royalty_dcf_assessments a
 where a.organization_id=p_org and a.id=p_source and a.model_version='royalty-dcf-v1' and p_scenario in ('conservative','base','optimistic')
 returning id;
$$;
revoke all on function public.copy_royalty_dcf_assessment(uuid,uuid,text) from public,anon;
grant execute on function public.copy_royalty_dcf_assessment(uuid,uuid,text) to authenticated;
