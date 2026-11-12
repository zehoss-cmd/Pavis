'use server';
import { parseEventPage, eventResultQuery } from '@/lib/patents/event-pagination';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=['unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked'];
const read=(form:FormData,key:string)=>String(form.get(key)||'').trim();
function date(value:string) {if(!value) return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01') return undefined;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value?value:undefined;}
export async function manageLegalEvent(form:FormData) {
 const org=read(form,'organization'),asset=read(form,'asset'),event=read(form,'event'),operation=read(form,'operation');
 if(!uuid.test(org)||!uuid.test(asset)||!['create','update','delete'].includes(operation)||(operation!=='create'&&!uuid.test(event))) redirect('/account');
 const path=`/account/organizations/${org}/patents/${asset}/events`;
 const page=operation==='create'?1:parseEventPage(read(form,'page'));
 const eventDate=date(read(form,'event_date')),verified=date(read(form,'verified_date')),status=read(form,'legal_status'),source=read(form,'source'),note=read(form,'note');
 if(operation!=='delete' && (!eventDate || verified===undefined || !statuses.includes(status) || Array.from(source).length>500 || Array.from(note).length>1000)) redirect(`${path}${eventResultQuery('invalid',page)}`);
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user) redirect('/login');
 const values={event_date:eventDate,legal_status:status,source:source||null,verified_date:verified,note:note||null};
 const result=operation==='create' ? await supabase.from('patent_legal_events').insert({...values,organization_id:org,asset_id:asset}).select('id').single() : operation==='update' ? await supabase.from('patent_legal_events').update(values).eq('organization_id',org).eq('asset_id',asset).eq('id',event).select('id').maybeSingle() : await supabase.from('patent_legal_events').delete().eq('organization_id',org).eq('asset_id',asset).eq('id',event).select('id').maybeSingle();
 if(result.error||!result.data) redirect(`${path}${eventResultQuery('save',page)}`);
 redirect(`${path}${eventResultQuery(operation==='create'?'created':operation==='update'?'updated':'deleted',page)}`);
}
