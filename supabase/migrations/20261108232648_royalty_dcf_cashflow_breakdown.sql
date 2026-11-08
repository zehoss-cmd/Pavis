-- Read-only, RLS-preserving reproduction of the royalty-dcf-v1 calculation.
-- Amounts are returned as decimal strings to avoid loss of precision in JavaScript.
create function public.royalty_dcf_cashflows(p_org uuid, p_assessment uuid)
returns table(assessment_updated_at timestamptz, year_number integer, revenue text, royalty_income text, annual_cost text, taxable_income text, tax text, net_cashflow text, discounted_cashflow text)
language sql stable security invoker set search_path='' as $$
 with assessment as (
  select a.* from public.royalty_dcf_assessments a
  where a.organization_id=p_org and a.id=p_assessment and a.model_version='royalty-dcf-v1'
 ), forecast as (
  select a.*, y.year_number, a.base_sales * power(1+a.growth_rate/100,y.year_number-1) as forecast_sales
  from assessment a cross join lateral pg_catalog.generate_series(1,a.years) as y(year_number)
 ), income as (
  select f.*, f.forecast_sales*f.royalty_rate/100*f.contribution_rate/100 as attributable_royalty
  from forecast f
 ), cashflow as (
  select i.*, i.attributable_royalty-i.annual_cost as pre_tax,
   greatest(i.attributable_royalty-i.annual_cost,0)*i.tax_rate/100 as calculated_tax
  from income i
 )
 select c.updated_at,c.year_number,round(c.forecast_sales,2)::text,round(c.attributable_royalty,2)::text,round(c.annual_cost,2)::text,
  round(c.pre_tax,2)::text,round(c.calculated_tax,2)::text,round(c.pre_tax-c.calculated_tax,2)::text,
  round((c.pre_tax-c.calculated_tax)/power(1+c.discount_rate/100,c.year_number),2)::text
 from cashflow c order by c.year_number;
$$;
revoke all on function public.royalty_dcf_cashflows(uuid,uuid) from public,anon;
grant execute on function public.royalty_dcf_cashflows(uuid,uuid) to authenticated;
