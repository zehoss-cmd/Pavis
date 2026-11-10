import { compareQualitativeCriteria } from '@/lib/valuations/qualitative-comparison';

type Current = Parameters<typeof compareQualitativeCriteria>[1];
export function OriginComparison({ criteria, current }: { criteria: unknown; current: Current }) {
  const rows = compareQualitativeCriteria(criteria, current);
  if (rows.every(row => !row.source)) return <p>원본의 상세 항목이 없어 비교할 수 없습니다.</p>;
  return <><p>복사 당시 저장된 원본과 현재 평가를 비교합니다. 원본을 이후에 수정했더라도 이 표에는 복사 당시의 값이 표시됩니다.</p>
    <div className="cashflow-table-wrap"><table className="cashflow-table assumption-comparison"><caption>정성평가 항목별 원본과 현재 비교</caption>
      <thead><tr><th scope="col">평가 항목</th><th scope="col">복사 당시 원본</th><th scope="col">현재 평가</th><th scope="col">변경 여부</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th>
        <td>{row.source ? <>{row.source.score}점 · 가중치 {row.source.weight}%<br />근거: {row.source.note || '미입력'}</> : '원본 정보 없음'}</td>
        <td>{row.current.score}점 · 가중치 {row.current.weight}%<br />근거: {row.current.note || '미입력'}</td>
        <td>{row.changed === null ? '비교 불가' : row.changed ? '변경됨' : '동일'}</td></tr>)}</tbody>
    </table></div></>;
}
