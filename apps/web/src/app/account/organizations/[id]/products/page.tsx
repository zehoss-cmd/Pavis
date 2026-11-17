import Link from 'next/link';
import { patentAccess } from '@/lib/patents/access';
import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { literalSearchPattern } from '@/lib/patents/search';
import type { Product } from '@/domain/products/validation';
import { ProductForm } from './form';
export default async function Products({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{q?:string;page?:string;deleted?:string}>}) {
 const {id}=await params,flags=await searchParams,{supabase,organization,canWrite}=await patentAccess(id);
 const q=typeof flags.q==='string'?flags.q.trim().slice(0,100):'',page=Math.min(1000,Math.max(1,Number.parseInt(flags.page||'1',10)||1)),size=25;
 let query=supabase.from('product_assets').select('id,name,launch_year,revenue_year,revenue_amount,revenue_currency',{count:'exact'}).eq('organization_id',id);
 if(q)query=query.ilike('name',literalSearchPattern(q));
 const {data,error,count}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*size,page*size);
 const list=(data||[]) as Product[],previousYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()))-1;
 const link=(n:number)=>`?${new URLSearchParams({...q?{q}:{},page:String(n)})}`;
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">PRODUCT ASSETS</p><h1>제품 자산</h1><p>{organization.name}의 제품과 연도별 매출 정보를 관리합니다.</p><nav className="patent-actions" aria-label="제품 자산 빠른 메뉴"><Link className="patent-action" href={`/account/organizations/${id}/patents`}><span className="patent-action-copy"><strong>특허 자산 보기</strong><small>보유 특허 관리</small></span></Link>{canWrite&&<Link className="patent-action" href={`/account/organizations/${id}/recycle-bin`}><span className="patent-action-copy"><strong>휴지통</strong><small>삭제한 제품 복구</small></span></Link>}</nav>
 {flags.deleted&&<p className="form-message" role="status">제품을 삭제했습니다. 30일 이내에 휴지통에서 복구할 수 있습니다.</p>}
 <form method="get" className="search-form"><label>제품 검색<input type="search" name="q" maxLength={100} defaultValue={q} placeholder="제품명 검색"/></label><button type="submit">검색</button><Link href={`/account/organizations/${id}/products`}>초기화</Link></form>
 {error?<LoadError message="제품 목록을 불러오지 못했습니다."/>:<><p>{q?'검색 결과':'등록된 제품'} {count??0}개</p>{list.length?<ul className="asset-list">{list.slice(0,size).map(product=><li key={product.id}><Link href={`/account/organizations/${id}/products/${product.id}`}><strong>{product.name}</strong><span>출시 {product.launch_year?`${product.launch_year}년`:'미입력'} · {product.revenue_amount!==null?`${product.revenue_year}년 매출 ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(product.revenue_amount)} ${product.revenue_currency}`:'매출 미입력'}</span></Link></li>)}</ul>:<EmptyState title={q?'검색 결과가 없습니다':'등록된 제품이 없습니다'} description={q?'다른 제품명으로 검색해 주세요.':canWrite?'아래에서 제품 정보를 등록해 보세요.':'제품 등록은 조직 관리자 또는 IP 관리자에게 문의해 주세요.'}/>}{(page>1||list.length>size)&&<nav className="patent-pagination" aria-label="제품 목록 페이지">{page>1&&<Link href={link(page-1)}>이전</Link>}<span>{page}페이지</span>{list.length>size&&page<1000&&<Link href={link(page+1)}>다음</Link>}</nav>}</>}
 {canWrite&&<><h2 id="register-product">제품 등록</h2><ProductForm org={id} previousYear={previousYear}/></>}<p>제품 매출은 입력된 참고 정보이며, 가치평가에 자동 반영되지 않습니다.</p></div></main>;
}
