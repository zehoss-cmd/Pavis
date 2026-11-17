import Link from 'next/link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { LoadError } from '@/components/load-error';
import type { Product } from '@/domain/products/validation';
import { ProductForm } from '../form';
import { deleteProduct } from '../actions';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function ProductDetail({params,searchParams}:{params:Promise<{id:string;productId:string}>;searchParams:Promise<{saved?:string;error?:string}>}) {
 const {id,productId}=await params;if(!uuid.test(productId))notFound();
 const {supabase,organization,canWrite}=await patentAccess(id),flags=await searchParams;
 const {data,error}=await supabase.from('product_assets').select('id,name,launch_year,revenue_year,revenue_amount,revenue_currency').eq('organization_id',id).eq('id',productId).maybeSingle();
 if(error)return <main className="auth-page"><LoadError message="제품 정보를 불러오지 못했습니다."/></main>;
 if(!data)notFound();const product=data as Product,previousYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()))-1;
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">PRODUCT DETAIL</p><h1>{product.name}</h1><p>{organization.name} · 출시 {product.launch_year?`${product.launch_year}년`:'미입력'}</p><p>{product.revenue_amount!==null?`${product.revenue_year}년 매출 ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(product.revenue_amount)} ${product.revenue_currency}`:'매출 미입력'}</p>{flags.saved&&<p className="form-message" role="status">제품 정보를 저장했습니다.</p>}{flags.error&&<p className="form-message" role="alert">삭제하지 못했습니다. 권한과 상태를 확인해 주세요.</p>}{canWrite&&<><h2>정보 수정</h2><ProductForm org={id} product={product} previousYear={previousYear}/><form action={deleteProduct}><input type="hidden" name="organization" value={id}/><input type="hidden" name="product" value={product.id}/><ConfirmSubmit message={`제품 “${product.name}”을 삭제할까요? 삭제 후 30일 동안 휴지통에서 복구할 수 있습니다.`}>제품 삭제</ConfirmSubmit></form></>}<Link href={`/account/organizations/${id}/products`}>제품 목록으로</Link></div></main>;
}
