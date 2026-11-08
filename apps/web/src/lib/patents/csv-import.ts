import { parse } from 'csv-parse/sync';

export const csvHeaders = ['title','jurisdiction','application_number','publication_number','registration_number','rights_holder','inventors','priority_date','filing_date','legal_status','source','verified_date'] as const;
export type CsvHeader = typeof csvHeaders[number];
export type PatentCsvRow = Record<CsvHeader,string>;
export type CsvResult = { rows: PatentCsvRow[]; errors: string[] };
export const maxCsvRows = 100;
export const maxCsvBytes = 256 * 1024;
const statusMap:Record<string,string>={unknown:'unknown',pending:'pending',granted:'granted',rejected:'rejected',withdrawn:'withdrawn',expired:'expired',lapsed:'lapsed',revoked:'revoked','미확인':'unknown','출원 중':'pending','등록':'granted','거절':'rejected','취하':'withdrawn','만료':'expired','소멸':'lapsed','무효':'revoked'};
const numberFields = ['application_number','publication_number','registration_number'] as const;
const dateFields = ['priority_date','filing_date','verified_date'] as const;
const nameFields = ['rights_holder','inventors','source'] as const;
export function normalizedNumber(value:string) { return value.replace(/\s/g,'').toUpperCase(); }
function validDate(value:string) { if(!value) return true; if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || value<'0001-01-01') return false; const d=new Date(value+'T00:00:00Z'); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===value; }
export function validateRows(input:unknown):CsvResult {
  if(!Array.isArray(input) || input.length<1 || input.length>maxCsvRows) return {rows:[],errors:[`데이터는 1~${maxCsvRows}건이어야 합니다.`]};
  const rows:PatentCsvRow[]=[],errors:string[]=[],seen=new Map<string,number>();
  input.forEach((item,index)=>{
    const line=index+1;
    if(!item || typeof item!=='object' || Array.isArray(item)) {errors.push(`데이터 ${line}번: 데이터 형식이 올바르지 않습니다.`);return;}
    const obj=item as Record<string,unknown>;
    if(Object.keys(obj).some(key=>!csvHeaders.includes(key as CsvHeader)) || csvHeaders.some(key=>obj[key]!==undefined && typeof obj[key]!=='string')) {errors.push(`데이터 ${line}번: 데이터 형식이 올바르지 않습니다.`);return;}
    const row=Object.fromEntries(csvHeaders.map(key=>[key,typeof obj[key]==='string'?(obj[key] as string).trim():''])) as PatentCsvRow;
    row.jurisdiction=row.jurisdiction.toUpperCase();
    if(!row.title || row.title.length>300) errors.push(`데이터 ${line}번: 발명의 명칭은 1~300자여야 합니다.`);
    if(!/^[A-Z]{2}$/.test(row.jurisdiction)) errors.push(`데이터 ${line}번: 국가는 KR, US처럼 영문 2자리여야 합니다.`);
    if(!row.application_number || !normalizedNumber(row.application_number)) errors.push(`데이터 ${line}번: 출원번호를 입력해 주세요.`);
    for(const key of numberFields) if(row[key].length>100) errors.push(`데이터 ${line}번: ${key}는 100자 이하여야 합니다.`);
    for(const key of nameFields) if(row[key].length>500) errors.push(`데이터 ${line}번: ${key}는 500자 이하여야 합니다.`);
    for(const key of dateFields) if(!validDate(row[key])) errors.push(`데이터 ${line}번: ${key}는 유효한 YYYY-MM-DD 날짜여야 합니다.`);
    const statusKey=row.legal_status || 'unknown';
    const status=Object.hasOwn(statusMap,statusKey)?statusMap[statusKey]:undefined;
    if(!status) errors.push(`데이터 ${line}번: legal_status 값이 올바르지 않습니다.`); else row.legal_status=status;
    if(csvHeaders.some(key=>row[key].includes('\0'))) errors.push(`데이터 ${line}번: 사용할 수 없는 문자가 있습니다.`);
    const key=`${row.jurisdiction}|${normalizedNumber(row.application_number)}`;
    if(row.application_number && seen.has(key)) errors.push(`데이터 ${line}번: 데이터 ${seen.get(key)}번과 국가·출원번호가 중복됩니다.`); else if(row.application_number) seen.set(key,line);
    rows.push(row);
  });
  return {rows,errors};
}
export function parsePatentCsv(text:string):CsvResult {
  let data:string[][];
  try { data=parse(text,{bom:true,skip_empty_lines:true,relax_column_count:false,max_record_size:maxCsvBytes}) as string[][]; }
  catch {return {rows:[],errors:['CSV 형식이 올바르지 않습니다. 열 개수와 따옴표를 확인해 주세요.']};}
  if(data.length<2) return {rows:[],errors:['제목 행과 데이터 행이 필요합니다.']};
  if(data.length-1>maxCsvRows) return {rows:[],errors:[`한 번에 최대 ${maxCsvRows}건까지 가져올 수 있습니다.`]};
  const header=data[0].map(value=>value.trim());
  if(new Set(header).size!==header.length || header.some(key=>!csvHeaders.includes(key as CsvHeader)) || !['title','jurisdiction','application_number'].every(key=>header.includes(key))) return {rows:[],errors:['CSV 제목 행을 확인해 주세요. title, jurisdiction, application_number는 필수이며, 안내된 열 이름만 사용할 수 있습니다.']};
  return validateRows(data.slice(1).map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]??'']))));
}
