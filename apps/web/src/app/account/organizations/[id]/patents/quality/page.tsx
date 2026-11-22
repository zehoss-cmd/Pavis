import Link from '@/components/navigation-link';
import { LoadError } from '@/components/load-error';
import { patentAccess } from '@/lib/patents/access';
import { pageSize, maxPage, parsePatentSearch, patentPageQuery } from '@/lib/patents/search';
import { patentQualityContext, patentQualityRules, type QualityAsset } from '@/domain/patents/quality';

export default async function PatentQuality({params,searchParams}:{
 params:Promise<{id:string}>;
 searchParams:Promise<{page?:string;rule?:string;return_list?:string}>;
}) {
 const {id}=await params;
 const {supabase,organization}=await patentAccess(id);
 const flags=await searchParams;
 const {page}=parsePatentSearch(flags);
 const selectedRule=patentQualityRules.find(([number])=>String(number)===flags.rule);
 const base=`/account/organizations/${id}/patents`;
 const from=(page-1)*pageSize;
 const {data,error,status}=await supabase.from('patent_assets')
  .select('id,title,jurisdiction,family_id,rights_holder,inventors,application_number,publication_number,registration_number,filing_date,priority_date,verified_date,legal_status,source')
  .eq('organization_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+pageSize);
 const context=patentQualityContext(new Date());
 const assets:QualityAsset[]=(data??[]).slice(0,pageSize);
 const checks=patentQualityRules.map(([number,label,check])=>({number,label,matches:assets.filter(asset=>check(asset,context))}));
 const shown=selectedRule?checks.filter(check=>check.number===selectedRule[0]):checks;
 const href=(next:number,rule?:number)=>{
  const query=new URLSearchParams();
  if(next>1)query.set('page',String(next));
  if(rule)query.set('rule',String(rule));
  return `?${query}`;
 };
 const listSearch=patentPageQuery(parsePatentSearch({page:String(page)}),page).slice(1);
 return <main className="auth-page"><div className="auth-card patent-card">
  <h1>특허 데이터 품질 점검</h1>
  <p>{organization.name} · 현재 페이지의 특허 {assets.length}건 · 기준일 {context.today}</p>
  <p>번호 형식, 날짜 순서와 상태 조합은 검토 참고 사항입니다. 관할과 특허 상황에 따라 예외가 있을 수 있습니다.</p>
  <Link className="asset-overview-link" href={base}>특허 목록으로</Link>
  {error&&status!==416?<LoadError message="특허 데이터를 불러오지 못했습니다."/>:<>
   <form method="get" className="search-form">
    {page>1&&<input type="hidden" name="page" value={page}/>}
    <label>점검 항목<select name="rule" defaultValue={selectedRule?.[0]??''}>
     <option value="">전체 50개 항목</option>
     {patentQualityRules.map(([number,label])=><option key={number} value={number}>{label}</option>)}
    </select></label>
    <button type="submit">점검 항목 보기</button>
   </form>
   {!assets.length?<p>이 페이지에 점검할 특허가 없습니다.</p>:<ul className="asset-list">
    {shown.map(({number,label,matches})=><li key={number}>
     <details open={!!selectedRule||undefined}>
      <summary>{label} · {matches.length}건</summary>
      {matches.length>0?<ul>{matches.map(asset=><li key={asset.id}><Link href={`${base}/${asset.id}${listSearch?`?${new URLSearchParams({return_list:listSearch})}`:''}`}>{asset.title?.trim()||'제목 없는 특허'}{asset.application_number&&` · ${asset.application_number}`}</Link></li>)}</ul>:<p>현재 페이지에서 해당 항목이 발견되지 않았습니다.</p>}
     </details>
    </li>)}
   </ul>}
   <nav className="patent-pagination" aria-label="특허 품질 점검 페이지">
    {page>1&&<Link href={href(1,selectedRule?.[0])}>첫 페이지</Link>}
    {page>2&&<Link href={href(page-1,selectedRule?.[0])}>이전 페이지</Link>}
    <span aria-current="page">{page}페이지</span>
    {(data?.length??0)>pageSize&&page<maxPage&&<Link href={href(page+1,selectedRule?.[0])}>다음 페이지</Link>}
   </nav>
   {page===maxPage&&(data?.length??0)>pageSize&&<p>표시 가능한 페이지 한도에 도달했습니다.</p>}
  </>}
 </div></main>;
}
