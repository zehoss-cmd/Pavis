begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('60000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','patent-a@example.invalid','',now(),now()),
('60000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','patent-b@example.invalid','',now(),now()),
('60000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','patent-viewer@example.invalid','',now(),now()),
('60000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','patent-ip@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('61000000-0000-4000-8000-000000000001','A'),('61000000-0000-4000-8000-000000000002','B');
insert into public.organization_members(organization_id,user_id,role,status) values
('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','admin','active'),
('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','admin','active'),
('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000003','viewer','active'),
('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004','ip_manager','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
insert into public.patent_families(organization_id,name) values('61000000-0000-4000-8000-000000000002','B family') returning set_config('test.family_b',id::text,true);
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
insert into public.patent_families(organization_id,name) values('61000000-0000-4000-8000-000000000001','A family') returning set_config('test.family_a',id::text,true);
insert into public.patent_assets(organization_id,family_id,title,jurisdiction,application_number,source,legal_status)
select '61000000-0000-4000-8000-000000000001',current_setting('test.family_a')::uuid,'Sample patent '||n,'KR','KR-'||n,'manual','unknown' from generate_series(1,100) n;
do $$ declare n int; begin
 select count(*) into n from public.patent_assets where organization_id='61000000-0000-4000-8000-000000000001'; if n<>100 then raise exception '100 assets not visible: %',n; end if;
 select count(*) into n from public.audit_logs where organization_id='61000000-0000-4000-8000-000000000001' and action='patent.asset.created'; if n<>100 then raise exception 'asset audit missing: %',n; end if;
 begin insert into public.patent_assets(organization_id,title,jurisdiction,application_number) values ('61000000-0000-4000-8000-000000000001','duplicate','KR','kr- 1'); raise exception 'duplicate not blocked'; exception when unique_violation then null; end;
 begin insert into public.patent_assets(organization_id,family_id,title,jurisdiction) values ('61000000-0000-4000-8000-000000000001',current_setting('test.family_b')::uuid,'cross family','KR'); raise exception 'cross-tenant family accepted'; exception when foreign_key_violation then null; end;
 begin insert into public.patent_assets(organization_id,title,jurisdiction) values ('61000000-0000-4000-8000-000000000002','wrong org','KR'); raise exception 'cross-tenant write accepted'; exception when insufficient_privilege then null; end;
 begin update public.patent_assets set organization_id='61000000-0000-4000-8000-000000000002'; raise exception 'tenant reassignment accepted'; exception when insufficient_privilege then null; end;
 begin delete from public.patent_assets; raise exception 'delete allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_assets; if n<>100 then raise exception 'viewer read failed'; end if;
 begin insert into public.patent_assets(organization_id,title,jurisdiction) values('61000000-0000-4000-8000-000000000001','viewer write','KR'); raise exception 'viewer insert accepted'; exception when insufficient_privilege then null; end;
 update public.patent_assets set title='viewer update'; get diagnostics n=row_count; if n<>0 then raise exception 'viewer update accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000004',true);
update public.patent_assets set title='IP updated' where organization_id='61000000-0000-4000-8000-000000000001' and application_number_normalized='KR-1';
do $$ declare n int; begin select count(*) into n from public.patent_assets where title='IP updated'; if n<>1 then raise exception 'IP update failed'; end if; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.patent_assets; if n<>0 then raise exception 'cross-tenant read leaked'; end if; end $$;
set local role anon;
do $$ begin begin perform * from public.patent_assets; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end; end $$;
rollback;
