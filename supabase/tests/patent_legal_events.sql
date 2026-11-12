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
insert into public.patent_legal_events(organization_id,asset_id,event_date,legal_status,source,verified_date,note) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01','granted','공보','2025-01-02','검토') returning set_config('test.event_id',id::text,true);
do $$ declare n int; begin
 select count(*) into n from public.patent_assets where id=current_setting('test.event_asset_a')::uuid and legal_status='unknown'; if n<>1 then raise exception 'current status changed automatically'; end if;
 begin insert into public.patent_legal_events(organization_id,asset_id,event_date,legal_status) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_b')::uuid,'2025-01-01','granted'); raise exception 'cross organization asset accepted'; exception when foreign_key_violation then null; end;
 begin delete from public.patent_assets where id=current_setting('test.event_asset_a')::uuid; raise exception 'asset with history deleted'; exception when foreign_key_violation then null; end;
 begin update public.patent_legal_events set asset_id=current_setting('test.event_asset_b')::uuid; raise exception 'asset reassignment accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_legal_events; if n<>1 then raise exception 'viewer cannot read'; end if;
 begin insert into public.patent_legal_events(organization_id,asset_id,event_date,legal_status) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01','pending'); raise exception 'viewer insert accepted'; exception when insufficient_privilege then null; end;
 update public.patent_legal_events set source='viewer'; get diagnostics n=row_count; if n<>0 then raise exception 'viewer update accepted'; end if;
 delete from public.patent_legal_events; get diagnostics n=row_count; if n<>0 then raise exception 'viewer delete accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.patent_legal_events; if n<>0 then raise exception 'cross tenant history leaked'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
update public.patent_legal_events set note='updated' where id=current_setting('test.event_id')::uuid;
delete from public.patent_legal_events where id=current_setting('test.event_id')::uuid;
select set_config('test.event_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='legal_event' and record_id=current_setting('test.event_id')::uuid and name='Patent A · 2025-01-01';
delete from public.patent_assets where id=current_setting('test.event_asset_a')::uuid;
select set_config('test.asset_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='asset' and record_id=current_setting('test.event_asset_a')::uuid;
do $$ begin begin perform public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.event_trash')::uuid); raise exception 'history restored without patent'; exception when foreign_key_violation then null; end; end $$;
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.asset_trash')::uuid);
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.event_trash')::uuid);
do $$ declare n int; begin select count(*) into n from public.patent_legal_events where id=current_setting('test.event_id')::uuid and note='updated' and source='공보' and created_by='a0000000-0000-4000-8000-000000000001'; if n<>1 then raise exception 'history restoration lost data'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ declare n int; begin select count(*) into n from public.audit_logs where organization_id='a1000000-0000-4000-8000-000000000001' and action in ('patent.legal_event.created','patent.legal_event.updated','patent.legal_event.deleted','patent.legal_event.restored'); if n<>5 then raise exception 'history audit missing: %',n; end if; end $$;
-- Verify stable same-date page boundaries and tenant isolation for history.
insert into public.patent_legal_events(organization_id,asset_id,event_date,legal_status)
select 'a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2030-01-01','pending' from generate_series(1,26);
do $$ declare first_count int; next_count int; overlap_count int; begin
 select count(*) into first_count from (select id from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and asset_id=current_setting('test.event_asset_a')::uuid and event_date='2030-01-01' order by event_date desc,id desc limit 26 offset 0) p;
 select count(*) into next_count from (select id from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and asset_id=current_setting('test.event_asset_a')::uuid and event_date='2030-01-01' order by event_date desc,id desc limit 26 offset 25) p;
 select count(*) into overlap_count from (select id from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and asset_id=current_setting('test.event_asset_a')::uuid and event_date='2030-01-01' order by event_date desc,id desc limit 25 offset 0) a join (select id from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and asset_id=current_setting('test.event_asset_a')::uuid and event_date='2030-01-01' order by event_date desc,id desc limit 25 offset 25) b using(id);
 if first_count<>26 or next_count<>1 or overlap_count<>0 then raise exception 'legal event page boundary failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin select count(*) into n from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and event_date='2030-01-01'; if n<>26 then raise exception 'viewer cannot read paged history'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.patent_legal_events where organization_id='a1000000-0000-4000-8000-000000000001' and event_date='2030-01-01'; if n<>0 then raise exception 'paged history leaks across organizations'; end if; end $$;
set local role anon;
do $$ begin begin perform * from public.patent_legal_events; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
rollback;
