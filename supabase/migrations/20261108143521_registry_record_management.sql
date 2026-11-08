-- Management remains limited to active organization admins and IP managers.
grant delete on public.patent_assets, public.patent_families, public.patent_portfolios to authenticated;
grant update(name,description) on public.patent_portfolios to authenticated;
create policy assets_delete on public.patent_assets for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy families_delete on public.patent_families for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_families.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy portfolios_update on public.patent_portfolios for update to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolios.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager'))) with check (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolios.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy portfolios_delete on public.patent_portfolios for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolios.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create trigger portfolios_updated_at before update on public.patent_portfolios for each row execute function private.registry_timestamps();
create function private.registry_management_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare event text; record_id uuid; org uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if tg_op='DELETE' then
    record_id:=old.id; org:=old.organization_id;
    event:=case tg_table_name when 'patent_assets' then 'patent.asset.deleted' when 'patent_families' then 'patent.family.deleted' when 'patent_portfolios' then 'patent.portfolio.deleted' end;
  else
    record_id:=new.id; org:=new.organization_id; event:='patent.portfolio.updated';
  end if;
  if event is null then raise exception 'unexpected registry audit event'; end if;
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org,auth.uid(),event,record_id);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.registry_management_audit() from public,anon,authenticated;
create trigger assets_delete_audit after delete on public.patent_assets for each row execute function private.registry_management_audit();
create trigger families_delete_audit after delete on public.patent_families for each row execute function private.registry_management_audit();
create trigger portfolios_management_audit after update or delete on public.patent_portfolios for each row execute function private.registry_management_audit();
