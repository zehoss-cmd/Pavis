begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('80000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recycle-admin@example.invalid','',now(),now()),
('80000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recycle-other@example.invalid','',now(),now()),
('80000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recycle-viewer@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('81000000-0000-4000-8000-000000000001','Recycle A'),('81000000-0000-4000-8000-000000000002','Recycle B');
insert into public.organization_members(organization_id,user_id,role,status) values
('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','admin','active'),
('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000002','admin','active'),
('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000003','viewer','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
insert into public.patent_assets(organization_id,title,jurisdiction,application_number) values('81000000-0000-4000-8000-000000000001','Restorable','KR','QA-123') returning set_config('test.asset',id::text,true);
delete from public.patent_assets where id=current_setting('test.asset')::uuid;
select set_config('test.trash',id::text,true) from public.registry_recycle_list('81000000-0000-4000-8000-000000000001') where record_id=current_setting('test.asset')::uuid;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
do $$ begin begin perform * from public.registry_recycle_list('81000000-0000-4000-8000-000000000001'); raise exception 'viewer listed recycle'; exception when insufficient_privilege then null; end; begin perform public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid); raise exception 'viewer restored'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$ begin begin perform public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid); raise exception 'other organization restored'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
select public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid);
do $$ declare n int; begin select count(*) into n from public.patent_assets where id=current_setting('test.asset')::uuid and title='Restorable' and created_by='80000000-0000-4000-8000-000000000001'; if n<>1 then raise exception 'restore lost data'; end if; select count(*) into n from public.registry_recycle_list('81000000-0000-4000-8000-000000000001'); if n<>0 then raise exception 'restored record still in trash'; end if; select count(*) into n from public.audit_logs where organization_id='81000000-0000-4000-8000-000000000001' and action='patent.asset.restored'; if n<>1 then raise exception 'restore audit missing'; end if; end $$;
delete from public.patent_assets where id=current_setting('test.asset')::uuid;
select set_config('test.trash',id::text,true) from public.registry_recycle_list('81000000-0000-4000-8000-000000000001') where record_id=current_setting('test.asset')::uuid;
insert into public.patent_assets(organization_id,title,jurisdiction,application_number) values('81000000-0000-4000-8000-000000000001','Duplicate','KR','qa-123');
do $$ begin begin perform public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid); raise exception 'duplicate restored'; exception when unique_violation then null; end; end $$;
reset role;
update private.registry_recycle_bin set deleted_at=now()-interval '30 days' where id=current_setting('test.trash')::uuid;
set local role authenticated;
do $$ begin begin perform public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid); raise exception 'expired record restored'; exception when no_data_found then null; end; end $$;
insert into public.patent_families(organization_id,name) values('81000000-0000-4000-8000-000000000001','Family test') returning set_config('test.family',id::text,true);
insert into public.patent_assets(organization_id,family_id,title,jurisdiction) values('81000000-0000-4000-8000-000000000001',current_setting('test.family')::uuid,'Family asset','KR') returning set_config('test.family_asset',id::text,true);
delete from public.patent_assets where id=current_setting('test.family_asset')::uuid;
delete from public.patent_families where id=current_setting('test.family')::uuid;
select set_config('test.asset_trash',id::text,true) from public.registry_recycle_list('81000000-0000-4000-8000-000000000001') where record_id=current_setting('test.family_asset')::uuid;
select set_config('test.family_trash',id::text,true) from public.registry_recycle_list('81000000-0000-4000-8000-000000000001') where record_id=current_setting('test.family')::uuid;
do $$ begin begin perform public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.asset_trash')::uuid); raise exception 'asset restored without family'; exception when foreign_key_violation then null; end; end $$;
select public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.family_trash')::uuid);
select public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.asset_trash')::uuid);
insert into public.patent_portfolios(organization_id,name,description) values('81000000-0000-4000-8000-000000000001','Portfolio test','QA') returning set_config('test.portfolio',id::text,true);
delete from public.patent_portfolios where id=current_setting('test.portfolio')::uuid;
select set_config('test.port_trash',id::text,true) from public.registry_recycle_list('81000000-0000-4000-8000-000000000001') where record_id=current_setting('test.portfolio')::uuid;
select public.registry_recycle_restore('81000000-0000-4000-8000-000000000001',current_setting('test.port_trash')::uuid);
do $$ declare n int; begin select count(*) into n from public.patent_portfolios where id=current_setting('test.portfolio')::uuid and description='QA'; if n<>1 then raise exception 'portfolio restore failed'; end if; end $$;
reset role;
do $$ declare n int; begin select count(*) into n from cron.job where jobname='pavis-registry-recycle-purge'; if n<>1 then raise exception 'cleanup job missing'; end if; end $$;
rollback;
