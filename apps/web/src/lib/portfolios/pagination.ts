export const portfolioPageSize = 25;
export const portfolioMaxPage = 1000;
export function parsePortfolioPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), portfolioMaxPage);
}
export function portfolioPageQuery(page: number): string {
  return page > 1 ? `?page=${page}` : '?';
}
