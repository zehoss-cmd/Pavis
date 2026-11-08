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
insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01',1,2,3,4) returning set_config('test.valuation',id::text,true);
do $$ declare n numeric; begin
 select score into n from public.valuation_assessments where id=current_setting('test.valuation')::uuid; if n<>2.50 then raise exception 'incorrect score'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_b')::uuid,'2025-01-01',1,2,3,4); raise exception 'cross organization asset accepted'; exception when foreign_key_violation then null; end;
 begin update public.valuation_assessments set status='final' where id=current_setting('test.valuation')::uuid; raise exception 'finalization without evidence accepted'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments; if n<>0 then raise exception 'viewer can read'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01',1,2,3,4); raise exception 'viewer insert accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments; if n<>0 then raise exception 'cross tenant leak'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
update public.valuation_assessments set legal_note='legal',technical_note='technical',market_note='market',commercial_note='commercial' where id=current_setting('test.valuation')::uuid;
delete from public.valuation_assessments where id=current_setting('test.valuation')::uuid;
select set_config('test.valuation_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='valuation' and record_id=current_setting('test.valuation')::uuid and name='Patent A · 2025-01-01';
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation_trash')::uuid);
update public.valuation_assessments set status='final' where id=current_setting('test.valuation')::uuid;
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments where id=current_setting('test.valuation')::uuid and status='final' and finalized_by=auth.uid() and created_by='a0000000-0000-4000-8000-000000000001' and score=2.50; if n<>1 then raise exception 'restoration or finalization failed'; end if;
 begin update public.valuation_assessments set legal_score=0 where id=current_setting('test.valuation')::uuid; raise exception 'final updated'; exception when insufficient_privilege then null; end;
 begin delete from public.valuation_assessments where id=current_setting('test.valuation')::uuid; raise exception 'final deleted'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin begin perform * from public.valuation_assessments; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
rollback;
