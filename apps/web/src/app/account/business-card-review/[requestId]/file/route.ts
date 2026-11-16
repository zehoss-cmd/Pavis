import { createClient } from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request: Request, {params}:{params:Promise<{requestId:string}>}) {
 const {requestId}=await params;
 if (!uuid.test(requestId)) return new Response(null,{status:404});
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if (!user) return new Response(null,{status:401});
 const {data:reviewer}=await supabase.rpc('is_business_card_reviewer');
 if (!reviewer) return new Response(null,{status:404});
 const {data:record}=await supabase.from('business_card_requests').select('storage_path').eq('id',requestId).maybeSingle();
 if (!record) return new Response(null,{status:404});
 const {data:file,error}=await supabase.storage.from('business-cards').download(record.storage_path);
 if (error || !file) return new Response(null,{status:404});
 return new Response(file,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="business-card"','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
}
