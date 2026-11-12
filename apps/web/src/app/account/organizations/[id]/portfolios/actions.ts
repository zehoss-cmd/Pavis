'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { DraftFormState } from '../valuations/draft-form-state';
import { parsePortfolioPage, parsePortfolioAssetQuery } from '@/lib/portfolios/pagination';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(form:FormData,key:string)=>String(form.get(key)||'').trim();
const base=(org:string)=>`/account/organizations/${org}/portfolios`;
async function client() { const supabase=await createClient(); const {data:{user},error}=await supabase.auth.getUser(); if(error || !user) redirect('/login'); return supabase; }
export async function savePortfolio(_previous:DraftFormState,form:FormData):Promise<DraftFormState> {
  const org=read(form,'organization'), portfolio=read(form,'portfolio'), operation=read(form,'operation'), name=read(form,'name'), description=read(form,'description');
  if(!uuid.test(org)||!['create','update'].includes(operation)||(operation==='update'&&!uuid.test(portfolio))||!name||Array.from(name).length>200||Array.from(description).length>500) return {error:'invalid'};
  let supabase:Awaited<ReturnType<typeof createClient>>;
  try { supabase=await createClient(); const {data:{user},error}=await supabase.auth.getUser(); if(error||!user) return {error:'session'}; }
  catch { return {error:'network'}; }
  let result;
  try { result=operation==='create' ? await supabase.from('patent_portfolios').insert({organization_id:org,name,description:description||null}).select('id').single() : await supabase.from('patent_portfolios').update({name,description:description||null}).eq('organization_id',org).eq('id',portfolio).select('id').maybeSingle(); }
  catch { return {error:'network'}; }
  if(result.error||!result.data) return {error:result.status===0?'network':'save'};
  redirect(operation==='create' ? `${base(org)}/${result.data.id}?created=1` : `${base(org)}/${portfolio}?updated=1`);
}
export async function changeAssignment(form:FormData) {
  const org=read(form,'organization'),portfolio=read(form,'portfolio'),asset=read(form,'asset'),operation=read(form,'operation');
  if(!uuid.test(org)||!uuid.test(portfolio)||!uuid.test(asset)||!['add','remove'].includes(operation)) redirect('/account');
  const url=`${base(org)}/${portfolio}`, page=parsePortfolioPage(read(form,'page')), supabase=await client();
  const params=new URLSearchParams();
  if(page>1) params.set('page',String(page));
  const assetQuery=parsePortfolioAssetQuery(read(form,'asset_query'));
  if(assetQuery) params.set('asset_query',assetQuery);
  const choicePage=parsePortfolioPage(read(form,'choice_page'));
  if(choicePage>1) params.set('choice_page',String(choicePage));
  const context=params.toString()?`&${params.toString()}`:'';
  const result=operation==='add' ? await supabase.from('patent_portfolio_assets').insert({organization_id:org,portfolio_id:portfolio,asset_id:asset}).select('id').single() : await supabase.from('patent_portfolio_assets').delete().eq('organization_id',org).eq('portfolio_id',portfolio).eq('asset_id',asset).select('id').maybeSingle();
  if(result.error||!result.data) redirect(`${url}?error=${result.error?.code==='23505'?'duplicate':'save'}${context}`);
  redirect(`${url}?${operation==='add'?'added':'removed'}=1${context}`);
}
export async function managePortfolio(form:FormData) {
  const org=read(form,'organization'),portfolio=read(form,'portfolio'),operation=read(form,'operation');
  if(!uuid.test(org)||!uuid.test(portfolio)||operation!=='delete') redirect('/account');
  const back=`${base(org)}/${portfolio}`;
  const supabase=await client();
  const result=await supabase.from('patent_portfolios').delete().eq('organization_id',org).eq('id',portfolio).select('id').maybeSingle();
  if(result.error || !result.data) redirect(`${back}?error=${result.error?.code==='23503'?'linked':'save'}`);
  redirect(`${base(org)}?deleted=1`);
}
