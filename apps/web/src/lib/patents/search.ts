export const searchFields = {
  title: '발명의 명칭',
  application_number: '출원번호',
  publication_number: '공개번호',
  registration_number: '등록번호',
  rights_holder: '권리자',
  inventors: '발명자',
} as const;
export const patentStatuses = ['unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked'] as const;
export type SearchParams = Record<string, string | string[] | undefined>;
export const pageSize = 25;
export const maxPage = 1000;
export function parsePatentSearch(params: SearchParams) {
  const field = typeof params.field === 'string' && Object.hasOwn(searchFields, params.field) ? params.field as keyof typeof searchFields : 'title';
  const q = typeof params.q === 'string' ? params.q.trim().slice(0,100) : '';
  const country = typeof params.country === 'string' && /^[a-z]{2}$/i.test(params.country.trim()) ? params.country.trim().toUpperCase() : '';
  const status = typeof params.status === 'string' && patentStatuses.some(value => value === params.status) ? params.status : '';
  const sort = params.sort === 'oldest' || params.sort === 'title' ? params.sort : 'newest';
  const value = typeof params.page === 'string' && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.min(value, maxPage);
  return { field, q, country, status, sort, page };
}
export function literalSearchPattern(value: string) { return `%${value.replace(/[\\%_]/g,'\\$&')}%`; }
export function patentPageQuery(search: ReturnType<typeof parsePatentSearch>, page: number) {
  const params = new URLSearchParams();
  if (search.q) { params.set('field', search.field); params.set('q', search.q); }
  if (search.country) params.set('country', search.country);
  if (search.status) params.set('status', search.status);
  if (search.sort !== 'newest') params.set('sort', search.sort);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query}` : '?';
}
