import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { LoadError } from '@/components/load-error';
import { SubmitButton } from '@/components/submit-button';
import { literalSearchPattern } from '@/lib/patents/search';
import { patentAccess } from '@/lib/patents/access';
import { familyAssetQuery, familyMaxPage, familyPageQuery, familyPageSize, parseFamilySearch } from '@/lib/patents/family-search';
import { statusLabels } from '../../form';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FamilyAssets({ params, searchParams }: {
  params: Promise<{ id: string; familyId: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { id, familyId } = await params;
  if (!uuid.test(familyId)) notFound();
  const { supabase, organization } = await patentAccess(id);
  const { q, page } = parseFamilySearch(await searchParams);
  const offset = (page - 1) * familyPageSize;
  const { data: family, error: familyError } = await supabase.from('patent_families')
    .select('id,name').eq('organization_id', id).eq('id', familyId).maybeSingle();
  if (!family && !familyError) notFound();
  let query = supabase.from('patent_assets')
    .select('id,title,jurisdiction,application_number,legal_status')
    .eq('organization_id', id).eq('family_id', familyId);
  if (q) query = query.ilike('title', literalSearchPattern(q));
  const result = family ? await query.order('title').order('id').range(offset, offset + familyPageSize) : null;
  const assets = (result?.data || []).slice(0, familyPageSize);
  const hasNext = (result?.data?.length || 0) > familyPageSize;
  return <main className="auth-page"><Link href={`/account/organizations/${id}/patents`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card">
    <p className="eyebrow">PATENT FAMILY</p><h1>{family?.name || '패밀리'}</h1><p>{organization.name} · 연결된 특허 · 이름순</p>
    <p>조직에서 직접 연결한 특허만 표시됩니다. 공식 특허 패밀리 정보는 별도 확인해 주세요.</p><p><Link href={`/account/organizations/${id}/intelligence?family=${familyId}`}>이 패밀리의 국가별 지도 보기</Link></p>
    {family && <form method="get" className="portfolio-asset-search"><label>특허명 검색<input type="search" name="q" maxLength={100} defaultValue={q} placeholder="특허명 입력" /></label><SubmitButton>검색</SubmitButton><Link href={`/account/organizations/${id}/patents/families/${familyId}`}>초기화</Link></form>}
    {familyError || result?.error ? <LoadError message="패밀리와 연결 특허를 불러오지 못했습니다."/> : assets.length ? <ul className="asset-list">{assets.map(asset => <li key={asset.id}><Link href={`/account/organizations/${id}/patents/${asset.id}${familyAssetQuery(q, page, familyId)}`}><strong>{asset.title}</strong><span>{asset.jurisdiction} · {asset.application_number || '출원번호 미입력'} · {statusLabels[asset.legal_status] || '미확인'}</span></Link></li>)}</ul> : <EmptyState title={page > 1 ? '이 페이지에 특허가 없습니다' : q ? '검색 결과가 없습니다' : '연결된 특허가 없습니다'} description={page > 1 ? '이전 페이지에서 특허를 확인해 주세요.' : q ? '특허명을 바꾸거나 검색을 초기화해 주세요.' : '특허 상세 화면의 정보 수정에서 패밀리를 연결할 수 있습니다.'} action={page > 1 ? { href: familyPageQuery(q, page - 1), label: '이전 페이지' } : q ? { href: `/account/organizations/${id}/patents/families/${familyId}`, label: '검색 초기화' } : { href: `/account/organizations/${id}/patents`, label: '특허 자산 보기' }}/>}
    {!familyError && !result?.error && (page > 1 || hasNext) && <nav className="patent-pagination" aria-label="연결 특허 목록 페이지">{page > 1 && <Link href={familyPageQuery(q, page - 1)}>이전</Link>}<span>{page}페이지</span>{hasNext && page < familyMaxPage && <Link href={familyPageQuery(q, page + 1)}>다음</Link>}{hasNext && page === familyMaxPage && <span>표시할 수 있는 페이지 한도에 도달했습니다.</span>}</nav>}
    <Link href={`/account/organizations/${id}/patents/families`}>패밀리 관리로</Link>
  </div></main>;
}
