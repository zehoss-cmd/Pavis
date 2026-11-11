import { compareQualitativeCriteria, compareQualitativeSummary } from '@/lib/valuations/qualitative-comparison';

type Current = Parameters<typeof compareQualitativeCriteria>[1] & Parameters<typeof compareQualitativeSummary>[1];
export function OriginComparison({ origin, current }: { origin: Record<string, unknown>; current: Current }) {
  const rows = compareQualitativeCriteria(origin.criteria, current);
  const summary = compareQualitativeSummary(origin, current);
  const delta = summary.scoreDifference;
  const deltaText = delta === null ? '비교 불가' : delta === 0 ? '차이 없음' : `${delta > 0 ? '+' : '−'}${(Math.abs(delta) / 100).toFixed(2)}점`; 
  return <><p>복사 당시 저장된 원본과 현재 평가를 비교합니다. 원본을 이후에 수정했더라도 이 표에는 복사 당시의 값이 표시됩니다.</p>
    <p className="table-scroll-hint">표를 옆으로 스크롤해 모든 항목을 확인하세요.</p><div className="cashflow-table-wrap" role="region" aria-label="정성평가 기준일과 종합 점수 비교 표" tabIndex={0}><table className="cashflow-table assumption-comparison"><caption>정성평가 기준일과 종합 점수 비교</caption><thead><tr><th scope="col">항목</th><th scope="col">복사 당시 원본</th><th scope="col">현재 평가</th><th scope="col">차이</th></tr></thead><tbody><tr><th scope="row">평가 기준일</th><td>{summary.sourceDate || '확인 불가'}</td><td>{summary.currentDate || '확인 불가'}</td><td>{!summary.sourceDate || !summary.currentDate ? '비교 불가' : summary.sourceDate === summary.currentDate ? '동일' : '변경됨'}</td></tr><tr><th scope="row">정성 가중 평균</th><td>{summary.sourceScore === null ? '확인 불가' : `${summary.sourceScore} / 5`}</td><td>{summary.currentScore === null ? '확인 불가' : `${summary.currentScore} / 5`}</td><td>{deltaText}</td></tr></tbody></table></div><p>점수 차이는 현재 평가에서 복사 당시 원본을 뺀 값입니다. 가중치나 평가 기준이 다르면 점수만으로 우열을 판단할 수 없습니다.</p>{rows.every(row => !row.source) ? <p>원본의 상세 항목이 없어 항목별 비교는 할 수 없습니다.</p> : <><p className="table-scroll-hint">표를 옆으로 스크롤해 모든 항목을 확인하세요.</p><div className="cashflow-table-wrap" role="region" aria-label="정성평가 항목별 원본과 현재 비교 표" tabIndex={0}><table className="cashflow-table assumption-comparison"><caption>정성평가 항목별 원본과 현재 비교</caption>
      <thead><tr><th scope="col">평가 항목</th><th scope="col">복사 당시 원본</th><th scope="col">현재 평가</th><th scope="col">변경 여부</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th>
        <td>{row.source ? <>{row.source.score}점 · 가중치 {row.source.weight}%<br />근거: {row.source.note || '미입력'}</> : '원본 정보 없음'}</td>
        <td>{row.current.score}점 · 가중치 {row.current.weight}%<br />근거: {row.current.note || '미입력'}</td>
        <td>{row.changed === null ? '비교 불가' : row.changed ? '변경됨' : '동일'}</td></tr>)}</tbody>
    </table></div></>}</>;
}
