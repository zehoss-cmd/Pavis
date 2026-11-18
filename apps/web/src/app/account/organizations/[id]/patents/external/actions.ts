'use server';
import { patentAccess } from '@/lib/patents/access';
import { lookupGoogle } from '@/lib/patent-providers/google';
import { lookupKipris } from '@/lib/patent-providers/kipris';
import type { LookupState } from '@/lib/patent-providers/types';
export async function lookupPatent(_previous:LookupState,form:FormData):Promise<LookupState> {
 const org=String(form.get('organization')||''),provider=String(form.get('provider')||''),raw=String(form.get('number')||'').trim();
 const {canWrite}=await patentAccess(org);if(!canWrite)return {error:'provider',result:null};
 if(provider==='kipris'){const number=raw.replace(/[\s-]/g,'');if(!/^\d{13}$/.test(number))return {error:'invalid',result:null};const key=process.env.KIPRIS_API_KEY;if(!key)return {error:'unconfigured',result:null};try{const result=await lookupKipris(number,key);return result?{error:null,result}:{error:'provider',result:null};}catch{return {error:'network',result:null};}}
 if(provider==='google'){const number=raw.toUpperCase();if(!/^[A-Z]{2}-[A-Z0-9]{1,20}-[A-Z0-9]{1,3}$/.test(number))return {error:'invalid',result:null};const project=process.env.GOOGLE_PATENTS_PROJECT_ID,credentials=process.env.GOOGLE_PATENTS_SERVICE_ACCOUNT_JSON;if(!project||!credentials)return {error:'unconfigured',result:null};try{const result=await lookupGoogle(number,project,credentials);return result?{error:null,result}:{error:'provider',result:null};}catch{return {error:'network',result:null};}}
 return {error:'invalid',result:null};
}
