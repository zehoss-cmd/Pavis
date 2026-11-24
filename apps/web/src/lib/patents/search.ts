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
  const family = typeof params.family === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.family) ? params.family : '';
  const sort = params.sort === 'oldest' || params.sort === 'title' ? params.sort : 'newest';
  const value = typeof params.page === 'string' && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.min(value, maxPage);
  return { field, q, country, status, family, sort, page };
}
export function literalSearchPattern(value: string) { return `%${value.replace(/[\\%_]/g,'\\$&')}%`; }
/** PostgREST imatch pattern for complete identifiers from the provider lookup form. */
export function patentIdentifierPattern(field:string, value:string) {
  const compact=value.toUpperCase().replace(/[\s-]/g,'');
  const korean=field==='application_number' && /^[\d\s-]+$/.test(value) && /^\d{13}$/.test(compact);
  const publication=field==='publication_number' && /^[A-Z]{2}-[A-Z0-9]{1,20}-[A-Z0-9]{1,3}$/i.test(value);
  if (!korean && !publication) return null;
  return compact.split('').join('[[:space:]-]*');
}
export function patentPageQuery(search: ReturnType<typeof parsePatentSearch>, page: number) {
  const params = new URLSearchParams();
  if (search.q) { params.set('field', search.field); params.set('q', search.q); }
  if (search.country) params.set('country', search.country);
  if (search.status) params.set('status', search.status);
  if (search.family) params.set('family', search.family);
  if (search.sort !== 'newest') params.set('sort', search.sort);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query}` : '?';
}

/** Rebuild a local list query from allowlisted search fields, never from a URL. */
export function patentListReturnQuery(value:unknown):string {
  if(typeof value!=='string'||value.length>4096)return '';
  const search=parsePatentSearch(Object.fromEntries(new URLSearchParams(value)));
  return patentPageQuery(search,search.page).slice(1);
}
