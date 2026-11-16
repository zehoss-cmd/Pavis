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
export function familyAssetQuery(q: string, page: number, familyId?: string) {
  const params = new URLSearchParams({ from_family: '1' });
  if (familyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(familyId)) params.set('return_family', familyId);
  if (q) params.set('family_q', q);
  if (page > 1) params.set('family_page', String(page));
  return `?${params.toString()}`;
}
export function familyReturnQuery(input: { from_family?: unknown; family_q?: unknown; family_page?: unknown }) {
  if (input.from_family !== '1') return '';
  const { q, page } = parseFamilySearch({ q: input.family_q, page: input.family_page });
  return familyPageQuery(q, page);
}

export function savedFamilyContext(input: { from_family?: unknown; family_q?: unknown; family_page?: unknown; return_family?: unknown }) {
  const validFamily = typeof input.return_family === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.return_family) ? input.return_family : '';
  if (input.from_family !== '1' || !validFamily) return '';
  const { q, page } = parseFamilySearch({ q: input.family_q, page: input.family_page });
  return familyAssetQuery(q, page, validFamily);
}
