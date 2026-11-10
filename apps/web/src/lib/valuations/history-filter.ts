export type ValuationStatusFilter = 'all' | 'draft' | 'final';

export function parseValuationStatus(value: string | string[] | undefined): ValuationStatusFilter | null {
  if (value === undefined || value === 'all') return 'all';
  if (value === 'draft' || value === 'final') return value;
  return null;
}

export type ValuationDateRange = { from: string; to: string };
function dateValue(value: unknown): string | null {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : value;
}
export function parseValuationDateRange(fromInput: unknown, toInput: unknown): ValuationDateRange | null {
  const from = dateValue(fromInput), to = dateValue(toInput);
  if (from === null || to === null || (from && to && from > to)) return null;
  return { from, to };
}
