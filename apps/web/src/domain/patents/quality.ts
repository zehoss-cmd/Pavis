export type QualityAsset = {
 id:string; title:string|null; jurisdiction:string|null; family_id:string|null;
 rights_holder:string|null; inventors:string|null; application_number:string|null;
 publication_number:string|null; registration_number:string|null; filing_date:string|null;
 priority_date:string|null; verified_date:string|null; legal_status:string|null; source:string|null;
};
type Field=Exclude<keyof QualityAsset,'id'>;
type Context={today:string; staleBefore:string};
type Rule=[number,string,(asset:QualityAsset,context:Context)=>boolean];
const missing=(key:Field)=>(asset:QualityAsset)=>!asset[key]?.trim();
const tooLong=(key:Field,max:number)=>(asset:QualityAsset)=>Array.from(asset[key]??'').length>max;
const control=(key:Field)=>(asset:QualityAsset)=>Array.from(asset[key]??'').some(char=>{
 const code=char.charCodeAt(0);
 return code<32||code===127;
});
function validDate(value:string|null):value is string {
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01')return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
const invalidDate=(key:Field)=>(asset:QualityAsset)=>!missing(key)(asset)&&!validDate(asset[key]);
const future=(key:Field)=>(asset:QualityAsset,{today}:Context)=>{
 const date=asset[key];
 return validDate(date)&&date>today;
};
const before=(first:Field,second:Field)=>(asset:QualityAsset)=>{
 const a=asset[first],b=asset[second];
 return validDate(a)&&validDate(b)&&a<b;
};
const equalNumbers=(first:Field,second:Field)=>(asset:QualityAsset)=>{
 const normalize=(value:string|null)=>value?.replace(/\s/g,'').toUpperCase();
 const a=normalize(asset[first]);
 return !!a&&a===normalize(asset[second]);
};
const missingRegistration=(status:string)=>(asset:QualityAsset)=>asset.legal_status===status&&missing('registration_number')(asset);
const statuses=new Set(['unknown','pending','granted','rejected','withdrawn','expired','lapsed','revoked']);
export const patentQualityRules:readonly Rule[]=[
 [1,'발명의 명칭 누락',missing('title')],
 [2,'발명의 명칭 300자 초과',tooLong('title',300)],
 [3,'발명의 명칭 제어문자',control('title')],
 [4,'관할 누락',missing('jurisdiction')],
 [5,'관할 코드 형식 확인',a=>!missing('jurisdiction')(a)&&!/^[A-Z]{2}$/.test(a.jurisdiction??'')],
 [6,'패밀리 미연결',missing('family_id')],
 [7,'권리자 누락',missing('rights_holder')],
 [8,'발명자 누락',missing('inventors')],
 [9,'권리자 500자 초과',tooLong('rights_holder',500)],
 [10,'발명자 500자 초과',tooLong('inventors',500)],
 [11,'출원번호 누락',missing('application_number')],
 [12,'공개번호 누락',missing('publication_number')],
 [13,'등록 상태의 등록번호 누락',missingRegistration('granted')],
 [14,'출원번호 100자 초과',tooLong('application_number',100)],
 [15,'공개번호 100자 초과',tooLong('publication_number',100)],
 [16,'등록번호 100자 초과',tooLong('registration_number',100)],
 [17,'출원번호 제어문자',control('application_number')],
 [18,'공개번호 제어문자',control('publication_number')],
 [19,'등록번호 제어문자',control('registration_number')],
 [20,'국내 출원번호 형식 확인',a=>a.jurisdiction==='KR'&&!missing('application_number')(a)&&!/^\d{13}$/.test(a.application_number!.replace(/[\s-]/g,''))],
 [21,'출원일 누락',missing('filing_date')],
 [22,'우선일 누락',missing('priority_date')],
 [23,'확인일 누락',missing('verified_date')],
 [24,'출원일 형식 오류',invalidDate('filing_date')],
 [25,'우선일 형식 오류',invalidDate('priority_date')],
 [26,'확인일 형식 오류',invalidDate('verified_date')],
 [27,'미래 출원일',future('filing_date')],
 [28,'미래 우선일',future('priority_date')],
 [29,'미래 확인일',future('verified_date')],
 [30,'출원일보다 늦은 우선일',before('filing_date','priority_date')],
 [31,'법적 상태 누락',missing('legal_status')],
 [32,'미확인 법적 상태',a=>a.legal_status==='unknown'],
 [33,'지원하지 않는 상태 값',a=>!missing('legal_status')(a)&&!statuses.has(a.legal_status!)],
 [34,'등록번호가 있는 출원 중 특허',a=>a.legal_status==='pending'&&!missing('registration_number')(a)],
 [35,'등록번호가 없는 만료 특허',missingRegistration('expired')],
 [36,'등록번호가 없는 소멸 특허',missingRegistration('lapsed')],
 [37,'등록번호가 없는 무효 특허',missingRegistration('revoked')],
 [38,'정보 출처 누락',missing('source')],
 [39,'정보 출처 500자 초과',tooLong('source',500)],
 [40,'정보 출처 제어문자',control('source')],
 [41,'출처는 있으나 확인일 누락',a=>!missing('source')(a)&&missing('verified_date')(a)],
 [42,'확인일은 있으나 출처 누락',a=>!missing('verified_date')(a)&&missing('source')(a)],
 [43,'출원일보다 이른 확인일',before('verified_date','filing_date')],
 [44,'우선일보다 이른 확인일',before('verified_date','priority_date')],
 [45,'마지막 확인 후 1년 이상 경과',(a,{staleBefore})=>validDate(a.verified_date)&&a.verified_date<=staleBefore],
 [46,'출원번호와 공개번호 일치',equalNumbers('application_number','publication_number')],
 [47,'출원번호와 등록번호 일치',equalNumbers('application_number','registration_number')],
 [48,'공개번호와 등록번호 일치',equalNumbers('publication_number','registration_number')],
 [49,'권리자 제어문자',control('rights_holder')],
 [50,'발명자 제어문자',control('inventors')],
];

export function patentQualityContext(now:Date):Context {
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const [year,month,day]=today.split('-').map(Number);
 const lastDay=new Date(Date.UTC(year-1,month,0)).getUTCDate();
 const staleBefore=new Date(Date.UTC(year-1,month-1,Math.min(day,lastDay))).toISOString().slice(0,10);
 return {today,staleBefore};
}
