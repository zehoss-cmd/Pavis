import { valuationDifference } from '@/domain/valuations/scenario-comparison';
import { SubmitButton } from '@/components/submit-button';
import type { ComparisonFilter } from '@/domain/valuations/scenario-comparison';

import {comparisonCsv,comparisonFields as fields,scenarioNames as scenarios,type ComparisonRow as Row} from '@/domain/valuations/comparison-csv';
import {CsvDownload} from '@/components/csv-download';

export function RecordDifference({records,filter,title,first,second,assetQuery,assetPage}:{
  records:Row[];title:string;filter:ComparisonFilter;first?:string;second?:string;assetQuery:string;assetPage:number;
}) {
  const a=records.find(row=>row.id===first), b=records.find(row=>row.id===second);
  const options=records.map(row=><option key={row.id} value={row.id}>{scenarios[row.scenario]} · {row.status==='final'?'확정':'초안'} · {row.result_text} {filter.currency} · {row.created_at.slice(0,10)} · {row.id.slice(0,8)}</option>);
  const changes=a&&b?(Object.keys(fields) as (keyof typeof fields)[]).filter(key=>a[key]!==b[key]):[];
  return <section id="record-difference" className="scenario-review"><h2>두 평가의 차이</h2>
    <form method="get" action="#record-difference">
      {Object.entries(filter).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
      {assetQuery&&<input type="hidden" name="asset_query" value={assetQuery}/>}
      {assetPage>1&&<input type="hidden" name="asset_page" value={assetPage}/>}
      <label htmlFor="first-record">기준 기록</label><select id="first-record" name="first" required defaultValue={a?.id??''}><option value="">기록 선택</option>{options}</select>
      <label htmlFor="second-record">비교 기록</label><select id="second-record" name="second" required defaultValue={b?.id??''}><option value="">기록 선택</option>{options}</select>
      <SubmitButton>차이 확인</SubmitButton>
    </form>
    {a&&!second&&<p>비교할 두 번째 기록을 선택해 주세요.</p>}
    {(second||first&&!a)&&(!a||!b||a.id===b.id)&&<p role="alert">현재 목록에서 서로 다른 두 기록을 선택해 주세요.</p>}
    {a&&b&&a.id!==b.id&&<>
      <p>기준 {a.result_text} {filter.currency} · 비교 {b.result_text} {filter.currency}</p>
      <p><strong>평가액 차이 (비교 − 기준) {valuationDifference(a.result_text,b.result_text)??'계산 불가'} {filter.currency}</strong></p>
      <CsvDownload csv={comparisonCsv(filter,title,a,b)} filename={`pavis-dcf-comparison-${filter.date}-${a.id}-${b.id}.csv`} label="두 평가 비교 결과 CSV 다운로드"/>
      {a.model_version!==b.model_version&&<p>평가모델이 다릅니다. 기준 {a.model_version} · 비교 {b.model_version}</p>}
      <h3>달라진 수치 가정 {changes.length}개</h3>
      {changes.length>0&&<ul>{changes.map(key=>{
        const unit=key==='years'?'년':key==='base_sales'||key==='annual_cost'?filter.currency:'%';
        return <li key={key}>{fields[key]} · 기준 {a[key]} {unit} · 비교 {b[key]} {unit}</li>;
      })}</ul>}
      {a.assumptions!==b.assumptions&&<details><summary>달라진 가정 근거 보기</summary><p>기준 · {a.assumptions||'미입력'}</p><p>비교 · {b.assumptions||'미입력'}</p></details>}
    </>}
  </section>;
}
