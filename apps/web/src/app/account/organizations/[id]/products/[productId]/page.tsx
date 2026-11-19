import Link from '@/components/navigation-link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { LoadError } from '@/components/load-error';
import type { Product } from '@/domain/products/validation';
import { ProductForm } from '../form';
import { deleteProduct } from '../actions';
import { ProductPatentLinks } from './patent-links';
import { ValuationReadiness } from './valuation-readiness';
import { RevenueReview, currentReviewStatus, loadLatestRevenueReview } from './revenue-review';
import { revenueFilter } from '@/domain/products/revenue-filter';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function ProductDetail({params,searchParams}:{params:Promise<{id:string;productId:string}>;searchParams:Promise<{saved?:string;error?:string;review_requested?:string;review_error?:string;return_revenue?:string;asset_field?:string|string[];asset_query?:string|string[];choice_page?:string|string[];linked_page?:string|string[];linked?:string;unlinked?:string;link_error?:string}>}) {
 const {id,productId}=await params;if(!uuid.test(productId))notFound();
 const {supabase,organization,canWrite,canReadValuation}=await patentAccess(id),flags=await searchParams;
 const {data,error}=await supabase.from('product_assets').select('id,name,launch_year,revenue_year,revenue_amount,revenue_currency,revenue_revision').eq('organization_id',id).eq('id',productId).maybeSingle();
 if(error)return <main className="auth-page"><LoadError message="제품 정보를 불러오지 못했습니다."/></main>;
 if(!data)notFound();const product=data as Product,previousYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()))-1;
 const countLinks=()=>supabase.from('product_patent_links').select('patent_id',{count:'exact',head:true}).eq('organization_id',id).eq('product_id',productId);
 const [review,linked,missing]=await Promise.all([
  loadLatestRevenueReview(supabase,id,productId),
  countLinks(),
  countLinks().is('contribution_rate',null),
 ]);
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">PRODUCT DETAIL</p><h1>{product.name}</h1><p>{organization.name} · 출시 {product.launch_year?`${product.launch_year}년`:'미입력'}</p><p>{product.revenue_amount!==null?`${product.revenue_year}년 매출 ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(product.revenue_amount)} ${product.revenue_currency}`:'매출 미입력'}</p>{flags.saved&&<p className="form-message" role="status">제품 정보를 저장했습니다.</p>}{flags.error&&<p className="form-message" role="alert">{flags.error==='linked'?'연결된 특허가 있습니다. 제품을 삭제하려면 먼저 특허 연결을 해제해 주세요.':'삭제하지 못했습니다. 권한과 상태를 확인해 주세요.'}</p>}<ValuationReadiness revenueYear={product.revenue_year} hasRevenue={product.revenue_amount!==null} previousYear={previousYear} reviewStatus={currentReviewStatus(review,data.revenue_revision)} linkedCount={linked.error?null:linked.count} missingCount={missing.error?null:missing.count} canWrite={canWrite} valuationHref={canReadValuation?`/account/organizations/${id}/valuations`:undefined}/><RevenueReview org={id} product={product.id} revision={data.revenue_revision} hasRevenue={product.revenue_amount!==null} canWrite={canWrite} review={review} returnRevenue={revenueFilter(flags.return_revenue)} flags={flags}/><ProductPatentLinks org={id} product={product.id} canWrite={canWrite} supabase={supabase} flags={flags}/>{canWrite&&<><h2 id="edit-product">정보 수정</h2><ProductForm org={id} product={product} previousYear={previousYear} returnRevenue={revenueFilter(flags.return_revenue)}/><form action={deleteProduct}><input type="hidden" name="organization" value={id}/><input type="hidden" name="product" value={product.id}/><ConfirmSubmit message={`제품 “${product.name}”을 삭제할까요? 삭제 후 30일 동안 휴지통에서 복구할 수 있습니다. 연결된 특허가 있으면 먼저 연결을 해제해 주세요.`}>제품 삭제</ConfirmSubmit></form></>}<Link href={`/account/organizations/${id}/products${revenueFilter(flags.return_revenue)?`?revenue=${revenueFilter(flags.return_revenue)}`:''}`}>제품 목록으로</Link></div></main>;
}
