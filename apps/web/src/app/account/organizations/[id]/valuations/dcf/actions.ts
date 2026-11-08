'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(f:FormData,k:string)=>String(f.get(k)||'').trim();
export async function manageDcf(form:FormData) {
 const org=read(form,'organization'),asset=read(form,'asset'),id=read(form,'id'),op=read(form,'operation');
 if(!uuid.test(org)||!['create','update','delete','finalize'].includes(op)||(op==='create'&&!uuid.test(asset))||(op!=='create'&&!uuid.test(id))) redirect('/account');
 const path=`/account/organizations/${org}/valuations/dcf`;
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user) redirect('/login');
 if(op==='delete'||op==='finalize') {
  const result=op==='delete'?await supabase.from('royalty_dcf_assessments').delete().eq('organization_id',org).eq('id',id).eq('status','draft').select('id').maybeSingle():await supabase.from('royalty_dcf_assessments').update({status:'final'}).eq('organization_id',org).eq('id',id).eq('status','draft').select('id').maybeSingle();
  if(result.error||!result.data) redirect(`${path}?error=${op==='finalize'?'evidence':'save'}`);
  redirect(`${path}?${op}=1`);
 }
 const valuation_date=read(form,'valuation_date'),date=new Date(`${valuation_date}T00:00:00Z`),scenario=read(form,'scenario'),currency=read(form,'currency'),years=read(form,'years'),assumptions=read(form,'assumptions');
 const amounts=['base_sales','annual_cost'].map(k=>read(form,k)),rates=['growth_rate','royalty_rate','contribution_rate','tax_rate','discount_rate'].map(k=>read(form,k));
 const decimal=/^\d{1,13}(?:\.\d{1,2})?$/,signed=/^-?\d{1,3}(?:\.\d{1,2})?$/;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(valuation_date)||Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==valuation_date||!['conservative','base','optimistic'].includes(scenario)||!['KRW','USD','EUR','JPY'].includes(currency)||!/^\d{1,2}$/.test(years)||Number(years)<1||Number(years)>20||amounts.some(v=>!decimal.test(v)||Number(v)>1e12)||rates.some((v,i)=>!signed.test(v)||Number(v)>(100)||Number(v)<(i===0?-100:0))||Array.from(assumptions).length>2000) redirect(`${path}?error=invalid`);
 const values={valuation_date,scenario,currency,years:Number(years),base_sales:amounts[0],annual_cost:amounts[1],growth_rate:rates[0],royalty_rate:rates[1],contribution_rate:rates[2],tax_rate:rates[3],discount_rate:rates[4],assumptions:assumptions||null};
 const result=op==='create'?await supabase.from('royalty_dcf_assessments').insert({...values,organization_id:org,asset_id:asset}).select('id').maybeSingle():await supabase.from('royalty_dcf_assessments').update(values).eq('organization_id',org).eq('id',id).eq('status','draft').select('id').maybeSingle();
 if(result.error||!result.data) redirect(`${path}?error=save`);
 redirect(`${path}?${op}=1`);
}
