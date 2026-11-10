import { textCell, numberCell } from './csv.ts';
type Criterion={key:string;score:number;weight:number;note:string|null};
export type QualitativeSnapshot={organization_name:string;asset_id:string;asset_title:string;jurisdiction:string;assessment_id:string;assessment_date:string;status:string;model_version:string;model_name:string;model_revision:string;model_description:string|null;weighted_score:string;created_at:string;updated_at:string;finalized_at:string|null;copied_from_id?:string|null;copied_from_snapshot?:unknown;criteria:Criterion[]};
const labels:Record<string,string>={legal:'법적 안정성',technical:'기술성',market:'시장성',commercial:'사업화 가능성'};
export function qualitativeCsv(snapshot:QualitativeSnapshot):string {
 const keys=['legal','technical','market','commercial'];
 if(snapshot.model_version!=='qualitative-v1'||!Array.isArray(snapshot.criteria)||snapshot.criteria.length!==4||snapshot.criteria.some((item,index)=>item.key!==keys[index]||!Number.isInteger(item.score)||item.score<0||item.score>5||!Number.isInteger(item.weight)||item.weight<0||item.weight>100)||snapshot.criteria.reduce((sum,item)=>sum+item.weight,0)!==100||!['draft','final'].includes(snapshot.status)||typeof snapshot.model_name!=='string'||typeof snapshot.model_revision!=='string') throw new Error('incomplete assessment export');
 const rows:string[][]=[];
 const text=(section:string,label:string,value:unknown,unit='')=>rows.push([textCell(section),textCell(label),textCell(value),textCell(unit)]);
 const number=(section:string,label:string,value:unknown,unit='')=>rows.push([textCell(section),textCell(label),numberCell(value),textCell(unit)]);
 rows.push(['"구분"','"항목"','"값"','"단위"']);
 text('안내','결과의 의미','정성점수는 평가자의 판단이며 금액이나 공식 감정 결과가 아닙니다.');
 text('평가','조직',snapshot.organization_name);text('평가','특허명 (현재)',snapshot.asset_title);text('평가','특허 ID',snapshot.asset_id);text('평가','관할 국가',snapshot.jurisdiction);text('평가','평가 ID',snapshot.assessment_id);text('평가','기준일',snapshot.assessment_date);text('평가','상태',snapshot.status==='final'?'확정':'초안');
 text('모델','계산 버전',snapshot.model_version);text('모델','모델 이름',snapshot.model_name);text('모델','모델 버전',snapshot.model_revision);text('모델','모델 설명',snapshot.model_description);
 number('평가','가중 평균',snapshot.weighted_score,'5점 만점');text('평가','작성 시각 (UTC)',snapshot.created_at);text('평가','수정 시각 (UTC)',snapshot.updated_at);text('평가','확정 시각 (UTC)',snapshot.finalized_at);
 if(snapshot.copied_from_id) {text('원본','복사한 원본 평가 ID',snapshot.copied_from_id);text('원본','복사 당시 원본 정보 (JSON)',JSON.stringify(snapshot.copied_from_snapshot));}
 for(const item of snapshot.criteria) {const section=labels[item.key];number(section,'점수',item.score,'5점 만점');number(section,'가중치',item.weight,'%');text(section,'근거 및 출처',item.note);}
 return '\uFEFF'+rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}
