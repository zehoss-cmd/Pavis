'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function decideRevenueReview(form:FormData) {
 const id=String(form.get('id')||''),decision=String(form.get('decision')||''),note=String(form.get('note')||'').trim();
 if(!uuid.test(id)||!['reviewed','needs_info'].includes(decision)||!note||Array.from(note).length>1000)redirect('/account/revenue-review?error=invalid');
 const supabase=await createClient(),{data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect('/login');
 const {error:writeError}=await supabase.rpc('decide_product_revenue_review',{p_id:id,p_decision:decision,p_note:note});
 if(writeError)redirect('/account/revenue-review?error=save');
 redirect('/account/revenue-review?saved=1');
}
