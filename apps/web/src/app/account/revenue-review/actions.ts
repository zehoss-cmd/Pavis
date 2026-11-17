'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { classifyReviewError, type RevenueReviewFormState } from '@/domain/products/revenue-review-form';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function decideRevenueReview(_previous:RevenueReviewFormState,form:FormData):Promise<RevenueReviewFormState> {
 const id=String(form.get('id')||''),decision=String(form.get('decision')||''),note=String(form.get('note')||'').trim();
 if(!uuid.test(id)||!['reviewed','needs_info'].includes(decision)||!note||Array.from(note).length>1000)return {error:'invalid'};
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try {supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {error:'session'};}catch{return {error:'network'};}
 let result;
 try {result=await supabase.rpc('decide_product_revenue_review',{p_id:id,p_decision:decision,p_note:note});}catch{return {error:'network'};}
 if(result.error)return {error:result.status===0?'network':classifyReviewError(result.error.code)};
 redirect('/account/revenue-review?saved=1');
}
