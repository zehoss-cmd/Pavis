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
