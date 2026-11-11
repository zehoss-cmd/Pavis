export const portfolioPageSize = 25;
export const portfolioMaxPage = 1000;
export function parsePortfolioPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), portfolioMaxPage);
}
export function parsePortfolioAssetQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}
export function portfolioPageQuery(page: number, query = '', choicePage = 1): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (query) params.set('asset_query', query);
  if (choicePage > 1) params.set('choice_page', String(choicePage));
  const value = params.toString();
  return value ? `?${value}` : '?';
}

export function portfolioListPageQuery(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const value = params.toString();
  return value ? `?${value}` : '?';
}

export type PortfolioChoiceEmpty = {
  title: string;
  description: string;
  action: 'previous' | 'next' | 'reset' | 'register';
};

/** Describe an empty candidate page without assuming that all matching assets are linked. */
export function portfolioChoiceEmpty(page: number, query: string, resultCount: number, hasNext: boolean): PortfolioChoiceEmpty {
  if (resultCount > 0 && hasNext && page < portfolioMaxPage) return {
    title: '이 페이지에 연결할 수 있는 특허가 없습니다',
    description: '이 페이지의 특허는 이미 연결되어 있습니다. 다음 페이지를 확인해 주세요.',
    action: 'next',
  };
  if (page > 1) return {
    title: '이 페이지에 연결할 수 있는 특허가 없습니다',
    description: '이전 페이지에서 연결할 특허를 확인해 주세요.',
    action: 'previous',
  };
  if (query) return {
    title: resultCount ? '검색한 특허가 이미 연결되어 있습니다' : '검색 결과가 없습니다',
    description: resultCount ? '검색 조건을 초기화해 다른 특허를 확인해 주세요.' : '검색어를 바꾸거나 검색 조건을 초기화해 주세요.',
    action: 'reset',
  };
  return {
    title: resultCount ? '표시된 특허가 모두 연결되어 있습니다' : '등록된 특허가 없습니다',
    description: resultCount ? '새로운 특허를 등록한 뒤 포트폴리오에 연결할 수 있습니다.' : '특허 자산을 등록한 뒤 포트폴리오에 연결할 수 있습니다.',
    action: 'register',
  };
}
