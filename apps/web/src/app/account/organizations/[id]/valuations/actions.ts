'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(f:FormData,k:string)=>String(f.get(k)||'').trim();
export async function manageValuation(form:FormData) {
 const org=read(form,'organization'),asset=read(form,'asset'),id=read(form,'id'),op=read(form,'operation');
 if(!uuid.test(org)||!['create','update','delete','finalize'].includes(op)||(op==='create'&&!uuid.test(asset))||(op!=='create'&&!uuid.test(id))) redirect('/account');
 const path=`/account/organizations/${org}/valuations`;
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user) redirect('/login');
 if(op==='delete'||op==='finalize') {
  const result=op==='delete'?await supabase.from('valuation_assessments').delete().eq('organization_id',org).eq('id',id).select('id').maybeSingle():await supabase.from('valuation_assessments').update({status:'final'}).eq('organization_id',org).eq('id',id).eq('status','draft').select('id').maybeSingle();
  if(result.error||!result.data) redirect(`${path}?error=${op==='finalize'?'evidence':'save'}`);
  redirect(`${path}?${op}=1`);
 }
 const assessment_date=read(form,'assessment_date'),date=new Date(`${assessment_date}T00:00:00Z`);
 const dimensions=['legal','technical','market','commercial'] as const;
 const scores=dimensions.map(d=>read(form,`${d}_score`)),notes=dimensions.map(d=>read(form,`${d}_note`));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(assessment_date)||Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==assessment_date||scores.some(s=>!['0','1','2','3','4','5'].includes(s))||notes.some(n=>Array.from(n).length>1000)) redirect(`${path}?error=invalid`);
 const values={assessment_date,legal_score:Number(scores[0]),technical_score:Number(scores[1]),market_score:Number(scores[2]),commercial_score:Number(scores[3]),legal_note:notes[0]||null,technical_note:notes[1]||null,market_note:notes[2]||null,commercial_note:notes[3]||null};
 const result=op==='create'?await supabase.from('valuation_assessments').insert({...values,organization_id:org,asset_id:asset}).select('id').maybeSingle():await supabase.from('valuation_assessments').update(values).eq('organization_id',org).eq('id',id).eq('status','draft').select('id').maybeSingle();
 if(result.error||!result.data) redirect(`${path}?error=save`);
 redirect(`${path}?${op}=1`);
}
