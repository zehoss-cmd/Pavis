export const valuationPageSize = 25;
export const valuationMaxPage = 1000;

export function parseValuationPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), valuationMaxPage);
}

export function valuationPageQuery(page: number, asset: string | null = ''): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (asset) params.set('asset', asset);
  const query = params.toString();
  return query ? `?${query}#valuation-records` : '?#valuation-records';
}

export function valuationResultQuery(flag: string, page: number): string {
  const params = new URLSearchParams({[flag]:'1'});
  if (page > 1) params.set('page', String(page));
  return `?${params.toString()}#valuation-records`;
}
