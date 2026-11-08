export const currencies = ['KRW', 'USD', 'EUR', 'JPY'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ComparisonFilter = { asset: string; date: string; currency: string };
export function parseComparisonFilter(input: { asset?: unknown; date?: unknown; currency?: unknown }): ComparisonFilter | null {
  const { asset, date, currency } = input;
  if (typeof asset !== 'string' || !uuid.test(asset) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01' || typeof currency !== 'string' || !currencies.some(c => c === currency)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return { asset, date, currency };
}
