begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('b0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','card-user@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','card-other@example.invalid','',now(),now()),
('b0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','card-reviewer@example.invalid','',now(),now());
insert into private.business_card_reviewers(user_id) values ('b0000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000001","email":"card-user@example.invalid","role":"authenticated"}',true);
insert into public.business_card_requests(id,user_id,storage_path) values ('b1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000001');
insert into storage.objects(bucket_id,name) values ('business-cards','b0000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000001');
do $$ declare n int; begin
 if not public.claim_business_card_notice('b1000000-0000-4000-8000-000000000001') then raise exception 'owner cannot request notification'; end if;
 if public.claim_business_card_notice('b1000000-0000-4000-8000-000000000001') then raise exception 'notification rate limit missing'; end if;
 begin update public.business_card_requests set requester_email='spoof@example.invalid'; raise exception 'requester email editable'; exception when insufficient_privilege then null; end;
 begin insert into public.business_card_requests(id,user_id,storage_path) values ('b1000000-0000-4000-8000-000000000002',auth.uid(),auth.uid()::text || '/b1000000-0000-4000-8000-000000000002'); raise exception 'duplicate pending accepted'; exception when unique_violation then null; end;
 update public.business_card_requests set status='approved',reviewer_id=auth.uid(),reviewed_at=now(); get diagnostics n=row_count; if n<>0 then raise exception 'submitter approved their own card'; end if;
 begin insert into storage.objects(bucket_id,name) values ('business-cards','b0000000-0000-4000-8000-000000000001/unlinked'); raise exception 'unlinked object allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000002","email":"card-other@example.invalid","role":"authenticated"}',true);
do $$ declare n int; begin
 if public.claim_business_card_notice('b1000000-0000-4000-8000-000000000001') then raise exception 'other user can request notice'; end if;
 select count(*) into n from public.business_card_requests; if n<>0 then raise exception 'another user read request'; end if;
 select count(*) into n from storage.objects where bucket_id='business-cards'; if n<>0 then raise exception 'another user read card'; end if;
 update public.business_card_requests set status='approved',reviewer_id=auth.uid(),reviewed_at=now(); get diagnostics n=row_count; if n<>0 then raise exception 'another user reviewed card'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000003","email":"card-reviewer@example.invalid","role":"authenticated"}',true);
do $$ declare n int; begin
 if not public.is_business_card_reviewer() then raise exception 'reviewer not recognized'; end if;
 select count(*) into n from storage.objects where bucket_id='business-cards'; if n<>1 then raise exception 'reviewer cannot read card'; end if;
 update public.business_card_requests set status='approved',reviewer_id=auth.uid(),reviewed_at=now() where id='b1000000-0000-4000-8000-000000000001'; get diagnostics n=row_count; if n<>1 then raise exception 'reviewer cannot approve'; end if;
end $$;
insert into public.business_card_requests(id,user_id,storage_path) values ('b1000000-0000-4000-8000-000000000003',auth.uid(),auth.uid()::text || '/b1000000-0000-4000-8000-000000000003');
do $$ declare n int; begin
 update public.business_card_requests set status='approved',reviewer_id=auth.uid(),reviewed_at=now() where id='b1000000-0000-4000-8000-000000000003'; get diagnostics n=row_count; if n<>0 then raise exception 'reviewer approved their own card'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.business_card_requests; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
