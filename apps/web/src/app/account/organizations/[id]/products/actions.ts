'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseProduct, type ProductFormState } from '@/domain/products/validation';
import { revenueFilter } from '@/domain/products/revenue-filter';
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
 const returnRevenue=revenueFilter(form.get('return_revenue'));
 redirect(`${root(org)}/${result.data.id}?saved=1${returnRevenue?`&return_revenue=${returnRevenue}`:''}`);
}
export async function deleteProduct(form:FormData) {
 const org=String(form.get('organization')||''),id=String(form.get('product')||'');
 if(!uuid.test(org)||!uuid.test(id)) redirect('/account');
 const supabase=await createClient(),{data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user) redirect('/login');
 const {data,error}=await supabase.from('product_assets').delete().eq('organization_id',org).eq('id',id).select('id').maybeSingle();
 if(error||!data)redirect(`${root(org)}/${id}?error=${error?.code==='23503'?'linked':'delete'}`);
 redirect(`${root(org)}?deleted=1`);
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
