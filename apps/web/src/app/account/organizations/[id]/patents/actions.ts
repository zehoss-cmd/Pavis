'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
export async function saveAsset(form:FormData) {
  const org=read(form,'organization'), asset=read(form,'asset'), family=read(form,'family');
  if(!uuid.test(org) || (asset && !uuid.test(asset))) redirect('/account?error=1');
  const back=asset ? `${root(org)}/${asset}` : root(org);
  const title=read(form,'title'), jurisdiction=read(form,'jurisdiction').toUpperCase(), number=read(form,'application_number'), source=read(form,'source'), status=read(form,'legal_status');
  const publication=read(form,'publication_number'), registration=read(form,'registration_number'), holder=read(form,'rights_holder'), inventors=read(form,'inventors');
  const filing=date(read(form,'filing_date')), priority=date(read(form,'priority_date')), verified=date(read(form,'verified_date'));
  if(!title || Array.from(title).length>300 || !/^[A-Z]{2}$/.test(jurisdiction) || number.length>100 || publication.length>100 || registration.length>100 || holder.length>500 || inventors.length>500 || source.length>500 || !statuses.includes(status) || (family && !uuid.test(family)) || filing===undefined || priority===undefined || verified===undefined) redirect(`${back}?error=invalid`);
  const supabase=await clientForUser();
  const values={family_id:family || null,title,jurisdiction,application_number:number || null,publication_number:publication || null,registration_number:registration || null,rights_holder:holder || null,inventors:inventors || null,filing_date:filing,priority_date:priority,legal_status:status,source:source || null,verified_date:verified};
  const result=asset ? await supabase.from('patent_assets').update(values).eq('id',asset).eq('organization_id',org).select('id').maybeSingle() : await supabase.from('patent_assets').insert({...values,organization_id:org}).select('id').single();
  if(result.error || !result.data) redirect(`${back}?error=${result.error?.code==='23505' ? 'duplicate' : 'save'}`);
  redirect(`${root(org)}/${result.data.id}?saved=1`);
}
