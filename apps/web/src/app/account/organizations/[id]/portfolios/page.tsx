import Link from 'next/link';
import { patentAccess } from '@/lib/patents/access';
import { literalSearchPattern } from '@/lib/patents/search';
import { parsePortfolioPage, parsePortfolioAssetQuery, portfolioListPageQuery, portfolioMaxPage, portfolioPageSize } from '@/lib/portfolios/pagination';
import { createPortfolio } from './actions';

export default async function Portfolios({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; deleted?: string; q?: string | string[]; page?: string | string[] }> }) {
  const { id } = await params, flags = await searchParams;
  const { supabase, organization, canWrite } = await patentAccess(id);
  const page = parsePortfolioPage(flags.page), query = parsePortfolioAssetQuery(flags.q), offset = (page - 1) * portfolioPageSize;
  let request = supabase.from('patent_portfolios').select('id,name,description').eq('organization_id', id);
  if (query) request = request.ilike('name', literalSearchPattern(query));
  const { data, error } = await request.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + portfolioPageSize);
  const portfolios = (data || []).slice(0, portfolioPageSize), hasNext = (data?.length || 0) > portfolioPageSize;
  return <main className="auth-page"><Link href={`/account/organizations/${id}`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card">
    <p className="eyebrow">PATENT PORTFOLIOS</p><h1>특허 포트폴리오</h1><p>{organization.name}의 특허를 원하는 기준으로 묶어 관리하세요.</p>
    {canWrite && <Link href={`/account/organizations/${id}/recycle-bin`}>휴지통</Link>}
    {flags.deleted && <p className="form-message" role="status">포트폴리오를 삭제했습니다.</p>}
    {flags.error && <p className="form-message" role="alert">포트폴리오를 만들지 못했습니다. 입력 내용과 권한을 확인해 주세요.</p>}
    <form method="get" className="portfolio-asset-search"><label>포트폴리오 이름 검색<input type="search" name="q" maxLength={100} defaultValue={query} placeholder="포트폴리오 이름 입력" /></label><button type="submit">검색</button><Link href={`/account/organizations/${id}/portfolios`}>초기화</Link></form>
    <p>최근 생성순 · 페이지당 25개</p>
    {error ? <p className="form-message" role="alert">포트폴리오를 불러오지 못했습니다.</p> : portfolios.length ? <ul className="asset-list">{portfolios.map(item => <li key={item.id}><Link href={`/account/organizations/${id}/portfolios/${item.id}`}><strong>{item.name}</strong><span>{item.description || '설명 없음'}</span></Link></li>)}</ul> : <p>{query ? '검색 결과가 없습니다.' : page > 1 ? '이 페이지에 포트폴리오가 없습니다.' : '아직 만든 포트폴리오가 없습니다.'}</p>}
    {!error && (page > 1 || hasNext) && <nav className="patent-pagination" aria-label="포트폴리오 목록 페이지">{page > 1 && <Link href={portfolioListPageQuery(page - 1, query)}>이전</Link>}<span>{page}페이지</span>{hasNext && page < portfolioMaxPage && <Link href={portfolioListPageQuery(page + 1, query)}>다음</Link>}{hasNext && page === portfolioMaxPage && <span>검색 조건을 좁혀 주세요.</span>}</nav>}
    {canWrite && <><h2>포트폴리오 만들기</h2><form action={createPortfolio}><input type="hidden" name="organization" value={id}/><label>이름<input name="name" maxLength={200} required placeholder="예: 반도체 핵심 특허"/></label><label>설명 <small>선택 사항</small><input name="description" maxLength={500} placeholder="어떤 특허를 묶는지 적어 주세요"/></label><button type="submit">포트폴리오 생성</button></form></>}
    <Link href={`/account/organizations/${id}/patents`}>특허 자산으로</Link>
  </div></main>;
}
