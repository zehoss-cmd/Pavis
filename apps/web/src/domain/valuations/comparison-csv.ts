import {textCell,numberCell} from './csv.ts';
import {valuationDifference,type ComparisonFilter} from './scenario-comparison.ts';

export const comparisonFields={
  years:'예측 기간',base_sales:'첫해 매출',growth_rate:'성장률',royalty_rate:'로열티율',
  contribution_rate:'특허 기여도',annual_cost:'연 비용',tax_rate:'세율',discount_rate:'할인율',
} as const;
export type ComparisonRow=Record<keyof typeof comparisonFields,number>&{
  id:string;result_text:string;model_version:string;status:string;scenario:string;created_at:string;assumptions:string|null;
};
export const scenarioNames:Record<string,string>={base:'기준',optimistic:'낙관',conservative:'보수'};

export function comparisonCsv(filter:ComparisonFilter,title:string,a:ComparisonRow,b:ComparisonRow) {
  const rows:string[][]=[];
  const text=(...cells:string[])=>rows.push(cells.map(textCell));
  text('항목','기준 기록','비교 기록','단위','차이 또는 변경 여부');
  text('특허명',title,title,'','');
  text('특허 ID',filter.asset,filter.asset,'','');
  text('평가 기준일',filter.date,filter.date,'','');
  text('평가 ID',a.id,b.id,'','');
  text('작성 시각',a.created_at,b.created_at,'','');
  text('시나리오',scenarioNames[a.scenario],scenarioNames[b.scenario],'','');
  text('상태',a.status==='final'?'확정':'초안',b.status==='final'?'확정':'초안','','');
  text('평가모델',a.model_version,b.model_version,'','');
  const delta=valuationDifference(a.result_text,b.result_text);
  rows.push([textCell('평가액 (비교 − 기준)'),numberCell(a.result_text),numberCell(b.result_text),textCell(filter.currency),
    delta===null?textCell('계산 불가'):numberCell(delta.replace(/[+,]/g,''))]);
  for(const key of Object.keys(comparisonFields) as (keyof typeof comparisonFields)[]) {
    const unit=key==='years'?'년':key==='base_sales'||key==='annual_cost'?filter.currency:'%';
    rows.push([textCell(comparisonFields[key]),numberCell(a[key]),numberCell(b[key]),textCell(unit),textCell(a[key]===b[key]?'동일':'변경')]);
  }
  text('가정의 근거',a.assumptions??'',b.assumptions??'','',a.assumptions===b.assumptions?'동일':'변경');
  return '\uFEFF'+rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}
