export const eventPageSize = 25;
export const eventMaxPage = 1000;

export function parseEventPage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,3}$/.test(value)) return 1;
  return Math.min(Number(value), eventMaxPage);
}

export function eventPageQuery(page: number): string {
  return page > 1 ? `?page=${page}#legal-events` : '?#legal-events';
}

export function eventResultQuery(flag: 'created' | 'updated' | 'deleted' | 'invalid' | 'save', page: number): string {
  const params = new URLSearchParams();
  if (flag === 'invalid' || flag === 'save') params.set('error', flag);
  else params.set(flag, '1');
  if (page > 1) params.set('page', String(page));
  return `?${params.toString()}#legal-events`;
}
