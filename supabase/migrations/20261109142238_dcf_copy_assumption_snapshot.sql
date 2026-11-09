-- Keep the complete source inputs at copy time; numeric strings preserve decimal precision.
create or replace function private.copy_dcf_with_provenance(p_org uuid,p_source uuid,p_scenario text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
declare result_id uuid; actor uuid:=auth.uid();
begin
 if actor is null or p_scenario not in ('conservative','base','optimistic') then return null; end if;
 perform 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.status='active' and m.role in ('admin','ip_manager') for share;
 if not found then return null; end if;
 insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,copied_from_id,copied_from_snapshot)
 select a.organization_id,a.asset_id,a.valuation_date,p_scenario,a.currency,a.years,a.base_sales,a.growth_rate,a.royalty_rate,a.contribution_rate,a.annual_cost,a.tax_rate,a.discount_rate,a.assumptions,a.id,
  jsonb_build_object('valuation_date',a.valuation_date,'scenario',a.scenario,'status',a.status,'currency',a.currency,'result_text',a.result_text,'model_version',a.model_version,'updated_at',a.updated_at,'inputs',jsonb_build_object(
   'years',a.years::text,'base_sales',a.base_sales::text,'growth_rate',a.growth_rate::text,
   'royalty_rate',a.royalty_rate::text,'contribution_rate',a.contribution_rate::text,
   'annual_cost',a.annual_cost::text,'tax_rate',a.tax_rate::text,'discount_rate',a.discount_rate::text,
   'assumptions',a.assumptions))
 from public.royalty_dcf_assessments a where a.organization_id=p_org and a.id=p_source and a.model_version='royalty-dcf-v1'
 returning id into result_id;
 return result_id;
end $$;
