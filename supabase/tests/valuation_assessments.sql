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
do $$ declare s jsonb; begin
 s:=public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid);
 if s->>'weighted_score'<>'2.50' or s->>'model_name'<>'기본 모델' or s->'criteria'->0->>'score'<>'1' or s->'criteria'->0->>'weight'<>'25' then raise exception 'incorrect qualitative export %',s; end if;
 if public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000002',current_setting('test.valuation')::uuid) is not null then raise exception 'wrong organization export'; end if;
end $$;
do $$ declare n numeric; begin
 select score into n from public.valuation_assessments where id=current_setting('test.valuation')::uuid; if n<>2.50 then raise exception 'incorrect score'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_b')::uuid,'2025-01-01',1,2,3,4); raise exception 'cross organization asset accepted'; exception when foreign_key_violation then null; end;
 begin update public.valuation_assessments set status='final' where id=current_setting('test.valuation')::uuid; raise exception 'finalization without evidence accepted'; exception when check_violation then null; end;
end $$;
select set_config('test.copy',public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid)::text,true);
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments where id=current_setting('test.copy')::uuid and status='draft' and copied_from_id=current_setting('test.valuation')::uuid and copied_from_snapshot->>'weighted_score'='2.50' and copied_from_snapshot->'criteria'->0->>'score'='1' and copied_from_snapshot->'criteria'->0->>'weight'='25'; if n<>1 then raise exception 'copy provenance incorrect'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score,copied_from_id) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01',1,2,3,4,current_setting('test.valuation')::uuid); raise exception 'provenance spoofed'; exception when insufficient_privilege then null; end;
 begin update public.valuation_assessments set copied_from_id=null where id=current_setting('test.copy')::uuid; raise exception 'provenance changed'; exception when insufficient_privilege then null; end;
 update public.valuation_assessments set legal_score=5,legal_note='새 근거' where id=current_setting('test.copy')::uuid;
 select count(*) into n from public.valuation_assessments where id=current_setting('test.valuation')::uuid and legal_score=1 and weighted_score=2.50; if n<>1 then raise exception 'copy changed original'; end if;
end $$;
delete from public.valuation_assessments where id=current_setting('test.copy')::uuid;
select set_config('test.copy_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='valuation' and record_id=current_setting('test.copy')::uuid;
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.copy_trash')::uuid);
do $$ declare n int;s jsonb; begin
 select count(*) into n from public.valuation_assessments where id=current_setting('test.copy')::uuid and copied_from_id=current_setting('test.valuation')::uuid and copied_from_snapshot->'criteria'->0->>'score'='1' and legal_score=5; if n<>1 then raise exception 'restored copy lost provenance'; end if;
 s:=public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.copy')::uuid); if s->>'copied_from_id'<>current_setting('test.valuation') or s->'copied_from_snapshot'->'criteria'->0->>'score'<>'1' then raise exception 'export lost provenance'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments; if n<>0 then raise exception 'viewer can read'; end if;
 if public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid) is not null then raise exception 'viewer sees export'; end if;
 if public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid) is not null then raise exception 'viewer copied'; end if;
 begin insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score) values('a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2025-01-01',1,2,3,4); raise exception 'viewer insert accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments; if n<>0 then raise exception 'cross tenant leak'; end if; if public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid) is not null then raise exception 'cross tenant export leak'; end if; if public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid) is not null then raise exception 'cross tenant copy'; end if; end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000004',true);
update public.valuation_assessments set legal_note='legal',technical_note='technical',market_note='market',commercial_note='commercial' where id=current_setting('test.valuation')::uuid;
delete from public.valuation_assessments where id=current_setting('test.valuation')::uuid;
do $$ declare n int; begin select count(*) into n from public.valuation_assessments where id=current_setting('test.copy')::uuid and copied_from_id=current_setting('test.valuation')::uuid and copied_from_snapshot->>'weighted_score'='2.50'; if n<>1 then raise exception 'source deletion lost provenance'; end if; end $$;
select set_config('test.valuation_trash',id::text,true) from public.registry_recycle_list('a1000000-0000-4000-8000-000000000001') where kind='valuation' and record_id=current_setting('test.valuation')::uuid and name='Patent A · 2025-01-01';
select public.registry_recycle_restore('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation_trash')::uuid);
update public.valuation_assessments set status='final' where id=current_setting('test.valuation')::uuid;
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments where id=current_setting('test.valuation')::uuid and status='final' and finalized_by=auth.uid() and created_by='a0000000-0000-4000-8000-000000000001' and score=2.50; if n<>1 then raise exception 'restoration or finalization failed'; end if;
 begin update public.valuation_assessments set legal_score=0 where id=current_setting('test.valuation')::uuid; raise exception 'final updated'; exception when insufficient_privilege then null; end;
 begin delete from public.valuation_assessments where id=current_setting('test.valuation')::uuid; raise exception 'final deleted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('test.final_copy',public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid)::text,true);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments where id=current_setting('test.final_copy')::uuid and status='draft' and finalized_at is null and copied_from_snapshot->>'status'='final' and copied_from_snapshot->'criteria'->0->>'note'='legal' and created_by=auth.uid(); if n<>1 then raise exception 'copy of final not a fresh draft'; end if; end $$;
-- Pagination uses an inclusive look-ahead row and a unique secondary ordering.
insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score)
select 'a1000000-0000-4000-8000-000000000001',current_setting('test.event_asset_a')::uuid,'2030-01-01',1,2,3,4 from generate_series(1,26);
do $$ declare first_count int; next_count int; overlap_count int; begin
 select count(*) into first_count from (select id from public.valuation_assessments where organization_id='a1000000-0000-4000-8000-000000000001' and assessment_date='2030-01-01' order by assessment_date desc,id desc limit 26 offset 0) p;
 select count(*) into next_count from (select id from public.valuation_assessments where organization_id='a1000000-0000-4000-8000-000000000001' and assessment_date='2030-01-01' order by assessment_date desc,id desc limit 26 offset 25) p;
 select count(*) into overlap_count from (select id from public.valuation_assessments where organization_id='a1000000-0000-4000-8000-000000000001' and assessment_date='2030-01-01' order by assessment_date desc,id desc limit 25 offset 0) a join (select id from public.valuation_assessments where organization_id='a1000000-0000-4000-8000-000000000001' and assessment_date='2030-01-01' order by assessment_date desc,id desc limit 25 offset 25) b using(id);
 if first_count<>26 or next_count<>1 or overlap_count<>0 then raise exception 'assessment pagination boundary failed'; end if;
end $$;
-- The assessment picker can search and page more than 25 matching assets.
insert into public.patent_assets(organization_id,title,jurisdiction)
select 'a1000000-0000-4000-8000-000000000001','Picker search sample','KR' from generate_series(1,26);
do $$ declare first_count int; next_count int; overlap_count int; begin
 select count(*) into first_count from (select id from public.patent_assets where organization_id='a1000000-0000-4000-8000-000000000001' and title ilike '%picker search%' order by title,id limit 26 offset 0) p;
 select count(*) into next_count from (select id from public.patent_assets where organization_id='a1000000-0000-4000-8000-000000000001' and title ilike '%picker search%' order by title,id limit 26 offset 25) p;
 select count(*) into overlap_count from (select id from public.patent_assets where organization_id='a1000000-0000-4000-8000-000000000001' and title ilike '%picker search%' order by title,id limit 25 offset 0) a join (select id from public.patent_assets where organization_id='a1000000-0000-4000-8000-000000000001' and title ilike '%picker search%' order by title,id limit 25 offset 25) b using(id);
 if first_count<>26 or next_count<>1 or overlap_count<>0 then raise exception 'assessment asset picker pagination failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.valuation_assessments where organization_id='a1000000-0000-4000-8000-000000000001' and assessment_date='2030-01-01'; if n<>0 then raise exception 'paginated records leak across organizations'; end if; select count(*) into n from public.patent_assets where organization_id='a1000000-0000-4000-8000-000000000001' and title ilike '%picker search%'; if n<>0 then raise exception 'assessment asset search leaks across organizations'; end if; end $$;
set local role anon;
do $$ begin begin perform public.copy_qualitative_assessment('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid); raise exception 'anonymous copy accepted'; exception when insufficient_privilege then null; end; end $$;
do $$ begin begin perform public.qualitative_export_snapshot('a1000000-0000-4000-8000-000000000001',current_setting('test.valuation')::uuid); raise exception 'anonymous export accepted'; exception when insufficient_privilege then null; end; end $$;
do $$ begin begin perform * from public.valuation_assessments; raise exception 'anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
rollback;
