'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseProduct, type ProductFormState } from '@/domain/products/validation';
import { deleteReturnQuery,productDetailContext } from '@/domain/products/revenue-filter';
import { classifyReviewError, type RevenueReviewFormState } from '@/domain/products/revenue-review-form';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const root=(org:string)=>`/account/organizations/${org}/products`;
export async function saveProduct(_state:ProductFormState,form:FormData):Promise<ProductFormState> {
 const org=String(form.get('organization')||''),id=String(form.get('product')||'');
 if(!uuid.test(org)||(id&&!uuid.test(id))) redirect('/account');
 const values=parseProduct(form); if(!values) return {error:'invalid'};
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try {supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {error:'session'};} catch{return {error:'network'};}
 let result;
 try {result=id?await supabase.from('product_assets').update(values).eq('organization_id',org).eq('id',id).select('id').maybeSingle():await supabase.from('product_assets').insert({...values,organization_id:org}).select('id').single();} catch{return {error:'network'};}
 if(result.error||!result.data)return {error:'save'};
 const params=productDetailContext(form.get('return_query'),form.get('return_revenue'),form.get('return_page'));
 params.set('saved','1');
 redirect(`${root(org)}/${result.data.id}?${params}`);
}
export async function deleteProduct(form:FormData) {
 const org=String(form.get('organization')||''),id=String(form.get('product')||'');
 if(!uuid.test(org)||!uuid.test(id)) redirect('/account');
 const supabase=await createClient(),{data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user) redirect('/login');
 const {data,error}=await supabase.from('product_assets').delete().eq('organization_id',org).eq('id',id).select('id').maybeSingle();
 if(error||!data)redirect(`${root(org)}/${id}?error=${error?.code==='23503'?'linked':'delete'}`);
 const listQuery=form.get('return_to_list')==='1'?deleteReturnQuery(form.get('return_query'),form.get('return_revenue'),form.get('return_page')):'?deleted=1';
 redirect(`${root(org)}${listQuery}`);
}
export async function changeProductPatent(form:FormData) {
 const org=String(form.get('organization')||''),product=String(form.get('product')||''),patent=String(form.get('patent')||''),operation=String(form.get('operation')||'');
 if(!uuid.test(org)||!uuid.test(product)||!uuid.test(patent)||!['add','remove'].includes(operation)) redirect('/account');
 const path=`${root(org)}/${product}`,supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)redirect('/login');
 const result=operation==='add'?await supabase.from('product_patent_links').insert({organization_id:org,product_id:product,patent_id:patent}).select('id').single():await supabase.from('product_patent_links').delete().eq('organization_id',org).eq('product_id',product).eq('patent_id',patent).select('id').maybeSingle();
 if(result.error||!result.data)redirect(`${path}?link_error=${result.error?.code==='23505'?'duplicate':'save'}#product-patents`);
 redirect(`${path}?${operation==='add'?'linked':'unlinked'}=1#product-patents`);
}
export async function requestRevenueReview(_previous:RevenueReviewFormState,form:FormData):Promise<RevenueReviewFormState> {
 const org=String(form.get('organization')||''),product=String(form.get('product')||''),evidence=String(form.get('evidence')||'').trim();
 if(!uuid.test(org)||!uuid.test(product)||!evidence||Array.from(evidence).length>1000)return {error:'invalid'};
 const path=`${root(org)}/${product}`;
 const params=productDetailContext(form.get('return_query'),form.get('return_revenue'),form.get('return_page'));
 params.set('review_requested','1');
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try {supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {error:'session'};}catch{return {error:'network'};}
 let result;
 try {result=await supabase.rpc('request_product_revenue_review',{p_org:org,p_product:product,p_evidence:evidence});}catch{return {error:'network'};}
 if(result.error)return {error:result.status===0?'network':classifyReviewError(result.error.code)};
 redirect(`${path}?${params}#revenue-review`);
}
export async function savePatentContribution(_previous:import('@/domain/products/patent-contribution').ContributionFormState,form:FormData):Promise<import('@/domain/products/patent-contribution').ContributionFormState> {
 const {parseContribution}=await import('@/domain/products/patent-contribution');
 const org=String(form.get('organization')||''),product=String(form.get('product')||''),patent=String(form.get('patent')||''),amount=parseContribution(form.get('contribution_rate'));
 if(!uuid.test(org)||!uuid.test(product)||!uuid.test(patent)||amount===undefined)return {error:'invalid',saved:null};
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try {supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {error:'session',saved:null};}catch{return {error:'network',saved:null};}
 let result;
 try {result=await supabase.from('product_patent_links').update({contribution_rate:amount}).eq('organization_id',org).eq('product_id',product).eq('patent_id',patent).select('id').maybeSingle();}catch{return {error:'network',saved:null};}
 if(result.error||!result.data)return {error:result.status===0?'network':'save',saved:null};
 const {revalidatePath}=await import('next/cache');revalidatePath(`${root(org)}/${product}`);revalidatePath(`/account/organizations/${org}/patents/${patent}`);
 return {error:null,saved:amount??''};
}
export async function bulkConnectPatents(_previous:import('@/domain/products/bulk-patents').BulkPatentState,form:FormData):Promise<import('@/domain/products/bulk-patents').BulkPatentState> {
 const {parsePatentSelection}=await import('@/domain/products/bulk-patents');
 const org=String(form.get('organization')||''),product=String(form.get('product')||''),patents=parsePatentSelection(form.getAll('patent'));
 if(!uuid.test(org)||!uuid.test(product)||!patents)return {error:'invalid'};
 let supabase:Awaited<ReturnType<typeof createClient>>;
 try {supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {error:'session'};}catch{return {error:'network'};}
 let result;
 try {result=await supabase.from('product_patent_links').insert(patents.map(patent=>({organization_id:org,product_id:product,patent_id:patent})));}catch{return {error:'network'};}
 if(result.error)return {error:result.status===0?'network':result.error.code==='23505'?'duplicate':'save'};
 const {revalidatePath}=await import('next/cache');revalidatePath(`${root(org)}/${product}`);
 return {error:null,linked:patents.length};
}
