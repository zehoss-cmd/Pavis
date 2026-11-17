begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','product-admin@example.invalid','',now(),now()),
('90000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','product-other@example.invalid','',now(),now()),
('90000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','product-viewer@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('91000000-0000-4000-8000-000000000001','Product A'),('91000000-0000-4000-8000-000000000002','Product B');
insert into public.organization_members(organization_id,user_id,role,status) values
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','admin','active'),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','admin','active'),
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003','viewer','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
insert into public.product_assets(organization_id,name,launch_year,revenue_year,revenue_amount,revenue_currency) values('91000000-0000-4000-8000-000000000001','Product',2020,2025,1234.50,'KRW') returning set_config('test.product',id::text,true);
insert into public.product_assets(organization_id,name) values('91000000-0000-4000-8000-000000000001','No revenue');
insert into public.product_assets(organization_id,name,revenue_year,revenue_amount,revenue_currency) values('91000000-0000-4000-8000-000000000001','Zero revenue',2025,0,'KRW');
insert into public.product_assets(organization_id,name,revenue_year,revenue_amount,revenue_currency) values('91000000-0000-4000-8000-000000000001','Old revenue',2024,0,'KRW');
do $$ begin
 if (select count(*) from public.product_assets where organization_id='91000000-0000-4000-8000-000000000001' and revenue_year < 2025)<>1 then raise exception 'outdated revenue filter is wrong'; end if;
end $$;
do $$ begin
 if (select count(*) from public.product_assets where organization_id='91000000-0000-4000-8000-000000000001' and revenue_amount is null)<>1 then raise exception 'missing revenue count is wrong'; end if;
 if (select count(*) from public.product_assets where organization_id='91000000-0000-4000-8000-000000000001' and revenue_amount is not null)<>3 then raise exception 'zero revenue should count as entered'; end if;
end $$;
do $$ begin begin insert into public.product_assets(organization_id,name,revenue_amount) values('91000000-0000-4000-8000-000000000001','Invalid',1); raise exception 'incomplete revenue accepted'; exception when check_violation then null; end; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
do $$ begin if exists(select 1 from public.product_assets where id=current_setting('test.product')::uuid) then raise exception 'cross organization read'; end if; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
do $$ begin if not exists(select 1 from public.product_assets where id=current_setting('test.product')::uuid) then raise exception 'viewer cannot read'; end if; begin insert into public.product_assets(organization_id,name) values('91000000-0000-4000-8000-000000000001','Denied'); raise exception 'viewer inserted'; exception when insufficient_privilege then null; end; update public.product_assets set name='Denied' where id=current_setting('test.product')::uuid; if found then raise exception 'viewer updated'; end if; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
update public.product_assets set name='Changed' where id=current_setting('test.product')::uuid;
delete from public.product_assets where id=current_setting('test.product')::uuid;
select set_config('test.trash',id::text,true) from public.registry_recycle_list('91000000-0000-4000-8000-000000000001') where record_id=current_setting('test.product')::uuid and kind='product';
select public.registry_recycle_restore('91000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid);
do $$ begin if not exists(select 1 from public.product_assets where id=current_setting('test.product')::uuid and name='Changed' and revenue_amount=1234.50 and revenue_year=2025 and revenue_currency='KRW') then raise exception 'product restore lost data'; end if; end $$;
delete from public.product_assets where id=current_setting('test.product')::uuid;
select set_config('test.trash',id::text,true) from public.registry_recycle_list('91000000-0000-4000-8000-000000000001') where record_id=current_setting('test.product')::uuid;
reset role;
update private.registry_recycle_bin set deleted_at=now()-interval '30 days' where id=current_setting('test.trash')::uuid;
set local role authenticated;
do $$ begin begin perform public.registry_recycle_restore('91000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid); raise exception 'expired product restored'; exception when no_data_found then null; end; end $$;
rollback;
