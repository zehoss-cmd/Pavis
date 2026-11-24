import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { DownloadButton } from '@/components/download-button';
import { SubmitButton } from '@/components/submit-button';
import Link from '@/components/navigation-link';
import { patentAccess } from '@/lib/patents/access';
import { patentIdentifierPattern, literalSearchPattern, maxPage, pageSize, parsePatentSearch, patentPageQuery, searchFields, type SearchParams } from '@/lib/patents/search';
import { createFamily } from './actions';
import { AssetForm,statusLabels,type Asset,type Family } from './form';
import { PatentCountryOverview } from './country-overview';
import { summarizeCountries } from '@/lib/patents/country-overview';
import { PatentStatusOverview } from './status-overview';
import { patentStatuses } from '@/lib/patents/search';

export default async function Patents({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) {
  const {id}=await params, flags=await searchParams;
  const {supabase,organization,canWrite}=await patentAccess(id);
  const search=parsePatentSearch(flags);
  const from=(search.page-1)*pageSize;
  function filteredPatents(head=false) {
    let query=supabase.from('patent_assets').select('id,title,jurisdiction,application_number,legal_status',{count:'exact',head}).eq('organization_id',id);
    if(search.q) {
      const pattern=patentIdentifierPattern(search.field,search.q);
      query=pattern?query.filter(search.field,'imatch',pattern):query.ilike(search.field,literalSearchPattern(search.q));
    }
    if(search.country) query=query.eq('jurisdiction',search.country);
    if(search.status) query=query.eq('legal_status',search.status);
    if(search.family) query=query.eq('family_id',search.family);
    return query;
  }
  const ordered=search.sort==='title'
    ? filteredPatents().order('title').order('id')
    : filteredPatents().order('created_at',{ascending:search.sort==='oldest'}).order('id',{ascending:search.sort==='oldest'});
  const [result,{data:families,error:familyError},countryResult]=await Promise.all([
    ordered.range(from,from+pageSize-1),
    supabase.from('patent_families').select('id,name').eq('organization_id',id).order('name').limit(200),
    supabase.from('patent_assets').select('jurisdiction',{count:'exact'}).eq('organization_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1000),
  ]);
  const statusResults=await Promise.all([
    supabase.from('patent_assets').select('id',{count:'exact',head:true}).eq('organization_id',id),
    ...patentStatuses.map(status=>supabase.from('patent_assets').select('id',{count:'exact',head:true}).eq('organization_id',id).eq('legal_status',status)),
  ]);
  const statusError=statusResults.some(result=>result.error||result.count===null);
  const statusCounts={total:statusResults[0].count??0,byStatus:Object.fromEntries(patentStatuses.map((status,index)=>[status,statusResults[index+1].count??0]))};
  const recovery=result.status===416&&search.page>1?await filteredPatents(true):null;
  const {error:assetError,count}=recovery??result;
  const assets=result.data??[];
  const last=Math.min(maxPage,Math.max(1,Math.ceil((count??0)/pageSize)));
  const listContext=patentPageQuery(search,search.page).slice(1);
  const detailSearch=listContext?`?${new URLSearchParams({return_list:listContext})}`:'';
  const pageHref=(page:number)=>patentPageQuery(search,page);
  const sortLabel={newest:'최근 등록순',oldest:'오래된 등록순',title:'명칭순'}[search.sort];
  const familyList=(families || []) as Family[];
  const filtered=!!(search.q || search.country || search.status || search.family);
  return <main className="auth-page"><Link href={`/account/organizations/${id}`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">PATENT ASSETS</p><h1>특허 자산</h1><p>{organization.name}의 특허를 살펴보세요.</p><nav className="patent-actions" aria-label="특허 자산 빠른 메뉴"><Link className="patent-action" href={`/account/organizations/${id}/patents/quality`}><span className="patent-action-copy"><strong>데이터 품질 점검</strong><small>보완할 특허 정보 확인</small></span></Link><Link className="patent-action" href={`/account/organizations/${id}/intelligence`}><span className="patent-action-icon" aria-hidden="true">◎</span><span className="patent-action-copy"><strong>국가별 특허 지도</strong><small>국가별 자산과 상태 확인</small></span></Link>{canWrite && <Link className="patent-action" href={`/account/organizations/${id}/patents/external`}><span className="patent-action-icon" aria-hidden="true">⌕</span><span className="patent-action-copy"><strong>외부 특허 조회</strong><small>출원번호로 정보 가져오기</small></span></Link>}{canWrite && <Link className="patent-action" href={`/account/organizations/${id}/patents/import`}><span className="patent-action-icon" aria-hidden="true">▤</span><span className="patent-action-copy"><strong>CSV·XLSX 일괄 가져오기</strong><small>파일로 특허 등록</small></span></Link>}<Link className="patent-action" href={`/account/organizations/${id}/portfolios`}><span className="patent-action-icon" aria-hidden="true">▦</span><span className="patent-action-copy"><strong>포트폴리오 보기</strong><small>특허를 모아 관리</small></span></Link><Link className="patent-action" href={`/account/organizations/${id}/patents/families`}><span className="patent-action-icon" aria-hidden="true">◇</span><span className="patent-action-copy"><strong>패밀리 관리</strong><small>관련 특허 묶음 관리</small></span></Link>{canWrite && <Link className="patent-action" href={`/account/organizations/${id}/recycle-bin`}><span className="patent-action-icon" aria-hidden="true">▧</span><span className="patent-action-copy"><strong>휴지통</strong><small>삭제한 항목 복구</small></span></Link>}</nav>{search.family && <p>선택한 패밀리에 연결된 특허만 표시합니다. <Link href={`/account/organizations/${id}/intelligence?family=${search.family}`}>패밀리 지도 보기</Link></p>}<p>법적 상태와 권리 정보는 입력한 출처에서 별도 확인이 필요합니다.</p>{!search.family && (statusError?<LoadError message="특허 현황을 불러오지 못했습니다."/>:<PatentStatusOverview counts={statusCounts} activeStatus={search.status}/>)} {!search.family && (countryResult.error||countryResult.count===null||!countryResult.data?<LoadError message="국가별 특허 현황을 불러오지 못했습니다."/>:<PatentCountryOverview countries={summarizeCountries(countryResult.data)} sampleCount={countryResult.data.length} totalCount={countryResult.count} activeCountry={search.country}/>)}{flags.deleted && <p className="form-message" role="status">특허를 삭제했습니다.</p>}{flags.family_created && <p className="form-message" role="status">패밀리를 만들었습니다.</p>}{flags.error && <p className="form-message" role="alert">{flags.error==='duplicate' ? '같은 국가에 동일한 출원번호가 이미 등록되어 있습니다.' : '저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.'}</p>}
    <form key={JSON.stringify([search.field,search.q,search.country,search.status,search.family,search.sort])} method="get" className="search-form patent-search">{search.family && <input type="hidden" name="family" value={search.family}/>}<label>검색 항목<select name="field" defaultValue={search.field}>{Object.entries(searchFields).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>검색어<input type="search" name="q" maxLength={100} defaultValue={search.q} placeholder="검색어를 입력하세요"/></label><label>국가 코드<input name="country" maxLength={2} minLength={2} pattern="[A-Za-z]{2}" defaultValue={search.country} placeholder="예: KR"/></label><label>법적 상태<select name="status" defaultValue={search.status}><option value="">전체</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>정렬<select name="sort" defaultValue={search.sort}><option value="newest">최근 등록순</option><option value="oldest">오래된 등록순</option><option value="title">명칭순</option></select></label><div className="search-actions"><SubmitButton>검색</SubmitButton><Link href={`/account/organizations/${id}/patents`}>초기화</Link></div></form>
    <ul className="patent-actions" aria-label="적용 중인 특허 검색 조건">
      {search.q&&<li>{searchFields[search.field]} <strong>{search.q}</strong> <Link href={patentPageQuery({...search,q:''},1)}>검색어 지우기</Link></li>}
      {search.country&&<li>관할 <strong>{search.country}</strong> <Link href={patentPageQuery({...search,country:''},1)}>관할 해제</Link></li>}
      {search.status&&<li>법적 상태 <strong>{statusLabels[search.status]}</strong> <Link href={patentPageQuery({...search,status:''},1)}>법적 상태 해제</Link></li>}
      <li>정렬 <strong>{sortLabel}</strong></li>
    </ul>
    {!assetError&&<div className="patent-export"><DownloadButton href={`/account/organizations/${id}/patents/export${patentPageQuery(search,1)}`} filename="pavis-patents.csv" format="csv">검색 결과 CSV 다운로드</DownloadButton><p>현재 적용된 검색 조건의 전체 결과를 최대 1,000건까지 내려받습니다. 1,000건을 초과하면 조건을 좁혀 주세요.</p></div>}
    {assetError||count===null ? <LoadError message="특허 목록을 불러오지 못했습니다."/> : <><p>{filtered?'검색 결과':'등록된 특허'} 전체 {count.toLocaleString('ko-KR')}건{assets.length>0&&` · ${(from+1).toLocaleString('ko-KR')}–${(from+assets.length).toLocaleString('ko-KR')}번째 표시`}</p>{assets.length ? <><ul className="asset-list">{assets.map((asset:Pick<Asset,'id'|'title'|'jurisdiction'|'application_number'|'legal_status'>)=><li key={asset.id}><Link href={`/account/organizations/${id}/patents/${asset.id}${detailSearch}`}><strong>{asset.title}</strong><span>{asset.jurisdiction} · {asset.application_number || '출원번호 미입력'} · {statusLabels[asset.legal_status] || '미확인'}</span></Link></li>)}</ul></> : <EmptyState title={search.page>1 ? '이 페이지에 특허가 없습니다' : filtered ? '검색 결과가 없습니다' : '아직 등록된 특허가 없습니다'} description={search.page>1 ? '같은 검색 조건에서 볼 수 있는 페이지로 이동할 수 있습니다.' : filtered ? '검색어 또는 필터를 바꿔 다시 찾아보세요.' : canWrite ? familyError ? '패밀리 목록을 불러온 뒤 직접 등록할 수 있습니다. 잠시 후 다시 시도해 주세요.' : '직접 등록하거나 파일을 가져와 특허 관리를 시작하세요.' : '특허 등록은 조직 관리자 또는 IP 관리자에게 문의해 주세요.'} action={search.page>1 ? {href:pageHref(last),label:`${last}페이지로 돌아가기`} : filtered ? {href:`/account/organizations/${id}/patents`,label:'검색 초기화'} : canWrite && !familyError ? {href:'#register-patent',label:'특허 등록하기'} : undefined}/>}</>}
    {!assetError&&count!==null&&assets.length>0&&last>1&&<nav className="patent-pagination" aria-label="특허 목록 페이지">
      {search.page>1&&<Link href={pageHref(1)}>첫 페이지</Link>}
      {search.page>2&&<Link href={pageHref(search.page-1)}>이전</Link>}
      <span aria-current="page">{search.page} / {last}페이지</span>
      {search.page<last-1&&<Link href={pageHref(search.page+1)}>다음</Link>}
      {search.page<last&&<Link href={pageHref(last)}>마지막 페이지</Link>}
    </nav>}
    {!assetError&&count!==null&&count>maxPage*pageSize&&<p>처음 {maxPage.toLocaleString('ko-KR')}페이지만 열 수 있습니다. 검색 조건을 좁혀 주세요.</p>}
    {familyError && <LoadError message="패밀리 목록을 불러오지 못했습니다."/>}{canWrite && !familyError && <><h2 id="create-family">패밀리 만들기</h2><form action={createFamily}><input type="hidden" name="organization" value={id}/><label>패밀리 이름<input name="name" maxLength={200} required/></label><SubmitButton>패밀리 생성</SubmitButton></form><h2 id="register-patent">특허 등록</h2><AssetForm org={id} families={familyList}/></>}<Link href={`/account/organizations/${id}`}> 조직 관리로</Link></div></main>;
}
