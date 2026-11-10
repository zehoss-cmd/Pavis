export const portfolioPageSize = 25;
export const portfolioMaxPage = 1000;
export function parsePortfolioPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), portfolioMaxPage);
}
export function parsePortfolioAssetQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}
export function portfolioPageQuery(page: number, query = ''): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (query) params.set('asset_query', query);
  const value = params.toString();
  return value ? `?${value}` : '?';
}
