begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('c0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','map-a@example.invalid','',now(),now()),
('c0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','map-b@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('c1000000-0000-4000-8000-000000000001','Map A'),('c1000000-0000-4000-8000-000000000002','Map B');
insert into public.organization_members(organization_id,user_id,role,status) values
('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','admin','active'),
('c1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','admin','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',true);
insert into public.patent_families(organization_id,name) values('c1000000-0000-4000-8000-000000000001','Family A') returning set_config('test.map_family',id::text,true);
insert into public.patent_assets(organization_id,family_id,title,jurisdiction,application_number,registration_number,legal_status) values
('c1000000-0000-4000-8000-000000000001',current_setting('test.map_family')::uuid,'K1','KR','K1','R1','granted'),
('c1000000-0000-4000-8000-000000000001',current_setting('test.map_family')::uuid,'K2','KR','K2',null,'pending'),
('c1000000-0000-4000-8000-000000000001',null,'U1','US',null,null,'unknown');
do $$ declare r record; n int; begin
 select * into r from public.patent_geography_summary('c1000000-0000-4000-8000-000000000001',null) where jurisdiction='KR';
 if r.total<>2 or r.applications<>2 or r.registrations<>1 or r.pending_count<>1 or r.granted_count<>1 then raise exception 'country summary incorrect'; end if;
 select count(*) into n from public.patent_geography_summary('c1000000-0000-4000-8000-000000000001',current_setting('test.map_family')::uuid); if n<>1 then raise exception 'family filter incorrect'; end if;
end $$;
insert into public.patent_assets(organization_id,title,jurisdiction) select 'c1000000-0000-4000-8000-000000000001','Bulk '||n,'JP' from generate_series(1,1101) n;
do $$ declare n bigint; begin
 select total into n from public.patent_geography_summary('c1000000-0000-4000-8000-000000000001',null) where jurisdiction='JP'; if n<>1101 then raise exception 'large country count truncated'; end if;
end $$;
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_geography_summary('c1000000-0000-4000-8000-000000000001',null); if n<>0 then raise exception 'cross organization summary leak'; end if;
end $$;
set local role anon;
do $$ begin begin perform * from public.patent_geography_summary('c1000000-0000-4000-8000-000000000001',null); raise exception 'anonymous map read allowed'; exception when insufficient_privilege then null; end; end $$;
rollback;
