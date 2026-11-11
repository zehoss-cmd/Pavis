import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { patentAccess } from '@/lib/patents/access';
import { literalSearchPattern } from '@/lib/patents/search';
import { parseFamilySearch, familyPageSize, familyMaxPage, familyPageQuery } from '@/lib/patents/family-search';
import { manageFamily } from '../actions';

export default async function Families({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string; deleted?: string; q?: string | string[]; page?: string | string[] }> }) {
  const { id } = await params, flags = await searchParams;
  const { q, page } = parseFamilySearch(flags), offset = (page - 1) * familyPageSize;
  const { supabase, organization, canWrite } = await patentAccess(id);
  let request = supabase.from('patent_families').select('id,name').eq('organization_id', id);
  if (q) request = request.ilike('name', literalSearchPattern(q));
  const { data, error } = await request.order('name').order('id').range(offset, offset + familyPageSize);
  const families = (data || []).slice(0, familyPageSize), hasNext = (data?.length || 0) > familyPageSize;
  return <main className="auth-page"><Link href={`/account/organizations/${id}/patents`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card">
    <p className="eyebrow">PATENT FAMILIES</p><h1>특허 패밀리 관리</h1><p>{organization.name} · 이름순 · 페이지당 25개</p>
    {(flags.updated || flags.deleted) && <p className="form-message" role="status">{flags.updated ? '패밀리 이름을 수정했습니다.' : '패밀리를 삭제했습니다.'}</p>}
    {flags.error && <p className="form-message" role="alert">{flags.error === 'linked' ? '이 패밀리에 연결된 특허가 있습니다. 특허의 패밀리 연결을 먼저 해제해 주세요.' : '패밀리를 처리하지 못했습니다. 입력 내용과 권한을 확인해 주세요.'}</p>}
    <form method="get" className="portfolio-asset-search"><label>패밀리 이름 검색<input type="search" name="q" maxLength={100} defaultValue={q} placeholder="패밀리 이름 입력" /></label><SubmitButton>검색</SubmitButton><Link href={`/account/organizations/${id}/patents/families`}>초기화</Link></form>
    {error ? <LoadError message="패밀리를 불러오지 못했습니다."/> : families.length ? <ul className="asset-list">{families.map(family => <li key={family.id}>{canWrite ? <><form action={manageFamily}><input type="hidden" name="organization" value={id}/><input type="hidden" name="family" value={family.id}/><input type="hidden" name="operation" value="update"/><input type="hidden" name="q" value={q}/><input type="hidden" name="page" value={page}/><label>패밀리 이름<input name="name" maxLength={200} defaultValue={family.name} required/></label><SubmitButton>이름 수정</SubmitButton></form><form action={manageFamily}><input type="hidden" name="organization" value={id}/><input type="hidden" name="family" value={family.id}/><input type="hidden" name="operation" value="delete"/><input type="hidden" name="q" value={q}/><input type="hidden" name="page" value={page}/><ConfirmSubmit message={`패밀리 “${family.name}”을 삭제할까요? 30일 내에 복구할 수 있으며 연결된 특허가 있으면 삭제되지 않습니다.`}>패밀리 삭제</ConfirmSubmit></form></> : <strong>{family.name}</strong>}</li>)}</ul> : <EmptyState title={page > 1 ? '이 페이지에 패밀리가 없습니다' : q ? '검색 결과가 없습니다' : '아직 만든 패밀리가 없습니다'} description={page > 1 ? '이전 페이지에서 패밀리를 확인해 주세요.' : q ? '이름을 다시 확인하거나 검색 조건을 초기화해 주세요.' : canWrite ? '특허 자산 화면에서 패밀리를 만들어 관련 특허를 묶어 보세요.' : '패밀리 생성은 조직 관리자 또는 IP 관리자에게 문의해 주세요.'} action={page > 1 ? {href:familyPageQuery(q,page-1),label:'이전 페이지'} : q ? {href:`/account/organizations/${id}/patents/families`,label:'검색 초기화'} : canWrite ? {href:`/account/organizations/${id}/patents#create-family`,label:'패밀리 만들기'} : undefined}/>}
    {!error && (page > 1 || hasNext) && <nav className="patent-pagination" aria-label="패밀리 목록 페이지">{page > 1 && <Link href={familyPageQuery(q, page - 1)}>이전</Link>}<span>{page}페이지</span>{hasNext && page < familyMaxPage && <Link href={familyPageQuery(q, page + 1)}>다음</Link>}{hasNext && page === familyMaxPage && <span>검색 조건을 좁혀 주세요.</span>}</nav>}
    <Link href={`/account/organizations/${id}/patents`}>특허 자산으로</Link>
  </div></main>;
}
