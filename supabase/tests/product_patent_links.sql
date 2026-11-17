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
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000001','Second patent','US') returning set_config('test.secondpatent',id::text,true);
insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.secondpatent')::uuid) returning set_config('test.secondlink',id::text,true);
update public.product_patent_links set contribution_rate=25.50 where id=current_setting('test.link')::uuid;
update public.product_patent_links set contribution_rate=100 where id=current_setting('test.secondlink')::uuid;
update public.product_patent_links set contribution_rate=null where id=current_setting('test.secondlink')::uuid;
update public.product_patent_links set contribution_rate=0 where id=current_setting('test.secondlink')::uuid;
do $$ begin
 if not exists(select 1 from public.product_patent_links where id=current_setting('test.link')::uuid and contribution_rate=25.50) then raise exception 'contribution was not stored';end if;
 if not exists(select 1 from public.product_patent_links where id=current_setting('test.secondlink')::uuid and contribution_rate=0) then raise exception 'zero not stored';end if;
 if (select count(*) from public.product_patent_links where product_id=current_setting('test.product')::uuid)<>2 then raise exception 'multiple patents missing';end if;
 if not exists(select 1 from public.audit_logs where organization_id='a1000000-0000-4000-8000-000000000001' and action='product.patent.contribution_updated' and target_id=current_setting('test.link')::uuid) then raise exception 'contribution audit missing';end if;
 begin update public.product_patent_links set contribution_rate=100.01 where id=current_setting('test.link')::uuid;raise exception 'over 100 accepted';exception when check_violation then null;end;
 begin update public.product_patent_links set contribution_rate=-0.01 where id=current_setting('test.link')::uuid;raise exception 'negative accepted';exception when check_violation then null;end;
 begin update public.product_patent_links set contribution_rate=1.001 where id=current_setting('test.link')::uuid;raise exception 'precision accepted';exception when check_violation then null;end;
 begin update public.product_patent_links set patent_id=current_setting('test.secondpatent')::uuid where id=current_setting('test.link')::uuid;raise exception 'patent id update allowed';exception when insufficient_privilege then null;end;
end $$;
do $$ begin
 begin insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.patent')::uuid);raise exception 'duplicate allowed';exception when unique_violation then null;end;
 begin insert into public.product_patent_links(organization_id,product_id,patent_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.otherpatent')::uuid);raise exception 'cross org allowed';exception when foreign_key_violation then null;end;
 begin delete from public.product_assets where id=current_setting('test.product')::uuid;raise exception 'linked product deleted';exception when foreign_key_violation then null;end;
 begin delete from public.patent_assets where id=current_setting('test.patent')::uuid;raise exception 'linked patent deleted';exception when foreign_key_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ begin if not exists(select 1 from public.product_patent_links where id=current_setting('test.link')::uuid and contribution_rate=25.50) then raise exception 'viewer cannot read';end if;update public.product_patent_links set contribution_rate=30 where id=current_setting('test.link')::uuid;if found then raise exception 'viewer updated contribution';end if;delete from public.product_patent_links where id=current_setting('test.link')::uuid;if found then raise exception 'viewer deleted';end if;end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ begin if exists(select 1 from public.product_patent_links where id=current_setting('test.link')::uuid) then raise exception 'cross organization read';end if;update public.product_patent_links set contribution_rate=70 where id=current_setting('test.link')::uuid;if found then raise exception 'cross organization update';end if;end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('a1000000-0000-4000-8000-000000000001','Bulk candidate','KR') returning set_config('test.bulkpatent',id::text,true);
do $$ begin
 begin
  insert into public.product_patent_links(organization_id,product_id,patent_id) values
  ('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.bulkpatent')::uuid),
  ('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.otherpatent')::uuid);
  raise exception 'bulk cross organization accepted';
 exception when foreign_key_violation then null; end;
 if exists(select 1 from public.product_patent_links where patent_id=current_setting('test.bulkpatent')::uuid) then raise exception 'cross organization batch partially inserted'; end if;
 begin
  insert into public.product_patent_links(organization_id,product_id,patent_id) values
  ('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.bulkpatent')::uuid),
  ('a1000000-0000-4000-8000-000000000001',current_setting('test.product')::uuid,current_setting('test.patent')::uuid);
  raise exception 'bulk duplicate accepted';
 exception when unique_violation then null; end;
 if exists(select 1 from public.product_patent_links where patent_id=current_setting('test.bulkpatent')::uuid) then raise exception 'duplicate batch partially inserted'; end if;
end $$;
delete from public.product_patent_links where id in(current_setting('test.link')::uuid,current_setting('test.secondlink')::uuid);
do $$ begin if not exists(select 1 from public.product_assets where id=current_setting('test.product')::uuid) or not exists(select 1 from public.patent_assets where id=current_setting('test.patent')::uuid) then raise exception 'unlink deleted asset';end if;end $$;
rollback;
