import Link from 'next/link';
import { patentAccess } from '@/lib/patents/access';
import { literalSearchPattern, maxPage, pageSize, parsePatentSearch, patentPageQuery, searchFields, type SearchParams } from '@/lib/patents/search';
import { createFamily } from './actions';
import { AssetForm,statusLabels,type Asset,type Family } from './form';

export default async function Patents({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) {
  const {id}=await params, flags=await searchParams;
  const {supabase,organization,canWrite}=await patentAccess(id);
  const search=parsePatentSearch(flags);
  const from=(search.page-1)*pageSize;
  let query=supabase.from('patent_assets').select('id,title,jurisdiction,application_number,legal_status').eq('organization_id',id);
  if(search.q) query=query.ilike(search.field,literalSearchPattern(search.q));
  if(search.country) query=query.eq('jurisdiction',search.country);
  if(search.status) query=query.eq('legal_status',search.status);
  if(search.sort==='title') query=query.order('title',{ascending:true}).order('id',{ascending:true});
  else query=query.order('created_at',{ascending:search.sort==='oldest'}).order('id',{ascending:search.sort==='oldest'});
  const [{data:results,error:assetError},{data:families,error:familyError}]=await Promise.all([query.range(from,from+pageSize),supabase.from('patent_families').select('id,name').eq('organization_id',id).order('name').limit(200)]);
  const assets=results?.slice(0,pageSize);
  const hasNext=(results?.length || 0)>pageSize;
  const familyList=(families || []) as Family[];
  const filtered=!!(search.q || search.country || search.status);
  return <main className="auth-page"><Link href={`/account/organizations/${id}`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">PATENT ASSETS</p><h1>특허 자산</h1><p>{organization.name}의 특허를 살펴보세요.</p><Link href={`/account/organizations/${id}/portfolios`}>포트폴리오 보기 →</Link><br/><Link href={`/account/organizations/${id}/patents/families`}>패밀리 관리 →</Link>{canWrite && <><br/><Link href={`/account/organizations/${id}/recycle-bin`}>휴지통 →</Link></>}<p>법적 상태와 권리 정보는 입력한 출처에서 별도 확인이 필요합니다.</p>{flags.deleted && <p className="form-message" role="status">특허를 삭제했습니다.</p>}{flags.family_created && <p className="form-message" role="status">패밀리를 만들었습니다.</p>}{flags.error && <p className="form-message" role="alert">{flags.error==='duplicate' ? '같은 국가에 동일한 출원번호가 이미 등록되어 있습니다.' : '저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.'}</p>}
    <form key={JSON.stringify([search.field,search.q,search.country,search.status,search.sort])} method="get" className="search-form patent-search"><label>검색 항목<select name="field" defaultValue={search.field}>{Object.entries(searchFields).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>검색어<input type="search" name="q" maxLength={100} defaultValue={search.q} placeholder="검색어를 입력하세요"/></label><label>국가 코드<input name="country" maxLength={2} minLength={2} pattern="[A-Za-z]{2}" defaultValue={search.country} placeholder="예: KR"/></label><label>법적 상태<select name="status" defaultValue={search.status}><option value="">전체</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>정렬<select name="sort" defaultValue={search.sort}><option value="newest">최근 등록순</option><option value="oldest">오래된 등록순</option><option value="title">명칭순</option></select></label><div className="search-actions"><button type="submit">검색</button><Link href={`/account/organizations/${id}/patents`}>초기화</Link></div></form>
    {assetError ? <p className="form-message" role="alert">특허 목록을 불러오지 못했습니다.</p> : assets?.length ? <><p>페이지당 {pageSize}건 · {search.page}페이지</p><ul className="asset-list">{assets.map((asset:Pick<Asset,'id'|'title'|'jurisdiction'|'application_number'|'legal_status'>)=><li key={asset.id}><Link href={`/account/organizations/${id}/patents/${asset.id}`}><strong>{asset.title}</strong><span>{asset.jurisdiction} · {asset.application_number || '출원번호 미입력'} · {statusLabels[asset.legal_status] || '미확인'}</span></Link></li>)}</ul></> : <p>{filtered ? '검색 결과가 없습니다.' : search.page>1 ? '이 페이지에 특허가 없습니다.' : '아직 등록된 특허가 없습니다.'}</p>}
    {!assetError && (search.page>1 || hasNext) && <nav className="patent-pagination" aria-label="특허 목록 페이지">{search.page>1 && <Link href={patentPageQuery(search,search.page-1)}>← 이전</Link>}<span>{search.page}페이지</span>{hasNext && search.page<maxPage && <Link href={patentPageQuery(search,search.page+1)}>다음 →</Link>}{hasNext && search.page===maxPage && <span>검색 조건을 좁혀 주세요.</span>}</nav>}
    {familyError && <p className="form-message" role="alert">패밀리 목록을 불러오지 못했습니다.</p>}{canWrite && !familyError && <><h2>패밀리 만들기</h2><form action={createFamily}><input type="hidden" name="organization" value={id}/><label>패밀리 이름<input name="name" maxLength={200} required/></label><button type="submit">패밀리 생성</button></form><h2>특허 등록</h2><AssetForm org={id} families={familyList}/></>}<Link href={`/account/organizations/${id}`}>← 조직 관리로</Link></div></main>;
}
