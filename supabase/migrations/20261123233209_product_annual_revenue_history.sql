create table public.product_revenue_versions (
 organization_id uuid not null,
 product_id uuid not null,
 revenue_year integer not null check (revenue_year between 1800 and 2100),
 revenue_revision bigint not null check (revenue_revision >= 0),
 revenue_amount numeric(14,2) not null check (revenue_amount >= 0),
 revenue_currency text not null check (revenue_currency in ('KRW','USD','EUR','JPY')),
 primary key (organization_id,product_id,revenue_year,revenue_revision),
 foreign key (organization_id,product_id) references public.product_assets(organization_id,id) on delete cascade
);

alter table public.product_revenue_versions enable row level security;
revoke all on public.product_revenue_versions from public,anon,authenticated;
grant select on public.product_revenue_versions to authenticated;
create policy product_revenue_versions_read on public.product_revenue_versions for select to authenticated using (
 exists(select 1 from public.organization_members m
  where m.organization_id=product_revenue_versions.organization_id and m.user_id=(select auth.uid()) and m.status='active')
);

-- Existing product values take precedence over submitted snapshots with the same revision.
insert into public.product_revenue_versions (organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency)
select organization_id,id,revenue_year,revenue_revision,revenue_amount,revenue_currency
from public.product_assets where revenue_year is not null;
insert into public.product_revenue_versions (organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency)
select distinct on (organization_id,product_id,revenue_year,revenue_revision)
 organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency
from public.product_revenue_reviews
order by organization_id,product_id,revenue_year,revenue_revision,created_at desc,id desc
on conflict do nothing;

create function private.capture_product_revenue_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if new.revenue_year is not null and (tg_op='INSERT' or new.revenue_revision is distinct from old.revenue_revision) then
  insert into public.product_revenue_versions (organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency)
  values (new.organization_id,new.id,new.revenue_year,new.revenue_revision,new.revenue_amount,new.revenue_currency);
 end if;
 return new;
end $$;
revoke all on function private.capture_product_revenue_version() from public,anon,authenticated;
create trigger products_revenue_history after insert or update on public.product_assets
 for each row execute function private.capture_product_revenue_version();

create view public.product_annual_revenue with (security_invoker=true) as
select annual.organization_id,annual.product_id,annual.revenue_year,annual.revenue_revision,
       annual.revenue_amount,annual.revenue_currency,review.status as review_status
from (
 select distinct on (organization_id,product_id,revenue_year)
  organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency
 from public.product_revenue_versions
 order by organization_id,product_id,revenue_year,revenue_revision desc
) annual
left join lateral (
 select r.status from public.product_revenue_reviews r
 where r.organization_id=annual.organization_id and r.product_id=annual.product_id
   and r.revenue_year=annual.revenue_year and r.revenue_revision=annual.revenue_revision
 order by r.created_at desc,r.id desc limit 1
) review on true;
revoke all on public.product_annual_revenue from public,anon,authenticated;
grant select on public.product_annual_revenue to authenticated;
create index product_revenue_reviews_year_revision on public.product_revenue_reviews
 (organization_id,product_id,revenue_year,revenue_revision,created_at desc,id desc);

create or replace function private.product_archive() returns trigger language plpgsql security definer set search_path='' as $$
declare review_snapshot jsonb; annual_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id),'[]'::jsonb) into review_snapshot from public.product_revenue_reviews r where r.organization_id=old.organization_id and r.product_id=old.id;
 select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) into annual_snapshot
 from public.product_revenue_versions v where v.organization_id=old.organization_id and v.product_id=old.id;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,'product',old.id,to_jsonb(old)||jsonb_build_object('_revenue_reviews',review_snapshot,'_annual_revenue',annual_snapshot),auth.uid());
 return old;
end $$;
create or replace function private.registry_recycle_restore(p_org uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.registry_recycle_bin%rowtype; a public.patent_assets%rowtype; f public.patent_families%rowtype; p public.patent_portfolios%rowtype; e public.patent_legal_events%rowtype; v public.valuation_assessments%rowtype; d public.royalty_dcf_assessments%rowtype; product public.product_assets%rowtype;
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
 elsif r.kind='product' then
  product:=jsonb_populate_record(null::public.product_assets,r.snapshot);
  insert into public.product_assets(id,organization_id,name,launch_year,revenue_year,revenue_amount,revenue_currency,revenue_revision,created_by,created_at,updated_at) values(product.id,product.organization_id,product.name,product.launch_year,product.revenue_year,product.revenue_amount,product.revenue_currency,coalesce(product.revenue_revision,0),product.created_by,product.created_at,product.updated_at);
  insert into public.product_revenue_reviews(id,organization_id,product_id,requester_id,product_name,revenue_year,revenue_amount,revenue_currency,revenue_revision,evidence,status,reviewer_id,review_note,created_at,reviewed_at)
  select x.id,x.organization_id,x.product_id,x.requester_id,x.product_name,x.revenue_year,x.revenue_amount,x.revenue_currency,x.revenue_revision,x.evidence,x.status,x.reviewer_id,x.review_note,x.created_at,x.reviewed_at from jsonb_populate_recordset(null::public.product_revenue_reviews,coalesce(r.snapshot->'_revenue_reviews','[]'::jsonb)) x;
  insert into public.product_revenue_versions (organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency)
  select p_org,product.id,x.revenue_year,x.revenue_revision,x.revenue_amount,x.revenue_currency
  from jsonb_populate_recordset(null::public.product_revenue_versions,coalesce(r.snapshot->'_annual_revenue','[]'::jsonb)) x
  on conflict do nothing;
  -- Products deleted before the migration contain review snapshots but no annual history.
  if not (r.snapshot ? '_annual_revenue') then
   insert into public.product_revenue_versions (organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency)
   select distinct on (revenue_year,revenue_revision) organization_id,product_id,revenue_year,revenue_revision,revenue_amount,revenue_currency
   from public.product_revenue_reviews where organization_id=p_org and product_id=product.id
   order by revenue_year,revenue_revision,created_at desc,id desc
   on conflict do nothing;
  end if;
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;
