export const familyPageSize = 25;
export const familyMaxPage = 1000;
export function parseFamilySearch(input: { q?: unknown; page?: unknown }) {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 100) : '';
  const value = typeof input.page === 'string' && /^[1-9]\d{0,3}$/.test(input.page) ? Number(input.page) : 1;
  return { q, page: Math.min(value, familyMaxPage) };
}
export function familyPageQuery(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const result = params.toString();
  return result ? `?${result}` : '?';
}

// Keep return navigation local and encode user input as query parameters.
export function familyAssetQuery(q: string, page: number) {
  const params = new URLSearchParams({ from_family: '1' });
  if (q) params.set('family_q', q);
  if (page > 1) params.set('family_page', String(page));
  return `?${params.toString()}`;
}
export function familyReturnQuery(input: { from_family?: unknown; family_q?: unknown; family_page?: unknown }) {
  if (input.from_family !== '1') return '';
  const { q, page } = parseFamilySearch({ q: input.family_q, page: input.family_page });
  return familyPageQuery(q, page);
}
