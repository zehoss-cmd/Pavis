'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { businessCardMaxBytes, businessCardType } from '@/lib/profile/business-card';
import { businessCardMailConfigured, sendBusinessCardNotice } from '@/lib/mail/business-card-notice';

export async function submitBusinessCard(form: FormData) {
 const supabase = await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if (authError || !user) redirect('/login');
 if (!businessCardMailConfigured()) redirect('/account/profile?card_error=mail_setup');
 const file = form.get('business_card');
 if (!(file instanceof File) || !file.size || file.size > businessCardMaxBytes) redirect('/account/profile?card_error=invalid');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const type=businessCardType(bytes,file.type);
 if (!type) redirect('/account/profile?card_error=invalid');
 const id=randomUUID(), storagePath=`${user.id}/${id}`;
 const {error:insertError}=await supabase.from('business_card_requests').insert({id,user_id:user.id,storage_path:storagePath});
 if (insertError) redirect(`/account/profile?card_error=${insertError.code === '23505' ? 'pending' : 'upload'}`);
 const {error:uploadError}=await supabase.storage.from('business-cards').upload(storagePath,bytes,{contentType:type,upsert:false});
 if (uploadError) {
   await supabase.from('business_card_requests').delete().eq('id',id).eq('user_id',user.id).eq('status','pending');
   redirect('/account/profile?card_error=upload');
 }
 const {data:claimed,error:claimError}=await supabase.rpc('claim_business_card_notice',{p_request:id});
 if (claimError || !claimed) redirect('/account/profile?card_notice=rate');
 try { await sendBusinessCardNotice(); }
 catch { redirect('/account/profile?card_notice=failed'); }
 redirect('/account/profile?card_notice=sent');
}

export async function retryBusinessCardNotice() {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if (error || !user) redirect('/login');
 if (!businessCardMailConfigured()) redirect('/account/profile?card_notice=failed');
 const {data:record}=await supabase.from('business_card_requests').select('id').eq('user_id',user.id).eq('status','pending').maybeSingle();
 if (!record) redirect('/account/profile?card_error=upload');
 const {data:claimed,error:claimError}=await supabase.rpc('claim_business_card_notice',{p_request:record.id});
 if (claimError || !claimed) redirect('/account/profile?card_notice=rate');
 try { await sendBusinessCardNotice(); } catch { redirect('/account/profile?card_notice=failed'); }
 redirect('/account/profile?card_notice=sent');
}
