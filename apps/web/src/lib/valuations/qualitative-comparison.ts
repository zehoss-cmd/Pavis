export const qualitativeDimensions = [
  { key: 'legal', label: '법적 안정성' },
  { key: 'technical', label: '기술성' },
  { key: 'market', label: '시장성' },
  { key: 'commercial', label: '사업화 가능성' },
] as const;

type Dimension = typeof qualitativeDimensions[number]['key'];
type Criterion = { key: Dimension; score: number; weight: number; note: string | null };
type Current = Record<`${Dimension}_score` | `${Dimension}_weight`, number> & Record<`${Dimension}_note`, string | null>;

/** Keep missing historic data distinct from an actual zero score or an empty note. */
export function compareQualitativeCriteria(origin: unknown, current: Current) {
  const criteria = Array.isArray(origin) ? origin : [];
  return qualitativeDimensions.map(({ key, label }) => {
    const matches = criteria.filter((item): item is Criterion => item !== null && typeof item === 'object' && item.key === key && typeof item.score === 'number' && typeof item.weight === 'number' && (typeof item.note === 'string' || item.note === null));
    const source = matches.length === 1 ? matches[0] : null;
    const now = { score: current[`${key}_score`], weight: current[`${key}_weight`], note: current[`${key}_note`] };
    return { key, label, source, current: now, changed: source ? source.score !== now.score || source.weight !== now.weight || (source.note || '') !== (now.note || '') : null };
  });
}

function scoreInHundredths(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^(?:[0-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function compareQualitativeSummary(origin: Record<string, unknown>, current: { assessment_date: string; weighted_score: number | string }) {
  const sourceScore = scoreInHundredths(origin.weighted_score);
  const currentScore = scoreInHundredths(current.weighted_score);
  const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  return {
    sourceDate: validDate(origin.assessment_date) ? origin.assessment_date : null,
    currentDate: validDate(current.assessment_date) ? current.assessment_date : null,
    sourceScore: sourceScore === null ? null : (sourceScore / 100).toFixed(2),
    currentScore: currentScore === null ? null : (currentScore / 100).toFixed(2),
    scoreDifference: sourceScore === null || currentScore === null ? null : currentScore - sourceScore,
  };
}
