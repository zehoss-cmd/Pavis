-- The reviewer is identified by immutable Auth user ID, not by editable profile metadata.
create table private.business_card_reviewers (user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on private.business_card_reviewers from public, anon, authenticated;
insert into private.business_card_reviewers(user_id)
select id from auth.users where lower(email)='jhlee9097@gmail.com' and email_confirmed_at is not null;
create function private.is_business_card_reviewer() returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists(select 1 from private.business_card_reviewers where user_id=(select auth.uid()));
$$;
revoke all on function private.is_business_card_reviewer() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_business_card_reviewer() to authenticated;
create function public.is_business_card_reviewer() returns boolean language sql stable security invoker set search_path = '' as $$ select private.is_business_card_reviewer(); $$;
revoke all on function public.is_business_card_reviewer() from public, anon;
grant execute on function public.is_business_card_reviewer() to authenticated;

create table public.business_card_requests (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 requester_email text not null default (auth.jwt()->>'email'),
 storage_path text not null unique,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewer_id uuid references auth.users(id),
 check (storage_path = user_id::text || '/' || id::text),
 check ((status='pending' and reviewed_at is null and reviewer_id is null) or (status in ('approved','rejected') and reviewed_at is not null and reviewer_id is not null))
);
create unique index business_card_one_pending on public.business_card_requests(user_id) where status='pending';
alter table public.business_card_requests enable row level security;
revoke all on public.business_card_requests from public,anon,authenticated;
grant select on public.business_card_requests to authenticated;
grant insert(id,user_id,storage_path) on public.business_card_requests to authenticated;
grant update(status,reviewed_at,reviewer_id) on public.business_card_requests to authenticated;
grant delete on public.business_card_requests to authenticated;
create policy "read own or reviewer business card requests" on public.business_card_requests for select to authenticated using (user_id=(select auth.uid()) or (select private.is_business_card_reviewer()));
create policy "create own business card request" on public.business_card_requests for insert to authenticated with check (user_id=(select auth.uid()) and status='pending');
create policy "delete own pending business card requests" on public.business_card_requests for delete to authenticated using (user_id=(select auth.uid()) and status='pending');
create policy "review pending business card requests" on public.business_card_requests for update to authenticated using ((select private.is_business_card_reviewer()) and status='pending' and user_id<>(select auth.uid())) with check ((select private.is_business_card_reviewer()) and reviewer_id=(select auth.uid()) and status in ('approved','rejected') and user_id<>(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-cards','business-cards',false,3145728,array['image/jpeg','image/png']);
create policy "upload own business cards" on storage.objects for insert to authenticated with check (bucket_id='business-cards' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.business_card_requests r where r.user_id=(select auth.uid()) and r.storage_path=name and r.status='pending'));
create policy "read own or reviewer business cards" on storage.objects for select to authenticated using (bucket_id='business-cards' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_business_card_reviewer())));
create policy "delete own business cards" on storage.objects for delete to authenticated using (bucket_id='business-cards' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- A user can request at most one notification attempt per minute, including retries.
create table private.business_card_notice_limits (user_id uuid primary key references auth.users(id) on delete cascade, attempted_at timestamptz not null);
revoke all on private.business_card_notice_limits from public,anon,authenticated;
create function public.claim_business_card_notice(p_request uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed uuid;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.business_card_requests r join storage.objects o on o.bucket_id='business-cards' and o.name=r.storage_path where r.id=p_request and r.user_id=(select auth.uid()) and r.status='pending') then return false; end if;
 insert into private.business_card_notice_limits as limits(user_id,attempted_at) values ((select auth.uid()),now())
 on conflict (user_id) do update set attempted_at=excluded.attempted_at where limits.attempted_at < now() - interval '1 minute'
 returning user_id into claimed;
 return claimed is not null;
end $$;
revoke all on function public.claim_business_card_notice(uuid) from public,anon;
grant execute on function public.claim_business_card_notice(uuid) to authenticated;
