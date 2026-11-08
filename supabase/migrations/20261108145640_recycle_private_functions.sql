-- Keep privileged implementations in the private schema; public RPCs execute as caller.
alter function public.registry_recycle_list(uuid) set schema private;
alter function public.registry_recycle_restore(uuid,uuid) set schema private;
create function public.registry_recycle_list(p_org uuid) returns table(id uuid,kind text,record_id uuid,name text,deleted_at timestamptz,expires_at timestamptz) language sql security invoker set search_path='' as $$ select * from private.registry_recycle_list(p_org); $$;
create function public.registry_recycle_restore(p_org uuid,p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.registry_recycle_restore(p_org,p_id); $$;
revoke all on function public.registry_recycle_list(uuid), public.registry_recycle_restore(uuid,uuid) from public,anon;
grant execute on function public.registry_recycle_list(uuid), public.registry_recycle_restore(uuid,uuid) to authenticated;
