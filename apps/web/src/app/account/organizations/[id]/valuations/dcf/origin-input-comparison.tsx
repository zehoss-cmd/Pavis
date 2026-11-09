import type { DcfFieldValues } from './dcf-fields';

const fields: { key: keyof DcfFieldValues; label: string; unit?: string }[] = [
 {key:'valuation_date',label:'평가 기준일'}, {key:'currency',label:'통화'},
 {key:'years',label:'예측 기간',unit:'년'}, {key:'base_sales',label:'첫해 매출'},
 {key:'growth_rate',label:'연 매출 성장률',unit:'%'}, {key:'royalty_rate',label:'로열티율',unit:'%'},
 {key:'contribution_rate',label:'특허 기여도',unit:'%'}, {key:'annual_cost',label:'연 비용'},
 {key:'tax_rate',label:'세율',unit:'%'}, {key:'discount_rate',label:'할인율',unit:'%'},
 {key:'assumptions',label:'가정의 근거'},
];
function display(value:unknown,unit?:string) {
 if(value===null||value===undefined||value==='') return '미입력';
 if(typeof value!=='string'&&typeof value!=='number') return '확인 불가';
 return `${String(value)}${unit||''}`;
}
export function OriginInputComparison({origin,current}:{origin:Record<string,unknown>;current:DcfFieldValues}) {
 const inputs=origin.inputs;
 if(!inputs||typeof inputs!=='object'||Array.isArray(inputs)) return <p>이 복사본에는 원본의 세부 가정이 저장되어 있지 않습니다. 앞으로 새로 복사하는 평가부터 비교할 수 있습니다.</p>;
 const saved=inputs as Record<string,unknown>;
 return <><p>복사 당시 원본과 현재 평가의 입력값입니다. 금액은 각 열의 통화 단위이며 환산하지 않습니다.</p><div className="cashflow-table-wrap"><table className="cashflow-table assumption-comparison"><caption>복사 당시 원본과 현재 평가의 가정 비교</caption><thead><tr><th scope="col">항목</th><th scope="col">복사 당시 원본</th><th scope="col">현재 평가</th></tr></thead><tbody>{fields.map(({key,label,unit})=><tr key={key}><th scope="row">{label}</th><td>{display(key==='currency'||key==='valuation_date'?origin[key]:saved[key],unit)}</td><td>{display(current[key],unit)}</td></tr>)}</tbody></table></div></>;
}
