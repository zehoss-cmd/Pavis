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
insert into public.valuation_models(organization_id,name,version,legal_weight,technical_weight,market_weight,commercial_weight) values('a1000000-0000-4000-8000-000000000001','Test','v1',40,30,20,10) returning set_config('test.model',id::text,true);
do $$ begin
 begin insert into public.valuation_models(organization_id,name,version,legal_weight,technical_weight,market_weight,commercial_weight) values('a1000000-0000-4000-8000-000000000001','Bad','v1',25,25,25,24); raise exception 'invalid weights accepted'; exception when check_violation then null; end;
 begin update public.valuation_models set legal_weight=25 where id=current_setting('test.model')::uuid; raise exception 'model updated'; exception when insufficient_privilege then null; end;
 begin delete from public.valuation_models where id=current_setting('test.model')::uuid; raise exception 'model deleted'; exception when insufficient_privilege then null; end;
end $$;
insert into public.valuation_assessments(organization_id,asset_id,model_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,current_setting('test.model')::uuid,'2025-01-01',1,2,3,4) returning set_config('test.assessment',id::text,true);
do $$ declare s jsonb; begin s:=public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.assessment')::uuid); if s->>'model_name'<>'Test' or s->>'model_revision'<>'v1' or s->'criteria'->0->>'weight'<>'40' or s->>'weighted_score'<>'2.00' then raise exception 'custom model export incorrect %',s; end if; end $$;
select set_config('test.custom_copy',public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.assessment')::uuid)::text,true);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments where id=current_setting('test.custom_copy')::uuid and model_id=current_setting('test.model')::uuid and legal_weight=40 and weighted_score=2 and copied_from_snapshot->>'model_name'='Test' and copied_from_snapshot->>'model_revision'='v1'; if n<>1 then raise exception 'custom model copy incorrect'; end if; end $$;
do $$ declare n numeric; begin select weighted_score into n from public.valuation_assessments where id=current_setting('test.assessment')::uuid; if n<>2 then raise exception 'wrong score %',n; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
 select count(*) into n from public.valuation_models; if n<>0 then raise exception 'cross tenant model leaked'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,model_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000002',current_setting('test.event_asset_b')::uuid,current_setting('test.model')::uuid,'2025-01-01',1,2,3,4); raise exception 'cross tenant model accepted'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin select count(*) into n from public.valuation_models; if n<>0 then raise exception 'viewer sees model'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
delete from public.valuation_assessments where id=current_setting('test.assessment')::uuid;
select set_config('test.trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='valuation' and record_id=current_setting('test.assessment')::uuid;
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.trash')::uuid);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments where id=current_setting('test.assessment')::uuid and model_id=current_setting('test.model')::uuid and weighted_score=2; if n<>1 then raise exception 'restoration lost model'; end if; end $$;
reset role;
insert into public.organizations(id,name) values ('a1000000-0000-4000-8000-000000000003','Model-only organization');
insert into public.organization_members(organization_id,user_id,role,status) values ('a1000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','admin','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.valuation_models(organization_id,name,version,legal_weight,technical_weight,market_weight,commercial_weight) values('a1000000-0000-4000-8000-000000000003','Restorable','v1',25,25,25,25) returning set_config('test.restore_model',id::text,true);
select public.delete_empty_organization('a1000000-0000-4000-8000-000000000003');
select set_config('test.org_recycle',id::text,true) from public.deleted_organizations() where name='Model-only organization';
select public.restore_deleted_organization(current_setting('test.org_recycle')::uuid);
do $$ declare n int; begin select count(*) into n from public.valuation_models where id=current_setting('test.restore_model')::uuid and name='Restorable' and created_by=auth.uid(); if n<>1 then raise exception 'organization restoration lost model'; end if; end $$;
set local role anon;
do $$ begin begin perform * from public.valuation_models; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
rollback;
