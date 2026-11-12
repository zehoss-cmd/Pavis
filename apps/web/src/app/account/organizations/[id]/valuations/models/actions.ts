'use server';
import { redirect } from 'next/navigation';
import type { ModelFormState } from './form-state';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function createModel(_previous:ModelFormState,form:FormData):Promise<ModelFormState> {
 const read=(key:string)=>String(form.get(key)||'').trim();
 const org=read('organization');if(!uuid.test(org)) return {error:'invalid'};
 const path=`/account/organizations/${org}/valuations/models`;
 const name=read('name'),version=read('version'),description=read('description');
 const weights=['legal','technical','market','commercial'].map(k=>read(`${k}_weight`));
 if(!name||Array.from(name).length>80||!version||Array.from(version).length>40||Array.from(description).length>1000||weights.some(w=>!/^\d{1,3}$/.test(w)||Number(w)>100)||weights.reduce((sum,w)=>sum+Number(w),0)!==100) return {error:'invalid'};
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try { supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user) return {error:'session'}; }
 catch { return {error:'network'}; }
 let result;
 try { result=await supabase.from('valuation_models').insert({organization_id:org,name,version,description:description||null,legal_weight:Number(weights[0]),technical_weight:Number(weights[1]),market_weight:Number(weights[2]),commercial_weight:Number(weights[3])}); }
 catch { return {error:'network'}; }
 if(result.error) return {error:result.error.code==='23505'?'duplicate':result.status===0?'network':'save'};
 redirect(`${path}?created=1`);
}
