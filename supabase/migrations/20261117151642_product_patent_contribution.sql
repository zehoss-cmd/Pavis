-- A nullable percentage belongs to each product–patent relationship.
alter table public.product_patent_links add column contribution_rate numeric;
alter table public.product_patent_links add constraint product_patent_contribution_rate_check check (
 contribution_rate is null or (contribution_rate>=0 and contribution_rate<=100 and contribution_rate=round(contribution_rate,2))
);
-- Writers may only change this field; organization and linked assets remain immutable.
grant update(contribution_rate) on public.product_patent_links to authenticated;
create policy product_patents_update_contribution on public.product_patent_links for update to authenticated
 using (exists(select 1 from public.organization_members m where m.organization_id=product_patent_links.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')))
 with check (exists(select 1 from public.organization_members m where m.organization_id=product_patent_links.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create function private.product_patent_contribution_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if new.contribution_rate is distinct from old.contribution_rate then
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(new.organization_id,auth.uid(),'product.patent.contribution_updated',new.id);
 end if;
 return new;
end $$;
revoke all on function private.product_patent_contribution_audit() from public,anon,authenticated;
create trigger product_patent_contribution_audit after update of contribution_rate on public.product_patent_links for each row execute function private.product_patent_contribution_audit();
