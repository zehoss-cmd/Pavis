'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseFamilySearch } from '@/lib/patents/family-search';
import type { AssetFormState } from './form-data';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = ['unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked'];
const root = (org:string) => `/account/organizations/${org}/patents`;
function read(form:FormData,key:string) { return String(form.get(key) || '').trim(); }
function date(value:string) { if (!value) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined; const d=new Date(value+'T00:00:00Z'); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===value ? value : undefined; }
async function clientForUser() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  return supabase;
}
export async function createFamily(form:FormData) {
  const org=read(form,'organization'),name=read(form,'name');
  if(!uuid.test(org)) redirect('/account?error=1');
  if(!name || Array.from(name).length>200) redirect(`${root(org)}?error=family`);
  const supabase=await clientForUser();
  const {error}=await supabase.from('patent_families').insert({organization_id:org,name});
  if(error) redirect(`${root(org)}?error=family`);
  redirect(`${root(org)}?family_created=1`);
}
export async function saveAsset(_previous:AssetFormState,form:FormData):Promise<AssetFormState> {
  const org=read(form,'organization'), asset=read(form,'asset'), family=read(form,'family');
  if(!uuid.test(org) || (asset && !uuid.test(asset))) redirect('/account?error=1');
  const title=read(form,'title'), jurisdiction=read(form,'jurisdiction').toUpperCase(), number=read(form,'application_number'), source=read(form,'source'), status=read(form,'legal_status');
  const publication=read(form,'publication_number'), registration=read(form,'registration_number'), holder=read(form,'rights_holder'), inventors=read(form,'inventors');
  const filing=date(read(form,'filing_date')), priority=date(read(form,'priority_date')), verified=date(read(form,'verified_date'));
  if(!title || Array.from(title).length>300 || !/^[A-Z]{2}$/.test(jurisdiction) || number.length>100 || publication.length>100 || registration.length>100 || holder.length>500 || inventors.length>500 || source.length>500 || !statuses.includes(status) || (family && !uuid.test(family)) || filing===undefined || priority===undefined || verified===undefined) return {error:'invalid'};
  let supabase:Awaited<ReturnType<typeof createClient>>;
  try {
    supabase=await createClient();
    const {data:{user},error}=await supabase.auth.getUser();
    if(error || !user) return {error:'session'};
  } catch { return {error:'network'}; }
  const values={family_id:family || null,title,jurisdiction,application_number:number || null,publication_number:publication || null,registration_number:registration || null,rights_holder:holder || null,inventors:inventors || null,filing_date:filing,priority_date:priority,legal_status:status,source:source || null,verified_date:verified};
  let result;
  try { result=asset ? await supabase.from('patent_assets').update(values).eq('id',asset).eq('organization_id',org).select('id').maybeSingle() : await supabase.from('patent_assets').insert({...values,organization_id:org}).select('id').single(); }
  catch { return {error:'network'}; }
  if(result.error || !result.data) return {error:result.error?.code==='23505' ? 'duplicate' : result.status===0 ? 'network' : 'save'};
  redirect(`${root(org)}/${result.data.id}?saved=1`);
}
export async function deleteAsset(form:FormData) {
  const org=read(form,'organization'), asset=read(form,'asset');
  if(!uuid.test(org)||!uuid.test(asset)) redirect('/account');
  const back=`${root(org)}/${asset}`, supabase=await clientForUser();
  const {data,error}=await supabase.from('patent_assets').delete().eq('organization_id',org).eq('id',asset).select('id').maybeSingle();
  if(error || !data) redirect(`${back}?error=${error?.code==='23503'?'linked':'delete'}`);
  redirect(`${root(org)}?deleted=1`);
}
export async function manageFamily(form:FormData) {
  const org=read(form,'organization'),family=read(form,'family'),operation=read(form,'operation'),name=read(form,'name');
  if(!uuid.test(org)||!uuid.test(family)||!['update','delete'].includes(operation)) redirect('/account');
  const back=`${root(org)}/families`;
  const context=parseFamilySearch({q:read(form,'q'),page:read(form,'page')});
  const contextParams=new URLSearchParams();
  if(context.q) contextParams.set('q',context.q);
  if(context.page>1) contextParams.set('page',String(context.page));
  const suffix=contextParams.toString()?`&${contextParams.toString()}`:'';
  if(operation==='update' && (!name || Array.from(name).length>200)) redirect(`${back}?error=invalid${suffix}`);
  const supabase=await clientForUser();
  const result=operation==='update' ? await supabase.from('patent_families').update({name}).eq('organization_id',org).eq('id',family).select('id').maybeSingle() : await supabase.from('patent_families').delete().eq('organization_id',org).eq('id',family).select('id').maybeSingle();
  if(result.error || !result.data) redirect(`${back}?error=${result.error?.code==='23503'?'linked':'save'}${suffix}`);
  redirect(`${back}?${operation==='update'?'updated':'deleted'}=1${suffix}`);
}
