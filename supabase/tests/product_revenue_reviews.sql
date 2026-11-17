begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('b0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revenue-admin@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revenue-operator@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revenue-outsider@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','revenue-viewer@example.invalid','',now(),now());
insert into private.revenue_reviewers(user_id) values('b0000000-0000-4000-8000-000000000002');
insert into public.organizations(id,name) values ('b1000000-0000-4000-8000-000000000001','Review A');
insert into public.organization_members(organization_id,user_id,role,status) values
('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','admin','active'),
('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004','viewer','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
insert into public.product_assets(organization_id,name,revenue_year,revenue_amount,revenue_currency) values('b1000000-0000-4000-8000-000000000001','Review product',2025,1234,'KRW') returning set_config('test.review_product',id::text,true);
select set_config('test.review_request',public.request_product_revenue_review('b1000000-0000-4000-8000-000000000001',current_setting('test.review_product')::uuid,'매출 집계 문서')::text,true);
do $$ begin
 begin perform public.request_product_revenue_review('b1000000-0000-4000-8000-000000000001',current_setting('test.review_product')::uuid,'중복');raise exception 'duplicate allowed';exception when unique_violation then null;end;
 begin perform public.decide_product_revenue_review(current_setting('test.review_request')::uuid,'reviewed','위조');raise exception 'non-reviewer approved';exception when insufficient_privilege then null;end;
 begin update public.product_revenue_reviews set status='reviewed' where id=current_setting('test.review_request')::uuid;raise exception 'direct update allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000003',true);
do $$ begin if exists(select 1 from public.product_revenue_reviews where id=current_setting('test.review_request')::uuid) then raise exception 'outsider read';end if;begin perform public.request_product_revenue_review('b1000000-0000-4000-8000-000000000001',current_setting('test.review_product')::uuid,'위조');raise exception 'outsider requested';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000004',true);
do $$ begin if not exists(select 1 from public.product_revenue_reviews where id=current_setting('test.review_request')::uuid) then raise exception 'viewer cannot read';end if;begin perform public.request_product_revenue_review('b1000000-0000-4000-8000-000000000001',current_setting('test.review_product')::uuid,'위조');raise exception 'viewer requested';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
do $$ begin if not exists(select 1 from public.product_revenue_reviews where id=current_setting('test.review_request')::uuid and evidence='매출 집계 문서') then raise exception 'reviewer cannot read request';end if;if exists(select 1 from public.product_assets where id=current_setting('test.review_product')::uuid) then raise exception 'reviewer can read all product data';end if;end $$;
select public.decide_product_revenue_review(current_setting('test.review_request')::uuid,'reviewed','제출 근거 확인');
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
do $$ begin if not exists(select 1 from public.product_revenue_reviews where id=current_setting('test.review_request')::uuid and status='reviewed' and review_note='제출 근거 확인') then raise exception 'decision missing';end if;end $$;
update public.product_assets set revenue_amount=4321 where id=current_setting('test.review_product')::uuid;
update public.product_assets set revenue_amount=1234 where id=current_setting('test.review_product')::uuid;
do $$ begin if (select revenue_revision from public.product_assets where id=current_setting('test.review_product')::uuid)<>2 then raise exception 'revision was not monotonic';end if;end $$;
select set_config('test.review_pending',public.request_product_revenue_review('b1000000-0000-4000-8000-000000000001',current_setting('test.review_product')::uuid,'새 근거')::text,true);
update public.product_assets set revenue_amount=5678 where id=current_setting('test.review_product')::uuid;
do $$ begin if not exists(select 1 from public.product_revenue_reviews where id=current_setting('test.review_pending')::uuid and status='superseded') then raise exception 'pending not invalidated';end if;end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
do $$ begin begin perform public.decide_product_revenue_review(current_setting('test.review_pending')::uuid,'reviewed','오래됨');raise exception 'stale decision allowed';exception when no_data_found then null;end;end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
delete from public.product_assets where id=current_setting('test.review_product')::uuid;
select set_config('test.review_trash',id::text,true) from public.registry_recycle_list('b1000000-0000-4000-8000-000000000001') where record_id=current_setting('test.review_product')::uuid;
select public.registry_recycle_restore('b1000000-0000-4000-8000-000000000001',current_setting('test.review_trash')::uuid);
do $$ begin if (select revenue_revision from public.product_assets where id=current_setting('test.review_product')::uuid)<>3 then raise exception 'restore lost revision';end if;if (select count(*) from public.product_revenue_reviews where product_id=current_setting('test.review_product')::uuid)<>2 then raise exception 'restore lost review history';end if;end $$;
update public.product_assets set name='Renamed product' where id=current_setting('test.review_product')::uuid;
do $$ begin if (select revenue_revision from public.product_assets where id=current_setting('test.review_product')::uuid)<>4 then raise exception 'name change did not invalidate review';end if;end $$;
rollback;
