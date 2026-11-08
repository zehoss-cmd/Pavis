'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function createModel(form:FormData) {
 const read=(key:string)=>String(form.get(key)||'').trim();
 const org=read('organization');if(!uuid.test(org)) redirect('/account');
 const path=`/account/organizations/${org}/valuations/models`;
 const name=read('name'),version=read('version'),description=read('description');
 const weights=['legal','technical','market','commercial'].map(k=>read(`${k}_weight`));
 if(!name||Array.from(name).length>80||!version||Array.from(version).length>40||Array.from(description).length>1000||weights.some(w=>!/^\d{1,3}$/.test(w)||Number(w)>100)||weights.reduce((sum,w)=>sum+Number(w),0)!==100) redirect(`${path}?error=invalid`);
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user) redirect('/login');
 const {error}=await supabase.from('valuation_models').insert({organization_id:org,name,version,description:description||null,legal_weight:Number(weights[0]),technical_weight:Number(weights[1]),market_weight:Number(weights[2]),commercial_weight:Number(weights[3])});
 if(error) redirect(`${path}?error=${error.code==='23505'?'duplicate':'save'}`);
 redirect(`${path}?created=1`);
}
