import Link from '@/components/navigation-link';
import { patentAccess } from '@/lib/patents/access';
import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { literalSearchPattern } from '@/lib/patents/search';
import type { Product } from '@/domain/products/validation';
import { revenueFilter, productListQuery, previousRevenueYear, productReturnContext, productPageInfo, productPageSize } from '@/domain/products/revenue-filter';
import { ProductForm } from './form';
import { ProductListItem } from './product-list-item';
export default async function Products({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{q?:string;page?:string;deleted?:string;revenue?:string}>}) {
 const {id}=await params,flags=await searchParams,{supabase,organization,canWrite}=await patentAccess(id);
 const filter=revenueFilter(flags.revenue),previousYear=previousRevenueYear(new Date());
 const {q,page}=productReturnContext(flags.q,filter,flags.page);
 const size=productPageSize;
 function filteredProducts(head=false) {
  let query=supabase.from('product_assets').select('id,name,launch_year,revenue_year,revenue_amount,revenue_currency',{count:'exact',head}).eq('organization_id',id);
  if(q)query=query.ilike('name',literalSearchPattern(q));
  if(filter==='missing')query=query.is('revenue_amount',null);
  else if(filter==='present')query=query.not('revenue_amount','is',null);
  else if(filter==='outdated')query=query.lt('revenue_year',previousYear);
  return query;
 }
 const result=await filteredProducts().order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*size,page*size-1);
 // PostgREST can reject an offset beyond the end after a record is removed.
 const recovery=result.status===416&&page>1?await filteredProducts(true):null;
 const {error,count}=recovery??result;
 const list=(result.data||[]) as Product[];
 const link=(n:number)=>productListQuery(q,filter,n);
 const info=productPageInfo(page,count??0,list.length);
 const filterLabel={missing:'매출 미입력',present:'매출 입력됨',outdated:'기준연도 확인','':''}[filter];
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">PRODUCT ASSETS</p><h1>제품 자산</h1><p>{organization.name}의 제품과 매출 기준연도 정보를 관리합니다.</p><nav className="patent-actions" aria-label="제품 자산 빠른 메뉴"><Link className="patent-action" href={`/account/organizations/${id}/patents`}><span className="patent-action-copy"><strong>특허 자산 보기</strong><small>보유 특허 관리</small></span></Link>{canWrite&&<Link className="patent-action" href={`/account/organizations/${id}/recycle-bin`}><span className="patent-action-copy"><strong>휴지통</strong><small>삭제한 제품 복구</small></span></Link>}</nav>
 {flags.deleted&&<p className="form-message" role="status">제품을 삭제했습니다. 30일 이내에 휴지통에서 복구할 수 있습니다.</p>}
 <nav className="patent-actions" aria-label="제품 매출 빠른 필터">
  <Link className="asset-overview-link" href={productListQuery(q,'',1)} aria-current={filter===''?'page':undefined}>전체 제품</Link>
  <Link className="asset-overview-link" href={productListQuery(q,'missing',1)} aria-current={filter==='missing'?'page':undefined}>매출 미입력</Link>
  <Link className="asset-overview-link" href={productListQuery(q,'outdated',1)} aria-current={filter==='outdated'?'page':undefined}>기준연도 확인</Link>
 </nav>
 <p>매출 미입력은 어느 연도에도 매출액을 저장하지 않은 제품입니다. 0으로 입력한 매출은 입력됨으로 표시합니다. 기준연도 확인은 매출 기준연도가 전년도보다 오래된 제품입니다.</p><form key={JSON.stringify([q,filter])} method="get" className="search-form"><label>제품 검색<input type="search" name="q" maxLength={100} defaultValue={q} placeholder="제품명 검색"/></label><label>매출 정보<select name="revenue" defaultValue={filter}><option value="">전체</option><option value="missing">매출 미입력</option><option value="present">매출 입력됨</option><option value="outdated">매출 기준연도 확인</option></select></label><button type="submit">검색</button><Link href={`/account/organizations/${id}/products`}>초기화</Link></form>
 {(q||filter)&&<ul className="patent-actions" aria-label="적용 중인 제품 검색 조건">
  {q&&<li>제품명 <strong>{q}</strong> <Link href={productListQuery('',filter,1)}>검색어 지우기</Link></li>}
  {filter&&<li>매출 <strong>{filterLabel}</strong> <Link href={productListQuery(q,'',1)}>매출 필터 해제</Link></li>}
 </ul>}
 {error||count===null?<LoadError message="제품 목록을 불러오지 못했습니다."/>:<>
  <p>{q||filter?'검색 결과':'등록된 제품'} 전체 {count.toLocaleString('ko-KR')}개{list.length>0&&` · ${info.firstItem.toLocaleString('ko-KR')}–${info.lastItem.toLocaleString('ko-KR')}번째 표시`}</p>
  {list.length>0
   ? <ul className="asset-list">{list.map(product=><ProductListItem key={product.id} org={id} product={product} canWrite={canWrite} q={q} filter={filter} page={page} previousYear={previousYear}/>)}</ul>
   : <EmptyState
      title={page>1?'이 페이지에 제품이 없습니다':q||filter?'검색 결과가 없습니다':'등록된 제품이 없습니다'}
      description={page>1?'같은 검색 조건에서 볼 수 있는 페이지로 이동할 수 있습니다.':q||filter?'검색어 또는 매출 정보 필터를 변경해 주세요.':canWrite?'아래에서 제품 정보를 등록해 보세요.':'제품 등록은 조직 관리자 또는 IP 관리자에게 문의해 주세요.'}
      action={page>1?{href:link(info.last),label:`${info.last}페이지로 돌아가기`}:undefined}/>}
  {list.length>0&&info.last>1&&<nav className="patent-pagination" aria-label="제품 목록 페이지">
   {page>1&&<Link href={link(1)}>첫 페이지</Link>}
   {page>2&&<Link href={link(page-1)}>이전</Link>}
   <span aria-current="page">{page} / {info.last}페이지</span>
   {page<info.last-1&&<Link href={link(page+1)}>다음</Link>}
   {page<info.last&&<Link href={link(info.last)}>마지막 페이지</Link>}
  </nav>}
  {info.capped&&<p>현재 조건에서는 처음 {info.last.toLocaleString('ko-KR')}페이지만 열 수 있습니다. 검색어 또는 매출 필터로 결과를 좁혀 주세요.</p>}
 </>}
 {canWrite&&<><h2 id="register-product">제품 등록</h2><ProductForm org={id} previousYear={previousYear}/></>}<p>제품 매출은 입력된 참고 정보이며, 가치평가에 자동 반영되지 않습니다.</p></div></main>;
}
