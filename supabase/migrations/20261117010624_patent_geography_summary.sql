-- Invoker rights preserve the existing patent-asset RLS for all aggregates.
create function public.patent_geography_summary(p_organization uuid, p_family uuid default null)
returns table(jurisdiction text, total bigint, applications bigint, registrations bigint, unknown_count bigint, pending_count bigint, granted_count bigint, rejected_count bigint, withdrawn_count bigint, expired_count bigint, lapsed_count bigint, revoked_count bigint)
language sql stable security invoker set search_path = '' as $$
 select a.jurisdiction, count(*),
 count(*) filter (where nullif(btrim(a.application_number),'') is not null),
 count(*) filter (where nullif(btrim(a.registration_number),'') is not null),
 count(*) filter (where a.legal_status='unknown'), count(*) filter (where a.legal_status='pending'),
 count(*) filter (where a.legal_status='granted'), count(*) filter (where a.legal_status='rejected'),
 count(*) filter (where a.legal_status='withdrawn'), count(*) filter (where a.legal_status='expired'),
 count(*) filter (where a.legal_status='lapsed'), count(*) filter (where a.legal_status='revoked')
 from public.patent_assets a
 where a.organization_id=p_organization and (p_family is null or a.family_id=p_family)
 group by a.jurisdiction order by a.jurisdiction;
$$;
revoke all on function public.patent_geography_summary(uuid,uuid) from public,anon;
grant execute on function public.patent_geography_summary(uuid,uuid) to authenticated;
