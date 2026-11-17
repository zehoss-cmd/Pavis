-- Revenue reviewers receive only voluntarily submitted snapshots, never blanket access to products.
create table private.revenue_reviewers(user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on private.revenue_reviewers from public,anon,authenticated;
insert into private.revenue_reviewers(user_id) select id from auth.users where lower(email)='jhlee9097@gmail.com' and email_confirmed_at is not null;
create function private.is_revenue_reviewer() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.revenue_reviewers where user_id=auth.uid());
$$;
revoke all on function private.is_revenue_reviewer() from public,anon,authenticated;
grant execute on function private.is_revenue_reviewer() to authenticated;
create function public.is_revenue_reviewer() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_revenue_reviewer(); $$;
revoke all on function public.is_revenue_reviewer() from public,anon;
grant execute on function public.is_revenue_reviewer() to authenticated;

alter table public.product_assets add column revenue_revision bigint not null default 0;
create table public.product_revenue_reviews (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 product_id uuid not null,
 requester_id uuid not null references auth.users(id) on delete restrict,
 product_name text not null,
 revenue_year integer not null,
 revenue_amount numeric(14,2) not null,
 revenue_currency text not null,
 revenue_revision bigint not null,
 evidence text not null check (char_length(btrim(evidence)) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','reviewed','needs_info','superseded')),
 reviewer_id uuid references auth.users(id) on delete restrict,
 review_note text check(review_note is null or char_length(btrim(review_note)) between 1 and 1000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 foreign key(organization_id,product_id) references public.product_assets(organization_id,id) on delete cascade,
 check ((status in ('pending','superseded') and reviewer_id is null and review_note is null and reviewed_at is null) or (status in ('reviewed','needs_info') and reviewer_id is not null and review_note is not null and reviewed_at is not null))
);
create unique index product_revenue_one_pending on public.product_revenue_reviews(organization_id,product_id) where status='pending';
create index product_revenue_reviews_product on public.product_revenue_reviews(organization_id,product_id,created_at desc,id desc);
create index product_revenue_reviews_pending on public.product_revenue_reviews(created_at,id) where status='pending';
alter table public.product_revenue_reviews enable row level security;
revoke all on public.product_revenue_reviews from public,anon,authenticated;
grant select on public.product_revenue_reviews to authenticated;
create policy product_revenue_reviews_read on public.product_revenue_reviews for select to authenticated using (
 (select private.is_revenue_reviewer()) or exists(select 1 from public.organization_members m where m.organization_id=product_revenue_reviews.organization_id and m.user_id=(select auth.uid()) and m.status='active')
);
-- A monotonic revision invalidates reviews even if amounts are later changed back.
create function private.product_revenue_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.revenue_year is distinct from old.revenue_year or new.revenue_amount is distinct from old.revenue_amount or new.revenue_currency is distinct from old.revenue_currency then
  new.revenue_revision:=old.revenue_revision+1;
  update public.product_revenue_reviews set status='superseded' where organization_id=old.organization_id and product_id=old.id and status='pending';
 end if;
 return new;
end $$;
revoke all on function private.product_revenue_revision() from public,anon,authenticated;
create trigger product_revenue_revision before update on public.product_assets for each row execute function private.product_revenue_revision();
create function private.request_product_revenue_review(p_org uuid,p_product uuid,p_evidence text) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.product_assets%rowtype; result uuid; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=actor and m.status='active' and m.role in ('admin','ip_manager')) then raise exception 'not authorized' using errcode='42501'; end if;
 if p_evidence is null or char_length(btrim(p_evidence)) not between 1 and 1000 then raise exception 'invalid evidence' using errcode='22023'; end if;
 select * into item from public.product_assets where organization_id=p_org and id=p_product for update;
 if not found or item.revenue_amount is null then raise exception 'revenue unavailable' using errcode='P0002'; end if;
 insert into public.product_revenue_reviews(organization_id,product_id,requester_id,product_name,revenue_year,revenue_amount,revenue_currency,revenue_revision,evidence)
 values(p_org,p_product,actor,item.name,item.revenue_year,item.revenue_amount,item.revenue_currency,item.revenue_revision,btrim(p_evidence)) returning id into result;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,actor,'product.revenue.review_requested',p_product);
 return result;
end $$;
revoke all on function private.request_product_revenue_review(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.request_product_revenue_review(uuid,uuid,text) to authenticated;
create function public.request_product_revenue_review(p_org uuid,p_product uuid,p_evidence text) returns uuid language sql security invoker set search_path='' as $$ select private.request_product_revenue_review(p_org,p_product,p_evidence); $$;
revoke all on function public.request_product_revenue_review(uuid,uuid,text) from public,anon;
grant execute on function public.request_product_revenue_review(uuid,uuid,text) to authenticated;
create function private.decide_product_revenue_review(p_id uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare r public.product_revenue_reviews%rowtype; item public.product_assets%rowtype; actor uuid:=auth.uid();
begin
 if actor is null or not private.is_revenue_reviewer() then raise exception 'not authorized' using errcode='42501'; end if;
 if p_decision not in ('reviewed','needs_info') or p_note is null or char_length(btrim(p_note)) not between 1 and 1000 then raise exception 'invalid decision' using errcode='22023'; end if;
 select * into r from public.product_revenue_reviews where id=p_id;
 if not found then raise exception 'request unavailable' using errcode='P0002'; end if;
 select * into item from public.product_assets where organization_id=r.organization_id and id=r.product_id for update;
 if not found then raise exception 'product unavailable' using errcode='P0002'; end if;
 select * into r from public.product_revenue_reviews where id=p_id for update;
 if not found or r.status<>'pending' or r.revenue_revision<>item.revenue_revision then raise exception 'request unavailable' using errcode='P0002'; end if;
 update public.product_revenue_reviews set status=p_decision,reviewer_id=actor,review_note=btrim(p_note),reviewed_at=now() where id=p_id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(r.organization_id,actor,'product.revenue.'||p_decision,r.product_id);
end $$;
revoke all on function private.decide_product_revenue_review(uuid,text,text) from public,anon,authenticated;
grant execute on function private.decide_product_revenue_review(uuid,text,text) to authenticated;
create function public.decide_product_revenue_review(p_id uuid,p_decision text,p_note text) returns void language sql security invoker set search_path='' as $$ select private.decide_product_revenue_review(p_id,p_decision,p_note); $$;
revoke all on function public.decide_product_revenue_review(uuid,text,text) from public,anon;
grant execute on function public.decide_product_revenue_review(uuid,text,text) to authenticated;

-- Keep submitted review records in the existing private 30-day product archive.
create or replace function private.product_archive() returns trigger language plpgsql security definer set search_path='' as $$
declare review_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id),'[]'::jsonb) into review_snapshot from public.product_revenue_reviews r where r.organization_id=old.organization_id and r.product_id=old.id;
 insert into private.registry_recycle_bin(organization_id,kind,record_id,snapshot,deleted_by) values(old.organization_id,'product',old.id,to_jsonb(old)||jsonb_build_object('_revenue_reviews',review_snapshot),auth.uid());
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
 else raise exception 'unsupported record';
 end if;
 delete from private.registry_recycle_bin where id=r.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(p_org,auth.uid(),'patent.'||r.kind||'.restored',r.record_id);
end $$;



