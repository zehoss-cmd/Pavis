-- Keep the privileged, ownership-checking implementation outside the exposed API schema.
alter function public.claim_business_card_notice(uuid) set schema private;
create function public.claim_business_card_notice(p_request uuid) returns boolean language sql security invoker set search_path = '' as $$
 select private.claim_business_card_notice(p_request);
$$;
revoke all on function public.claim_business_card_notice(uuid) from public,anon;
grant execute on function public.claim_business_card_notice(uuid) to authenticated;
