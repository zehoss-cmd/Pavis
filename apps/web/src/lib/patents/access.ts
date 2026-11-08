import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canPerformOrganizationAction } from '@/domain/organizations/authorization';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function patentAccess(org:string) {
  if (!uuid.test(org)) notFound();
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  const [{data:organization},{data:membership}] = await Promise.all([
    supabase.from('organizations').select('id,name').eq('id',org).maybeSingle(),
    supabase.from('organization_members').select('role,status').eq('organization_id',org).eq('user_id',user.id).maybeSingle(),
  ]);
  if(!organization || !canPerformOrganizationAction(membership?.role,membership?.status,'asset.read')) notFound();
  return {supabase,organization,canWrite:canPerformOrganizationAction(membership?.role,membership?.status,'asset.write')};
}
