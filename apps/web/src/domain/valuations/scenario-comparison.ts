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

export type ComparisonRecord = { scenario: string; status: string; model_version: string };
export function inspectScenarioComparison(records: readonly ComparisonRecord[], truncated: boolean) {
  const scenarios = ['conservative', 'base', 'optimistic'] as const;
  const counts = Object.fromEntries(scenarios.map(scenario => [scenario, records.filter(record => record.scenario === scenario).length])) as Record<typeof scenarios[number], number>;
  const versions = [...new Set(records.map(record => record.model_version).filter(Boolean))];
  return {
    counts,
    missing: scenarios.filter(scenario => counts[scenario] === 0),
    repeated: scenarios.filter(scenario => counts[scenario] > 1),
    mixedVersions: versions.length > 1,
    mixedStatus: records.some(record => record.status === 'draft') && records.some(record => record.status === 'final'),
    truncated,
  };
}

// The database returns numeric(40,2) as text to preserve all significant digits.
export function valuationDifference(reference:string, comparison:string):string|null {
  const cents=(value:string)=>{
    if (!/^-?\d{1,38}(?:\.\d{1,2})?$/.test(value)) return null;
    const [whole,fraction='']=value.split('.');
    return BigInt(whole+fraction.padEnd(2,'0'));
  };
  const first=cents(reference),second=cents(comparison);
  if (first===null||second===null) return null;
  const delta=second-first;
  const digits=(delta<BigInt(0)?-delta:delta).toString().padStart(3,'0');
  const whole=BigInt(digits.slice(0,-2)).toLocaleString('ko-KR');
  return (delta<BigInt(0)?'-':delta>BigInt(0)?'+':'')+whole+'.'+digits.slice(-2);
}
