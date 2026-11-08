begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('70000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','portfolio-admin@example.invalid','',now(),now()),
('70000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','portfolio-other@example.invalid','',now(),now()),
('70000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','portfolio-viewer@example.invalid','',now(),now()),
('70000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','portfolio-ip@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('71000000-0000-4000-8000-000000000001','QA A'),('71000000-0000-4000-8000-000000000002','QA B');
insert into public.organization_members(organization_id,user_id,role,status) values
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','admin','active'),
('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002','admin','active'),
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000003','viewer','active'),
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000004','ip_manager','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('71000000-0000-4000-8000-000000000002','B patent','KR') returning set_config('test.asset_b',id::text,true);
insert into public.patent_portfolios(organization_id,name) values('71000000-0000-4000-8000-000000000002','B portfolio') returning set_config('test.port_b',id::text,true);
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('71000000-0000-4000-8000-000000000001','A patent','KR') returning set_config('test.asset_a',id::text,true);
insert into public.patent_portfolios(organization_id,name) values('71000000-0000-4000-8000-000000000001','A portfolio') returning set_config('test.port_a',id::text,true);
insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id) values('71000000-0000-4000-8000-000000000001',current_setting('test.port_a')::uuid,current_setting('test.asset_a')::uuid);
do $$ declare n int; begin
 begin insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id) values('71000000-0000-4000-8000-000000000001',current_setting('test.port_a')::uuid,current_setting('test.asset_b')::uuid); raise exception 'cross tenant asset accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id) values('71000000-0000-4000-8000-000000000001',current_setting('test.port_b')::uuid,current_setting('test.asset_a')::uuid); raise exception 'cross tenant portfolio accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id) values('71000000-0000-4000-8000-000000000001',current_setting('test.port_a')::uuid,current_setting('test.asset_a')::uuid); raise exception 'duplicate accepted'; exception when unique_violation then null; end;
 select count(*) into n from public.audit_logs where organization_id='71000000-0000-4000-8000-000000000001' and action in ('patent.portfolio.created','patent.portfolio.asset.added'); if n<>2 then raise exception 'audit missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_portfolios; if n<>1 then raise exception 'viewer access failed'; end if;
 select count(*) into n from public.patent_portfolio_assets; if n<>1 then raise exception 'viewer link read failed'; end if;
 begin insert into public.patent_portfolios(organization_id,name) values('71000000-0000-4000-8000-000000000001','viewer'); raise exception 'viewer created portfolio'; exception when insufficient_privilege then null; end;
 delete from public.patent_portfolio_assets; get diagnostics n=row_count; if n<>0 then raise exception 'viewer deleted link'; end if;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000004',true);
delete from public.patent_portfolio_assets where organization_id='71000000-0000-4000-8000-000000000001' and portfolio_id=current_setting('test.port_a')::uuid;
do $$ declare n int; begin select count(*) into n from public.patent_assets where id=current_setting('test.asset_a')::uuid; if n<>1 then raise exception 'asset lost'; end if; end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.patent_portfolios; if n<>1 then raise exception 'cross tenant portfolio access'; end if; select count(*) into n from public.patent_portfolio_assets; if n<>0 then raise exception 'cross tenant link access'; end if; end $$;
set local role anon;
do $$ begin begin perform * from public.patent_portfolios; raise exception 'anonymous access allowed'; exception when insufficient_privilege then null; end; end $$;
rollback;
