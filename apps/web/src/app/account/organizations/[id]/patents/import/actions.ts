'use server';
import { patentAccess } from '@/lib/patents/access';
import { maxCsvBytes, normalizedNumber, parsePatentCsv, validateRows, type PatentCsvRow } from '@/lib/patents/csv-import';
import { parsePatentXlsx } from '@/lib/patents/xlsx-import';
import type { ImportState } from './state';
const fail=(message:string):ImportState=>({stage:'error',rows:[],errors:[message]});
async function access(form:FormData) {
  const org=String(form.get('organization')||'');
  const value=await patentAccess(org);
  if(!value.canWrite) return null;
  return {org,supabase:value.supabase};
}
async function duplicateErrors(supabase:Awaited<ReturnType<typeof patentAccess>>['supabase'],org:string,rows:PatentCsvRow[]) {
  const groups=new Map<string,Set<string>>();
  for(const row of rows) {if(!groups.has(row.jurisdiction))groups.set(row.jurisdiction,new Set());groups.get(row.jurisdiction)!.add(normalizedNumber(row.application_number));}
  const existing=new Set<string>();
  const entries=Array.from(groups.entries());
  for(let i=0;i<entries.length;i+=5) {
    const batch=await Promise.all(entries.slice(i,i+5).map(async([country,numbers])=>{
      const {data,error}=await supabase.from('patent_assets').select('jurisdiction,application_number_normalized').eq('organization_id',org).eq('jurisdiction',country).in('application_number_normalized',Array.from(numbers));
      if(error) throw new Error('duplicate query failed');
      return data||[];
    }));
    for(const items of batch) for(const item of items) existing.add(`${item.jurisdiction}|${item.application_number_normalized}`);
  }
  return rows.flatMap((row,index)=>existing.has(`${row.jurisdiction}|${normalizedNumber(row.application_number)}`)?[`데이터 ${index+1}번: 같은 국가의 출원번호가 이미 등록되어 있습니다.`]:[]);
}
export async function previewCsv(_state:ImportState,form:FormData):Promise<ImportState> {
  const context=await access(form);
  if(!context) return fail('특허를 등록할 권한이 없습니다.');
  const file=form.get('file');
  if(!(file instanceof File)) return fail('CSV 또는 XLSX 파일을 선택해 주세요.');
  const filename=file.name.toLowerCase();
  if(!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) return fail('CSV 또는 XLSX 파일을 선택해 주세요.');
  if(file.size===0 || file.size>maxCsvBytes) return fail('파일은 비어 있지 않아야 하며 256KB 이하여야 합니다.');
  let buffer:Buffer;
  try {buffer=Buffer.from(await file.arrayBuffer());} catch {return fail('파일을 읽지 못했습니다. 다시 선택해 주세요.');}
  let parsed;
  if(filename.endsWith('.xlsx')) parsed=await parsePatentXlsx(buffer);
  else {
    let text:string;
    try {text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);} catch {return fail('UTF-8 형식으로 저장된 CSV 파일을 사용해 주세요.');}
    parsed=parsePatentCsv(text);
  }
  if(parsed.errors.length) return {stage:'preview',...parsed};
  try {return {stage:'preview',rows:parsed.rows,errors:await duplicateErrors(context.supabase,context.org,parsed.rows)};}
  catch {return fail('중복 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
}
export async function commitCsv(_state:ImportState,form:FormData):Promise<ImportState> {
  const context=await access(form);
  if(!context) return fail('특허를 등록할 권한이 없습니다.');
  const payload=form.get('rows');
  if(typeof payload!=='string' || payload.length>maxCsvBytes*2) return fail('가져올 데이터가 올바르지 않습니다. 다시 미리보기해 주세요.');
  let input:unknown;try {input=JSON.parse(payload);}catch{return fail('가져올 데이터가 올바르지 않습니다. 다시 미리보기해 주세요.');}
  const parsed=validateRows(input);
  if(parsed.errors.length) return {stage:'error',rows:[],errors:parsed.errors};
  try {
    const duplicates=await duplicateErrors(context.supabase,context.org,parsed.rows);
    if(duplicates.length) return {stage:'error',rows:[],errors:duplicates};
  } catch {return fail('중복 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
  const records=parsed.rows.map(row=>({organization_id:context.org,title:row.title,jurisdiction:row.jurisdiction,application_number:row.application_number,publication_number:row.publication_number||null,registration_number:row.registration_number||null,rights_holder:row.rights_holder||null,inventors:row.inventors||null,priority_date:row.priority_date||null,filing_date:row.filing_date||null,legal_status:row.legal_status,source:row.source||null,verified_date:row.verified_date||null}));
  const {error}=await context.supabase.from('patent_assets').insert(records);
  if(error) return fail(error.code==='23505'?'등록 중 출원번호가 중복되었습니다. 기존 특허를 확인한 뒤 다시 미리보기해 주세요.':'가져오지 못했습니다. 입력 내용과 권한을 확인해 주세요.');
  return {stage:'success',rows:[],errors:[],count:records.length};
}
export async function handleCsv(state:ImportState,form:FormData):Promise<ImportState> {
  return form.get('operation')==='commit' ? commitCsv(state,form) : previewCsv(state,form);
}
