import Link from '@/components/navigation-link';
import { notFound } from 'next/navigation';
import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { productDetailContext, productListQuery, productReturnContext } from '@/domain/products/revenue-filter';
import { productYear } from '@/domain/products/validation';
import { patentAccess } from '@/lib/patents/access';
import { isSelfReview,reviewAppliesToCurrent,reviewHistoryMaxPage,reviewHistoryPage,reviewHistoryPageSize,reviewStatusLabel } from '@/domain/products/revenue-review-history';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Review={id:string;requester_id:string;reviewer_id:string|null;product_name:string;revenue_year:number;revenue_amount:number;revenue_currency:string;revenue_revision:number;evidence:string;status:string;review_note:string|null;created_at:string;reviewed_at:string|null};
const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value));
export default async function RevenueReviewHistory({params,searchParams}:{params:Promise<{id:string;productId:string}>;searchParams:Promise<{page?:string|string[];year?:string|string[];return_query?:string;return_revenue?:string;return_page?:string}>}) {
 const {id,productId}=await params;if(!uuid.test(productId))notFound();
 const {supabase,organization}=await patentAccess(id),flags=await searchParams,page=reviewHistoryPage(flags.page),size=reviewHistoryPageSize;
 const {data:product,error:productError}=await supabase.from('product_assets').select('id,name,revenue_revision').eq('organization_id',id).eq('id',productId).maybeSingle();
 if(productError)return <main className="auth-page"><LoadError message="제품 정보를 불러오지 못했습니다."/></main>;
 if(!product)notFound();
 const year=productYear(flags.year);
 let reviews=supabase.from('product_revenue_reviews').select('id,requester_id,reviewer_id,product_name,revenue_year,revenue_amount,revenue_currency,revenue_revision,evidence,status,review_note,created_at,reviewed_at',{count:'exact'}).eq('organization_id',id).eq('product_id',productId);
 if(year!==null)reviews=reviews.eq('revenue_year',year);
 const {data,error,count}=await reviews.order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*size,page*size);
 const rows=(data||[]) as Review[],base=`/account/organizations/${id}/products/${productId}`;
 const context=productReturnContext(flags.return_query,flags.return_revenue,flags.return_page);
 const returnParams=productDetailContext(context.q,context.filter,String(context.page));
 const returnSearch=returnParams.toString();
 const detailHref=`${base}${returnSearch?`?${returnSearch}`:''}#${year===null?'revenue-review':'annual-revenue'}`;
 const historyHref=(nextPage:number)=>{
  const params=new URLSearchParams(returnParams);
  if(year!==null)params.set('year',String(year));
  if(nextPage>1)params.set('page',String(nextPage));
  return `?${params}`;
 };
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">REVENUE REVIEW HISTORY</p><h1>{year===null?'매출 검토 이력':`${year}년 매출 검토 이력`}</h1><p>{organization.name} · {product.name}</p><p>요청 당시의 매출 정보와 제출 근거, 운영자 의견을 확인합니다. 검토는 외부 감사나 매출액의 확정을 의미하지 않습니다.</p><Link className="asset-overview-link" href={detailHref}>제품 상세로</Link> <Link className="asset-overview-link" href={`/account/organizations/${id}/products${productListQuery(context.q,context.filter,context.page)}`}>제품 목록으로</Link>
 {year!==null&&<p><Link href={`?${returnParams}`}>전체 연도 검토 이력</Link></p>}
 {error||count===null?<LoadError message="매출 검토 이력을 불러오지 못했습니다."/>:<><p>총 {count}건 · 최근 요청순 · 한국 시간</p>{rows.length?<div className="revenue-history-list">{rows.slice(0,size).map(row=>{const current=reviewAppliesToCurrent(row.revenue_revision,product.revenue_revision);return <article className="revenue-history-item" key={row.id}><div className="revenue-history-heading"><h2>{reviewStatusLabel(row.status)}</h2><span className={current?'revenue-history-current':'revenue-history-previous'}>{current?'현재 제품 정보':'이전 제품 정보'}</span></div><p><strong>제출 당시 제품명:</strong> {row.product_name}</p><p><strong>제출 당시 매출:</strong> {row.revenue_year}년 · {new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(row.revenue_amount)} {row.revenue_currency}</p><p><strong>요청:</strong> {date(row.created_at)}{row.reviewed_at&&<> · <strong>검토:</strong> {date(row.reviewed_at)}</>}</p><p className="revenue-history-text"><strong>제출 근거:</strong> {row.evidence}</p>{row.review_note&&<p className="revenue-history-text"><strong>운영자 의견:</strong> {row.review_note}</p>}{isSelfReview(row.requester_id,row.reviewer_id)&&<p>제출자 본인이 운영자로 검토한 기록입니다.</p>}{!current&&<p>제품명 또는 매출이 변경되어 이 기록은 현재 정보에 적용되지 않습니다.</p>}</article>;})}</div>:<EmptyState title={page>1?'이 페이지에 검토 이력이 없습니다':'아직 검토 이력이 없습니다'} description={page>1?'이전 페이지를 확인해 주세요.':'제품 상세에서 매출 근거를 제출해 검토를 요청할 수 있습니다.'} action={page>1?{href:historyHref(page-1),label:'이전 페이지'}:{href:detailHref,label:'제품 상세로'}}/>}{(page>1||rows.length>size)&&<nav className="patent-pagination" aria-label="매출 검토 이력 페이지">{page>1&&<Link href={historyHref(page-1)}>이전</Link>}<span>{page}페이지</span>{rows.length>size&&page<reviewHistoryMaxPage&&<Link href={historyHref(page+1)}>다음</Link>}{rows.length>size&&page===reviewHistoryMaxPage&&<span>표시 가능한 페이지 한도입니다.</span>}</nav>}</>}
 </div></main>;
}
