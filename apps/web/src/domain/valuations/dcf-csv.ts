type Flow={year_number:number;revenue:string;royalty_income:string;annual_cost:string;taxable_income:string;tax:string;net_cashflow:string;discounted_cashflow:string};
export type ExportSnapshot={organization_name:string;asset_id:string;asset_title:string;jurisdiction:string;assessment_id:string;valuation_date:string;scenario:string;currency:string;years:number;base_sales:string;growth_rate:string;royalty_rate:string;contribution_rate:string;annual_cost:string;tax_rate:string;discount_rate:string;assumptions:string|null;model_version:string;result:string;status:string;created_at:string;updated_at:string;finalized_at:string|null;copied_from_id:string|null;copied_from_snapshot:unknown;cashflows:Flow[]};
const decimal=/^-?\d+(?:\.\d+)?$/;
function textCell(value:unknown):string {
 let text=value===null||value===undefined?'':String(value);
 if(/^[\s\uFEFF]*[=+\-@]/u.test(text)||/^[\t\r\n]/u.test(text)) text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function numberCell(value:unknown):string {
 const text=String(value);if(!decimal.test(text)) throw new Error('invalid numeric export value');return text;
}
export function dcfCsv(snapshot:ExportSnapshot):string {
 if(snapshot.model_version!=='royalty-dcf-v1'||!Number.isInteger(snapshot.years)||snapshot.years<1||snapshot.years>20||!Array.isArray(snapshot.cashflows)||snapshot.cashflows.length!==snapshot.years||snapshot.cashflows.some((flow,index)=>flow.year_number!==index+1)) throw new Error('incomplete assessment export');
 const rows:string[][]=[];
 const text=(section:string,label:string,value:unknown,unit='')=>rows.push([textCell(section),textCell(label),textCell(value),textCell(unit)]);
 const number=(section:string,label:string,value:unknown,unit='')=>rows.push([textCell(section),textCell(label),numberCell(value),textCell(unit)]);
 rows.push(['"구분"','"항목"','"값"','"단위"']);
 text('안내','결과의 의미','입력 가정에 따른 추정치이며 공인 감정이나 거래가격이 아닙니다.');
 text('안내','계산 방식','연말 현금흐름 할인, 양의 이익에만 세금 적용. 결손금 이월, 잔존가치, 환율 변환은 포함하지 않습니다.');
 text('안내','반올림','연도별 표시값은 소수점 둘째 자리로 반올림하며 저장된 총액은 반올림 전 값을 합산한 뒤 반올림합니다.');
 text('안내','스프레드시트 정밀도','일부 스프레드시트는 긴 숫자를 반올림할 수 있습니다. 정확한 원본 숫자는 CSV 텍스트에서 확인하세요.');
 text('평가','조직',snapshot.organization_name);text('평가','특허명 (현재)',snapshot.asset_title);text('평가','특허 ID',snapshot.asset_id);text('평가','관할 국가',snapshot.jurisdiction);
 text('평가','평가 ID',snapshot.assessment_id);text('평가','기준일',snapshot.valuation_date);text('평가','시나리오',({conservative:'보수',base:'기준',optimistic:'낙관'} as Record<string,string>)[snapshot.scenario]||snapshot.scenario);
 text('평가','상태',snapshot.status==='final'?'확정':'초안');text('평가','모델 버전',snapshot.model_version);text('평가','통화',snapshot.currency);
 number('평가','추정 현재가치',snapshot.result,snapshot.currency);text('평가','작성 시각 (UTC)',snapshot.created_at);text('평가','수정 시각 (UTC)',snapshot.updated_at);text('평가','확정 시각 (UTC)',snapshot.finalized_at);
 number('가정','예측 기간',snapshot.years,'년');number('가정','첫해 매출',snapshot.base_sales,snapshot.currency);number('가정','연 매출 성장률',snapshot.growth_rate,'%');number('가정','로열티율',snapshot.royalty_rate,'%');number('가정','특허 기여도',snapshot.contribution_rate,'%');number('가정','연 비용',snapshot.annual_cost,snapshot.currency);number('가정','세율',snapshot.tax_rate,'%');number('가정','할인율',snapshot.discount_rate,'%');text('가정','근거 및 출처',snapshot.assumptions);
 if(snapshot.copied_from_id) {text('원본','복사한 원본 평가 ID',snapshot.copied_from_id);text('원본','복사 당시 원본 정보 (JSON)',JSON.stringify(snapshot.copied_from_snapshot));}
 for(const flow of snapshot.cashflows) {
  const section=`${flow.year_number}년`;
  number(section,'예상 매출',flow.revenue,snapshot.currency);number(section,'귀속 로열티',flow.royalty_income,snapshot.currency);number(section,'연 비용',flow.annual_cost,snapshot.currency);number(section,'세전 현금흐름',flow.taxable_income,snapshot.currency);number(section,'세금',flow.tax,snapshot.currency);number(section,'세후 현금흐름',flow.net_cashflow,snapshot.currency);number(section,'할인 후 현금흐름',flow.discounted_cashflow,snapshot.currency);
 }
 return '\uFEFF'+rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}
