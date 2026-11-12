export const valuationPageSize = 25;
export const valuationMaxPage = 1000;

export function parseValuationPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), valuationMaxPage);
}

export function valuationPageQuery(page: number, asset: string | null = '', assetQuery = '', assetPage = 1, model: string | null = null): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (asset) params.set('asset', asset);
  if (assetQuery) params.set('asset_query', assetQuery);
  if (assetPage > 1) params.set('asset_page', String(assetPage));
  if (model) params.set('model', model);
  const query = params.toString();
  return query ? `?${query}#valuation-records` : '?#valuation-records';
}

export function valuationResultQuery(flag: string, page: number): string {
  const params = new URLSearchParams({[flag]:'1'});
  if (page > 1) params.set('page', String(page));
  return `?${params.toString()}#valuation-records`;
}

export function parseAssessmentAssetQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0,100) : '';
}

export function assessmentAssetPageQuery(assetPage: number, assetQuery: string, page: number, asset: string | null, model: string | null = null): string {
  const params = new URLSearchParams();
  if (assetQuery) params.set('asset_query', assetQuery);
  if (assetPage > 1) params.set('asset_page', String(assetPage));
  if (page > 1) params.set('page', String(page));
  if (asset) params.set('asset', asset);
  if (model) params.set('model', model);
  const query = params.toString();
  return query ? `?${query}#create-assessment` : '?#create-assessment';
}

export function modelListPageQuery(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const value = params.toString();
  return value ? `?${value}#model-list` : '?#model-list';
}
