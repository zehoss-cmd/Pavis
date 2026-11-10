export type ValuationStatusFilter = 'all' | 'draft' | 'final';

export function parseValuationStatus(value: string | string[] | undefined): ValuationStatusFilter | null {
  if (value === undefined || value === 'all') return 'all';
  if (value === 'draft' || value === 'final') return value;
  return null;
}
