'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(form:FormData,key:string)=>String(form.get(key)||'').trim();
const base=(org:string)=>`/account/organizations/${org}/portfolios`;
async function client() { const supabase=await createClient(); const {data:{user},error}=await supabase.auth.getUser(); if(error || !user) redirect('/login'); return supabase; }
export async function createPortfolio(form:FormData) {
  const org=read(form,'organization'), name=read(form,'name'), description=read(form,'description');
  if(!uuid.test(org)) redirect('/account');
  if(!name || Array.from(name).length>200 || Array.from(description).length>500) redirect(`${base(org)}?error=invalid`);
  const supabase=await client();
  const {data,error}=await supabase.from('patent_portfolios').insert({organization_id:org,name,description:description||null}).select('id').single();
  if(error || !data) redirect(`${base(org)}?error=save`);
  redirect(`${base(org)}/${data.id}?created=1`);
}
export async function changeAssignment(form:FormData) {
  const org=read(form,'organization'),portfolio=read(form,'portfolio'),asset=read(form,'asset'),operation=read(form,'operation');
  if(!uuid.test(org)||!uuid.test(portfolio)||!uuid.test(asset)||!['add','remove'].includes(operation)) redirect('/account');
  const url=`${base(org)}/${portfolio}`, supabase=await client();
  const result=operation==='add' ? await supabase.from('patent_portfolio_assets').insert({organization_id:org,portfolio_id:portfolio,asset_id:asset}).select('id').single() : await supabase.from('patent_portfolio_assets').delete().eq('organization_id',org).eq('portfolio_id',portfolio).eq('asset_id',asset).select('id').maybeSingle();
  if(result.error||!result.data) redirect(`${url}?error=${result.error?.code==='23505'?'duplicate':'save'}`);
  redirect(`${url}?${operation==='add'?'added':'removed'}=1`);
}
export async function managePortfolio(form:FormData) {
  const org=read(form,'organization'),portfolio=read(form,'portfolio'),operation=read(form,'operation'),name=read(form,'name'),description=read(form,'description');
  if(!uuid.test(org)||!uuid.test(portfolio)||!['update','delete'].includes(operation)) redirect('/account');
  const back=`${base(org)}/${portfolio}`;
  if(operation==='update' && (!name || Array.from(name).length>200 || Array.from(description).length>500)) redirect(`${back}?error=invalid`);
  const supabase=await client();
  const result=operation==='update' ? await supabase.from('patent_portfolios').update({name,description:description||null}).eq('organization_id',org).eq('id',portfolio).select('id').maybeSingle() : await supabase.from('patent_portfolios').delete().eq('organization_id',org).eq('id',portfolio).select('id').maybeSingle();
  if(result.error || !result.data) redirect(`${back}?error=${result.error?.code==='23503'?'linked':'save'}`);
  redirect(operation==='update' ? `${back}?updated=1` : `${base(org)}?deleted=1`);
}
