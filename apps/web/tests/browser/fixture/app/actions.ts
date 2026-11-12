'use server';

import { redirect } from 'next/navigation';
import { parsePatentCsv, validateRows, normalizedNumber, maxCsvBytes } from '../../../../src/lib/patents/csv-import';
import { parsePatentXlsx } from '../../../../src/lib/patents/xlsx-import';
import type { ImportState } from '../../../../src/app/account/organizations/[id]/patents/import/state';

/** Isolated browser fixture: real parsers, fake existing records, no database. */
export async function mockImport(_state:ImportState,form:FormData):Promise<ImportState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('operation')==='commit') {
  const parsed=validateRows(JSON.parse(String(form.get('rows'))));
  return parsed.errors.length ? {stage:'error',rows:[],errors:parsed.errors} : {stage:'success',rows:[],errors:[],count:parsed.rows.length};
 }
 const file=form.get('file');
 if(!(file instanceof File) || !file.size || file.size>maxCsvBytes) return {stage:'error',rows:[],errors:['파일은 비어 있지 않아야 하며 256KB 이하여야 합니다.']};
 const parsed=file.name.toLowerCase().endsWith('.xlsx') ? await parsePatentXlsx(Buffer.from(await file.arrayBuffer())) : parsePatentCsv(await file.text());
 if(parsed.errors.length) return {stage:'preview',rows:[],errors:parsed.errors,count:parsed.rows.length};
 const errors=parsed.rows.flatMap((row,index)=>normalizedNumber(row.application_number)==='EXISTS-001' ? [`데이터 ${index+1}번: 같은 국가의 출원번호가 이미 등록되어 있습니다.`] : []);
 return {stage:'preview',rows:parsed.rows,errors};
}

/** Simulate save errors without connecting to any database. */
export async function mockPatentSave(_previous:import('../../../../src/app/account/organizations/[id]/patents/form-data').AssetFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/patents/form-data').AssetFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('application_number')==='DUP') return {error:'duplicate'};
 if(form.get('application_number')==='NETWORK') return {error:'network'};
 if(form.get('application_number')==='AUTH') return {error:'session'};
 return redirect('/?mock_saved=1');
}

/** Simulate qualitative draft failures without a database. */
export async function mockQualitySave(_previous:import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('legal_note')==='저장 실패') return {error:'save'};
 if(form.get('legal_note')==='연결 오류') return {error:'network'};
 if(form.get('legal_note')==='인증 오류') return {error:'session'};
 return redirect('/?mock_quality_saved=1');
}
