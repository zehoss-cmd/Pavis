begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-admin@example.invalid','',now(),now()),
('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-other@example.invalid','',now(),now()),
('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-viewer@example.invalid','',now(),now()),
('a0000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-ip@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('a1000000-0000-4000-8000-000000000001','Event A'),('a1000000-0000-4000-8000-000000000002','Event B');
insert into public.organization_members(organization_id,user_id,role,status) values
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','admin','active'),
('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','admin','active'),
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','viewer','active'),
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000004','ip_manager','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000002','Other patent','KR') returning set_config('test.event_asset_b',id::text,true);
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000001','Patent A','KR') returning set_config('test.event_asset_a',id::text,true);
insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01','base','KRW',2,1000,0,10,100,20,25,20) returning set_config('test.dcf',id::text,true);
do $$ declare n int; x numeric; begin
 select count(*) into n from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid); if n<>2 then raise exception 'wrong cashflow count'; end if;
 select discounted_cashflow::numeric into x from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid) where year_number=1; if x<>50 then raise exception 'year 1 cashflow incorrect %',x; end if;
 select discounted_cashflow::numeric into x from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid) where year_number=2; if x<>41.67 then raise exception 'year 2 cashflow incorrect %',x; end if;
 select count(*) into n from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000002',current_setting('test.dcf')::uuid); if n<>0 then raise exception 'cashflow wrong organization'; end if;
end $$;
do $$ declare x numeric; begin
 select result into x from public.royalty_dcf_assessments where id=current_setting('test.dcf')::uuid; if x<>91.67 then raise exception 'incorrect DCF %',x; end if;
 begin update public.royalty_dcf_assessments set result=999 where id=current_setting('test.dcf')::uuid; raise exception 'result modified'; exception when insufficient_privilege then null; end;
 begin update public.royalty_dcf_assessments set status='final' where id=current_setting('test.dcf')::uuid; raise exception 'finalized without evidence'; exception when check_violation then null; end;
 begin insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_b')::uuid,'2025-01-01','base','KRW',2,1000,0,10,100,20,25,20); raise exception 'cross organization patent accepted'; exception when foreign_key_violation then null; end;
end $$;
insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01','optimistic','USD',2,1000,0,10,100,20,25,20) returning set_config('test.dcf2',id::text,true);
do $$ declare x numeric; begin
 select result into x from public.royalty_dcf_assessments where id=current_setting('test.dcf2')::uuid; if x<>91.67 then raise exception 'identical assumptions are not reproducible'; end if;
 update public.royalty_dcf_assessments set growth_rate=-100,annual_cost=0,discount_rate=0,tax_rate=0 where id=current_setting('test.dcf2')::uuid;
 select result into x from public.royalty_dcf_assessments where id=current_setting('test.dcf2')::uuid; if x<>100 then raise exception 'negative growth edge case %',x; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin select count(*) into n from public.royalty_dcf_assessments; if n<>0 then raise exception 'viewer can read'; end if; select count(*) into n from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid); if n<>0 then raise exception 'viewer sees cashflows'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.royalty_dcf_assessments; if n<>0 then raise exception 'cross tenant leak'; end if; select count(*) into n from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid); if n<>0 then raise exception 'cross tenant cashflows leak'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
update public.royalty_dcf_assessments set assumptions='자료 검토',base_sales=0,annual_cost=20,discount_rate=0 where id=current_setting('test.dcf')::uuid;
do $$ declare x numeric; begin select result into x from public.royalty_dcf_assessments where id=current_setting('test.dcf')::uuid; if x<>-40 then raise exception 'negative cash flow taxed or calculated incorrectly %',x; end if; end $$;
delete from public.royalty_dcf_assessments where id=current_setting('test.dcf')::uuid;
select set_config('test.dcf_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='royalty_dcf' and record_id=current_setting('test.dcf')::uuid and name='Patent A · 2025-01-01';
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf_trash')::uuid);
update public.royalty_dcf_assessments set status='final' where id=current_setting('test.dcf')::uuid;
do $$ declare n int; begin
 select count(*) into n from public.royalty_dcf_assessments where id=current_setting('test.dcf')::uuid and status='final' and result=-40 and finalized_by=auth.uid() and created_by='a0000000-0000-4000-8000-000000000001'; if n<>1 then raise exception 'restore or finalization failed'; end if;
 begin update public.royalty_dcf_assessments set base_sales=1 where id=current_setting('test.dcf')::uuid; raise exception 'final modified'; exception when insufficient_privilege then null; end;
 begin delete from public.royalty_dcf_assessments where id=current_setting('test.dcf')::uuid; raise exception 'final deleted'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin begin perform * from public.royalty_dcf_cashflows('a1000000-0000-4000-8000-000000000001',current_setting('test.dcf')::uuid); raise exception 'anonymous cashflow accepted'; exception when insufficient_privilege then null; end; end $$;
do $$ begin begin perform * from public.royalty_dcf_assessments; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
rollback;
