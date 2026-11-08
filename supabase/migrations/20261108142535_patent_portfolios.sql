-- Organization-isolated portfolios and many-to-many patent assignments.
create table public.patent_portfolios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200 and name=btrim(name)),
  description text check (description is null or (char_length(btrim(description)) between 1 and 500 and description=btrim(description))),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id)
);
create index patent_portfolios_org_created on public.patent_portfolios(organization_id,created_at desc,id desc);
create table public.patent_portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  portfolio_id uuid not null,
  asset_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id,portfolio_id) references public.patent_portfolios(organization_id,id) on delete restrict,
  foreign key (organization_id,asset_id) references public.patent_assets(organization_id,id) on delete restrict,
  unique (organization_id,portfolio_id,asset_id)
);
create index patent_portfolio_assets_org_asset on public.patent_portfolio_assets(organization_id,asset_id,portfolio_id);
alter table public.patent_portfolios enable row level security;
alter table public.patent_portfolio_assets enable row level security;
revoke all on public.patent_portfolios, public.patent_portfolio_assets from anon,authenticated;
grant select on public.patent_portfolios, public.patent_portfolio_assets to authenticated;
grant insert(organization_id,name,description) on public.patent_portfolios to authenticated;
grant insert(organization_id,portfolio_id,asset_id), delete on public.patent_portfolio_assets to authenticated;
create policy portfolios_read on public.patent_portfolios for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolios.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy portfolios_insert on public.patent_portfolios for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolios.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy portfolio_assets_read on public.patent_portfolio_assets for select to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolio_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
create policy portfolio_assets_insert on public.patent_portfolio_assets for insert to authenticated with check (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolio_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create policy portfolio_assets_delete on public.patent_portfolio_assets for delete to authenticated using (exists(select 1 from public.organization_members m where m.organization_id=patent_portfolio_assets.organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('admin','ip_manager')));
create trigger portfolios_timestamps before insert on public.patent_portfolios for each row execute function private.registry_timestamps();
create trigger portfolio_assets_timestamps before insert on public.patent_portfolio_assets for each row execute function private.registry_timestamps();
create function private.portfolio_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare org uuid; target uuid; action_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if tg_op='DELETE' then org:=old.organization_id; target:=old.asset_id; action_name:='patent.portfolio.asset.removed';
  elsif tg_table_name='patent_portfolios' then org:=new.organization_id; target:=new.id; action_name:='patent.portfolio.created';
  else org:=new.organization_id; target:=new.asset_id; action_name:='patent.portfolio.asset.added'; end if;
  insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values(org,auth.uid(),action_name,target);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.portfolio_audit() from public,anon,authenticated;
create trigger portfolios_audit after insert on public.patent_portfolios for each row execute function private.portfolio_audit();
create trigger portfolio_assets_audit after insert or delete on public.patent_portfolio_assets for each row execute function private.portfolio_audit();
