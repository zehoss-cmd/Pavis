-- A product can reference multiple patents, and a patent can support multiple products.
alter table public.product_assets add constraint product_assets_organization_id_id_key unique(organization_id,id);
create table public.product_patent_links (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 product_id uuid not null,
 patent_id uuid not null,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 foreign key(organization_id,product_id) references public.product_assets(organization_id,id) on delete restrict,
 foreign key(organization_id,patent_id) references public.patent_assets(organization_id,id) on delete restrict,
 unique(organization_id,product_id,patent_id)
);
create index product_patent_links_product_order on public.product_patent_links(organization_id,product_id,created_at desc,id desc);
create index product_patent_links_patent on public.product_patent_links(organization_id,patent_id);
alter table public.product_patent_links enable row level security;
revoke all on public.product_patent_links from public,anon,authenticated;
grant select, delete on public.product_patent_links to authenticated;
grant insert(organization_id,product_id,patent_id) on public.product_patent_links to authenticated;
create policy product_patents_read on public.product_patent_links for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=product_patent_links.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy product_patents_insert on public.product_patent_links for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=product_patent_links.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy product_patents_delete on public.product_patent_links for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=product_patent_links.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create trigger product_patents_timestamps before insert on public.product_patent_links for each row execute function private.registry_timestamps();
create function private.product_patent_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare item public.product_patent_links%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if tg_op='DELETE' then item:=old; else item:=new; end if;
 insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(item.organization_id,auth.uid(),case when tg_op='INSERT' then 'product.patent.linked' else 'product.patent.unlinked' end,item.product_id);
 return item;
end $$;
revoke all on function private.product_patent_audit() from public,anon,authenticated;
create trigger product_patents_audit after insert or delete on public.product_patent_links for each row execute function private.product_patent_audit();
