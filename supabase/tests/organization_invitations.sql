begin;
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,encrypted_password,created_at,updated_at) values
('40000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inv-admin@example.invalid',now(),'',now(),now()),
('40000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inv-target@example.invalid',null,'',now(),now()),
('40000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','inv-other@example.invalid',now(),'',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('test.org',public.create_organization('Invite test')::text,true);
select set_config('test.invite',public.create_organization_invitation(current_setting('test.org')::uuid,'INV-TARGET@example.invalid','viewer')::text,true);
do $$ declare n int; begin
select count(*) into n from public.list_organization_invitations(current_setting('test.org')::uuid); if n<>1 then raise exception 'admin cannot list invitation'; end if;
begin perform public.create_organization_invitation(current_setting('test.org')::uuid,'inv-target@example.invalid','viewer'); raise exception 'duplicate allowed'; exception when unique_violation then null; end;
begin perform public.create_organization_invitation(current_setting('test.org')::uuid,'other@example.invalid','admin'); raise exception 'admin invitation allowed'; exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
do $$ declare n int; begin
select count(*) into n from public.my_organization_invitations(); if n<>0 then raise exception 'wrong recipient can list'; end if;
begin perform public.accept_organization_invitation(current_setting('test.invite')::uuid); raise exception 'wrong recipient accepted'; exception when insufficient_privilege then null; end;
begin perform public.create_organization_invitation(current_setting('test.org')::uuid,'x@example.invalid','viewer'); raise exception 'nonadmin created invitation'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
select count(*) into n from public.my_organization_invitations(); if n<>0 then raise exception 'unverified can list'; end if;
begin perform public.accept_organization_invitation(current_setting('test.invite')::uuid); raise exception 'unverified accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id='40000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
do $$ declare n int; begin
select count(*) into n from public.my_organization_invitations(); if n<>1 then raise exception 'recipient cannot list'; end if;
perform public.accept_organization_invitation(current_setting('test.invite')::uuid);
select count(*) into n from public.organization_members where organization_id=current_setting('test.org')::uuid and user_id=auth.uid() and role='viewer' and status='active'; if n<>1 then raise exception 'membership missing'; end if;
begin perform public.accept_organization_invitation(current_setting('test.invite')::uuid); raise exception 'replay accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('test.revoke',public.create_organization_invitation(current_setting('test.org')::uuid,'inv-other@example.invalid','analyst')::text,true);
select public.revoke_organization_invitation(current_setting('test.org')::uuid,current_setting('test.revoke')::uuid);
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
do $$ begin
begin perform public.accept_organization_invitation(current_setting('test.revoke')::uuid); raise exception 'revoked accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('test.expired',public.create_organization_invitation(current_setting('test.org')::uuid,'inv-other@example.invalid','viewer')::text,true);
reset role;
update public.organization_invitations set expires_at=now()-interval '1 second' where id=current_setting('test.expired')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
do $$ begin
begin perform public.accept_organization_invitation(current_setting('test.expired')::uuid); raise exception 'expired accepted'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
begin perform * from public.my_organization_invitations(); raise exception 'anonymous list allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
