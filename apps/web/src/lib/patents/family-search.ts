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
