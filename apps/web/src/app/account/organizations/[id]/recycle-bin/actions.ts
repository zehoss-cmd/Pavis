'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function restoreRecord(form:FormData) {
 const org=String(form.get('organization')||''),record=String(form.get('record')||'');
 if(!uuid.test(org)||!uuid.test(record)) redirect('/account');
 const path=`/account/organizations/${org}/recycle-bin`,supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user) redirect('/login');
 const {error}=await supabase.rpc('registry_recycle_restore',{p_org:org,p_id:record});
 if(error) redirect(`${path}?error=${error.code==='23505'?'duplicate':error.code==='23503'?'linked':'restore'}`);
 redirect(`${path}?restored=1`);
}
