begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','orgdelete-admin@example.invalid','',now(),now()),
('90000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','orgdelete-viewer@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('91000000-0000-4000-8000-000000000001','Empty'),('91000000-0000-4000-8000-000000000002','Members'),('91000000-0000-4000-8000-000000000003','Assets'),('91000000-0000-4000-8000-000000000004','Invites'),('91000000-0000-4000-8000-000000000005','Trash');
insert into public.organization_members(organization_id,user_id,role,status) values
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','admin','active'),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','admin','active'),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','viewer','active'),
('91000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001','admin','active'),
('91000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000001','admin','active'),
('91000000-0000-4000-8000-000000000005','90000000-0000-4000-8000-000000000001','admin','active');
insert into public.audit_logs(organization_id,actor_user_id,action,target_id) values('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','organization.created','91000000-0000-4000-8000-000000000001');
insert into public.organization_invitations(organization_id,email,role,status,invited_by) values('91000000-0000-4000-8000-000000000004','invite@example.invalid','viewer','revoked','90000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
insert into public.patent_assets(organization_id,title,jurisdiction) values('91000000-0000-4000-8000-000000000003','Asset','KR');
insert into public.patent_assets(organization_id,title,jurisdiction) values('91000000-0000-4000-8000-000000000005','Deleted asset','KR') returning set_config('test.trash_asset',id::text,true);
delete from public.patent_assets where id=current_setting('test.trash_asset')::uuid;
do $$ begin
 begin perform public.delete_empty_organization('91000000-0000-4000-8000-000000000002'); raise exception 'members org deleted'; exception when raise_exception then if sqlerrm <> 'organization contains members or data' then raise; end if; end;
 begin perform public.delete_empty_organization('91000000-0000-4000-8000-000000000003'); raise exception 'assets org deleted'; exception when raise_exception then if sqlerrm <> 'organization contains members or data' then raise; end if; end;
 begin perform public.delete_empty_organization('91000000-0000-4000-8000-000000000004'); raise exception 'invites org deleted'; exception when raise_exception then if sqlerrm <> 'organization contains members or data' then raise; end if; end;
 begin perform public.delete_empty_organization('91000000-0000-4000-8000-000000000005'); raise exception 'trash org deleted'; exception when raise_exception then if sqlerrm <> 'organization contains members or data' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
do $$ begin begin perform public.delete_empty_organization('91000000-0000-4000-8000-000000000002'); raise exception 'viewer deleted organization'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select public.delete_empty_organization('91000000-0000-4000-8000-000000000001');
select set_config('test.org_trash',id::text,true) from public.deleted_organizations() where name='Empty';
do $$ declare n int; begin select count(*) into n from public.organizations where id='91000000-0000-4000-8000-000000000001'; if n<>0 then raise exception 'organization still visible'; end if; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin select count(*) into n from public.deleted_organizations(); if n<>0 then raise exception 'other user sees deleted organization'; end if; begin perform public.restore_deleted_organization(current_setting('test.org_trash')::uuid); raise exception 'other user restored organization'; exception when no_data_found then null; end; end $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select public.restore_deleted_organization(current_setting('test.org_trash')::uuid);
do $$ declare n int; begin select count(*) into n from public.organizations where id='91000000-0000-4000-8000-000000000001' and name='Empty'; if n<>1 then raise exception 'organization not restored'; end if; select count(*) into n from public.audit_logs where organization_id='91000000-0000-4000-8000-000000000001' and action in ('organization.created','organization.deleted','organization.restored'); if n<>3 then raise exception 'audit not restored'; end if; end $$;
select public.delete_empty_organization('91000000-0000-4000-8000-000000000001');
select set_config('test.org_trash',id::text,true) from public.deleted_organizations() where name='Empty';
reset role;
update private.organization_recycle_bin set deleted_at=now()-interval '30 days' where id=current_setting('test.org_trash')::uuid;
set local role authenticated;
do $$ begin begin perform public.restore_deleted_organization(current_setting('test.org_trash')::uuid); raise exception 'expired organization restored'; exception when no_data_found then null; end; end $$;
reset role;
do $$ declare n int; begin select count(*) into n from cron.job where jobname='pavis-organization-recycle-purge' and active; if n<>1 then raise exception 'organization purge job missing'; end if; end $$;
rollback;
