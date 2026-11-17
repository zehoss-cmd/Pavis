begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','link-admin@example.invalid','',now(),now()),
('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','link-other@example.invalid','',now(),now()),
('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','link-viewer@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('a1000000-0000-4000-8000-000000000001','Links A'),('a1000000-0000-4000-8000-000000000002','Links B');
insert into public.organization_members(organization_id,user_id,role,status) values
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','admin','active'),
('a1000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','admin','active'),
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','viewer','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000002','Other patent','KR') returning set_config('test.otherpatent',id::text,true);
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.product_assets(organization_id,name) values('a1000000-0000-4000-8000-000000000001','Test product') returning set_config('test.product',id::text,true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000001','Test patent','KR') returning set_config('test.patent',id::text,true);
insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.patent')::uuid) returning set_config('test.link',id::text,true);
do $$ begin
 begin insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.patent')::uuid);raise exception 'duplicate allowed';exception when unique_violation then null;end;
 begin insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.otherpatent')::uuid);raise exception 'cross org allowed';exception when foreign_key_violation then null;end;
 begin delete from public.product_assets where id=current_setting('test.product')::uuid;raise exception 'linked product deleted';exception when foreign_key_violation then null;end;
 begin delete from public.patent_assets where id=current_setting('test.patent')::uuid;raise exception 'linked patent deleted';exception when foreign_key_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ begin if not exists(select 1 from public.product_patent_links where id=current_setting('test.link')::uuid) then raise exception 'viewer cannot read';end if;delete from public.product_patent_links where id=current_setting('test.link')::uuid;if found then raise exception 'viewer deleted';end if;end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ begin if exists(select 1 from public.product_patent_links where id=current_setting('test.link')::uuid) then raise exception 'cross organization read';end if;end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
delete from public.product_patent_links where id=current_setting('test.link')::uuid;
do $$ begin if not exists(select 1 from public.product_assets where id=current_setting('test.product')::uuid) or not exists(select 1 from public.patent_assets where id=current_setting('test.patent')::uuid) then raise exception 'unlink deleted asset';end if;end $$;
rollback;
