-- Integration flow for a disposable database. Every fixture is rolled back.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('b0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow-admin@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow-other@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow-viewer@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow-ip@example.invalid','',now(),now());

-- Create two organizations using the application function as their respective administrators.
set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
select set_config('test.flow_org_a',public.create_organization('Flow A')::text,true);
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
select set_config('test.flow_org_b',public.create_organization('Flow B')::text,true);
reset role;
insert into public.organization_members(organization_id,user_id,role,status) values
(current_setting('test.flow_org_a')::uuid,'b0000000-0000-4000-8000-000000000003','viewer','active'),
(current_setting('test.flow_org_a')::uuid,'b0000000-0000-4000-8000-000000000004','ip_manager','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);

-- Create and edit an asset, then link it to a portfolio.
insert into public.patent_assets(organization_id,title,jurisdiction,application_number)
 values(current_setting('test.flow_org_a')::uuid,'Flow patent','KR','FLOW-2026-001')
 returning set_config('test.flow_asset',id::text,true);
update public.patent_assets set title='Flow patent updated' where id=current_setting('test.flow_asset')::uuid;
insert into public.patent_portfolios(organization_id,name)
 values(current_setting('test.flow_org_a')::uuid,'Flow portfolio') returning set_config('test.flow_portfolio',id::text,true);
insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id)
 values(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_portfolio')::uuid,current_setting('test.flow_asset')::uuid);

do $$ declare n int; begin
 select count(*) into n from public.patent_assets where id=current_setting('test.flow_asset')::uuid and title='Flow patent updated';
 if n<>1 then raise exception 'updated patent not found'; end if;
 begin delete from public.patent_assets where id=current_setting('test.flow_asset')::uuid; raise exception 'linked patent deleted'; exception when foreign_key_violation then null; end;
end $$;

-- Viewer can see the asset and its link but cannot change either.
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_portfolio_assets where asset_id=current_setting('test.flow_asset')::uuid;
 if n<>1 then raise exception 'viewer cannot see portfolio link'; end if;
 update public.patent_assets set title='viewer edit' where id=current_setting('test.flow_asset')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'viewer modified patent'; end if;
 delete from public.patent_portfolio_assets where asset_id=current_setting('test.flow_asset')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'viewer removed portfolio link'; end if;
end $$;

-- An administrator of a different organization cannot see the first organization's records.
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
 select count(*) into n from public.patent_assets where id=current_setting('test.flow_asset')::uuid;
 if n<>0 then raise exception 'cross-organization patent visible'; end if;
 select count(*) into n from public.patent_portfolio_assets where asset_id=current_setting('test.flow_asset')::uuid;
 if n<>0 then raise exception 'cross-organization portfolio link visible'; end if;
end $$;

-- IP manager unlinks and deletes the asset; the administrator restores it.
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000004',true);
delete from public.patent_portfolio_assets where organization_id=current_setting('test.flow_org_a')::uuid and asset_id=current_setting('test.flow_asset')::uuid;
delete from public.patent_assets where organization_id=current_setting('test.flow_org_a')::uuid and id=current_setting('test.flow_asset')::uuid;
select set_config('test.flow_trash',id::text,true) from public.registry_recycle_list(current_setting('test.flow_org_a')::uuid) where kind='asset' and record_id=current_setting('test.flow_asset')::uuid;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
select public.registry_recycle_restore(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_trash')::uuid);
do $$ declare n int; begin
 select count(*) into n from public.patent_assets where id=current_setting('test.flow_asset')::uuid and title='Flow patent updated' and application_number='FLOW-2026-001';
 if n<>1 then raise exception 'restored patent data changed'; end if;
 select count(*) into n from public.patent_portfolio_assets where asset_id=current_setting('test.flow_asset')::uuid;
 if n<>0 then raise exception 'portfolio link unexpectedly restored'; end if;
end $$;
insert into public.patent_portfolio_assets(organization_id,portfolio_id,asset_id)
 values(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_portfolio')::uuid,current_setting('test.flow_asset')::uuid);

-- Record and finalize both existing assessment types, then check export snapshots.
insert into public.valuation_assessments(organization_id,asset_id,assessment_date,legal_score,technical_score,market_score,commercial_score)
 values(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_asset')::uuid,'2026-01-01',1,2,3,4)
 returning set_config('test.flow_quality',id::text,true);
update public.valuation_assessments set legal_note='legal',technical_note='technical',market_note='market',commercial_note='commercial',status='final' where id=current_setting('test.flow_quality')::uuid;
insert into public.royalty_dcf_assessments(organization_id,asset_id,valuation_date,scenario,currency,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate)
 values(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_asset')::uuid,'2026-01-01','base','KRW',2,1000,0,10,100,20,25,20)
 returning set_config('test.flow_dcf',id::text,true);
update public.royalty_dcf_assessments set assumptions='Test evidence',status='final' where id=current_setting('test.flow_dcf')::uuid;
do $$ declare q jsonb; d jsonb; begin
 q:=public.qualitative_export_snapshot(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_quality')::uuid);
 d:=public.royalty_dcf_export_snapshot(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_dcf')::uuid);
 if q is null or q->>'weighted_score'<>'2.50' then raise exception 'qualitative snapshot incorrect'; end if;
 if d is null or d->>'result'<>'91.67' then raise exception 'DCF snapshot incorrect'; end if;
 delete from public.patent_portfolio_assets where asset_id=current_setting('test.flow_asset')::uuid and portfolio_id=current_setting('test.flow_portfolio')::uuid;
 begin delete from public.patent_assets where id=current_setting('test.flow_asset')::uuid; raise exception 'patent with final assessments deleted'; exception when foreign_key_violation then null; end;
end $$;

-- Reassessment creates independent drafts linked to the finalized records.
select set_config('test.flow_quality_copy',public.copy_qualitative_assessment(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_quality')::uuid)::text,true);
select set_config('test.flow_dcf_copy',public.copy_royalty_dcf_assessment(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_dcf')::uuid,'optimistic')::text,true);
do $$ declare n int; begin
 select count(*) into n from public.valuation_assessments where id=current_setting('test.flow_quality_copy')::uuid and status='draft' and copied_from_id=current_setting('test.flow_quality')::uuid;
 if n<>1 then raise exception 'qualitative reassessment not a linked draft'; end if;
 select count(*) into n from public.royalty_dcf_assessments where id=current_setting('test.flow_dcf_copy')::uuid and status='draft' and copied_from_id=current_setting('test.flow_dcf')::uuid;
 if n<>1 then raise exception 'DCF reassessment not a linked draft'; end if;
end $$;

-- A different organization cannot export the finalized assessments.
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
do $$ begin
 if public.qualitative_export_snapshot(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_quality')::uuid) is not null then raise exception 'cross-organization qualitative export'; end if;
 if public.royalty_dcf_export_snapshot(current_setting('test.flow_org_a')::uuid,current_setting('test.flow_dcf')::uuid) is not null then raise exception 'cross-organization DCF export'; end if;
end $$;
rollback;
