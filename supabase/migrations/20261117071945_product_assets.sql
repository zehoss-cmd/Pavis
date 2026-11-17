-- Organization-scoped products; revenue is stored with its actual year and currency.
create table public.product_assets (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 name text not null check (name=btrim(name) and char_length(name) between 1 and 200),
 launch_year integer check (launch_year between 1800 and 2100),
 revenue_year integer check (revenue_year between 1800 and 2100),
 revenue_amount numeric(14,2) check (revenue_amount >= 0),
 revenue_currency text check (revenue_currency in ('KRW','USD','EUR','JPY')),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((revenue_year is null and revenue_amount is null and revenue_currency is null) or (revenue_year is not null and revenue_amount is not null and revenue_currency is not null))
);
create index product_assets_org_created on public.product_assets(organization_id,created_at desc,id desc);
alter table public.product_assets enable row level security;
revoke all on public.product_assets from public,anon,authenticated;
grant select,delete on public.product_assets to authenticated;
grant insert(organization_id,name,launch_year,revenue_year,revenue_amount,revenue_currency) on public.product_assets to authenticated;
grant update(name,launch_year,revenue_year,revenue_amount,revenue_currency) on public.product_assets to authenticated;
create policy products_read on public.product_assets for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=product_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy products_insert on public.product_assets for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=product_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy products_update on public.product_assets for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=product_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=product_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy products_delete on public.product_assets for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=product_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create trigger products_timestamps before insert or update on public.product_assets for each row execute function private.registry_timestamps();
alter table private.registry_recycle_bin drop constraint registry_recycle_bin_kind_check;
alter table private.registry_recycle_bin add constraint registry_recycle_bin_kind_check check(kind in ('asset','family','portfolio','legal_event','valuation','royalty_dcf','product'));
create function private.product_archive() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,'product',old.id,to_jsonb(old),auth.uid());
 return old;
end $$;
revoke all on function private.product_archive() from public,anon,authenticated;
create trigger products_archive before delete on public.product_assets for each row execute function private.product_archive();
create function private.product_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare item public.product_assets%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then item:=old; else item:=new; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(item.organization_id,auth.uid(),'product.'||lower(tg_op),item.id);
 return item;
end $$;
revoke all on function private.product_audit() from public,anon,authenticated;
create trigger products_audit after insert or update or delete on public.product_assets for each row execute function private.product_audit();
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
  insert into public.product_assets(id,organization_id,name,launch_year,revenue_year,revenue_amount,revenue_currency,created_by,created_at,updated_at) values(product.id,product.organization_id,product.name,product.launch_year,product.revenue_year,product.revenue_amount,product.revenue_currency,product.created_by,product.created_at,product.updated_at);
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;



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
    or exists(select 1 from public.product_assets where organization_id=p_org)
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
