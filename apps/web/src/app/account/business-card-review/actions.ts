'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reviewBusinessCard(form: FormData) {
 const id=String(form.get('id') || ''), decision=String(form.get('decision') || '');
 if (!uuid.test(id) || !['approved','rejected'].includes(decision)) redirect('/account/business-card-review?error=1');
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if (error || !user) redirect('/login');
 const {data:reviewer}=await supabase.rpc('is_business_card_reviewer');
 if (!reviewer) redirect('/account');
 const {data, error:writeError}=await supabase.from('business_card_requests').update({status:decision,reviewed_at:new Date().toISOString(),reviewer_id:user.id}).eq('id',id).eq('status','pending').select('id').maybeSingle();
 if (writeError || !data) redirect('/account/business-card-review?error=1');
 redirect('/account/business-card-review?saved=1');
}
