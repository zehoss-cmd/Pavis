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

/** Simulate monetary draft failures without a database. */
export async function mockDcfSave(_previous:import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('assumptions')==='저장 실패') return {error:'save'};
 if(form.get('assumptions')==='연결 오류') return {error:'network'};
 if(form.get('assumptions')==='인증 오류') return {error:'session'};
 return redirect('/?mock_dcf_saved=1');
}

/** Simulate portfolio save failures without a database. */
export async function mockPortfolioSave(_previous:import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/valuations/draft-form-state').DraftFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('description')==='저장 실패') return {error:'save'};
 if(form.get('description')==='연결 오류') return {error:'network'};
 if(form.get('description')==='인증 오류') return {error:'session'};
 return redirect('/?mock_portfolio_saved=1');
}

/** Simulate model registration responses without database writes. */
export async function mockModelSave(_previous:import('../../../../src/app/account/organizations/[id]/valuations/models/form-state').ModelFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/valuations/models/form-state').ModelFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 const weights=['legal','technical','market','commercial'].map(k=>Number(form.get(`${k}_weight`)));
 if(weights.reduce((sum,value)=>sum+value,0)!==100) return {error:'invalid'};
 if(form.get('version')==='duplicate') return {error:'duplicate'};
 if(form.get('version')==='network') return {error:'network'};
 if(form.get('version')==='session') return {error:'session'};
 if(form.get('version')==='save') return {error:'save'};
 return redirect('/?mock_model_saved=1');
}

/** Simulate legal event save outcomes without writing to any database. */
export async function mockLegalEventSave(_previous:import('../../../../src/app/account/organizations/[id]/patents/[assetId]/events/form-state').LegalEventFormState,form:FormData):Promise<import('../../../../src/app/account/organizations/[id]/patents/[assetId]/events/form-state').LegalEventFormState> {
 await new Promise(resolve=>setTimeout(resolve,300));
 if(form.get('note')==='입력 오류') return {error:'invalid'};
 if(form.get('note')==='저장 실패') return {error:'save'};
 if(form.get('note')==='연결 오류') return {error:'network'};
 if(form.get('note')==='인증 오류') return {error:'session'};
 return redirect('/?mock_legal_event_saved=1');
}

/** Exercise error and retry behavior without submitting any real revenue information. */
export async function mockRevenueRequest(_previous:import('../../../../src/domain/products/revenue-review-form').RevenueReviewFormState,form:FormData):Promise<import('../../../../src/domain/products/revenue-review-form').RevenueReviewFormState> {
 await new Promise(resolve=>setTimeout(resolve,150));
 const evidence=String(form.get('evidence')||'');
 if(evidence==='연결 오류')return {error:'network'};
 if(evidence==='중복 요청')return {error:'pending'};
 return redirect('/review-recovery?result=requested');
}
export async function mockRevenueDecision(_previous:import('../../../../src/domain/products/revenue-review-form').RevenueReviewFormState,form:FormData):Promise<import('../../../../src/domain/products/revenue-review-form').RevenueReviewFormState> {
 await new Promise(resolve=>setTimeout(resolve,150));
 const note=String(form.get('note')||''),decision=String(form.get('decision')||'');
 if(note==='처리된 요청')return {error:'stale'};
 if(note==='연결 오류')return {error:'network'};
 if(!['reviewed','needs_info'].includes(decision))return {error:'invalid'};
 return redirect(`/review-recovery?result=${decision}`);
}

/** Product deletion fixture uses synthetic records only. */
export async function mockProductDelete(form:FormData):Promise<void> {
 const params=new URLSearchParams({product:String(form.get('product')||''),q:String(form.get('return_query')||''),revenue:String(form.get('return_revenue')||''),page:String(form.get('return_page')||'')});
 redirect(`/product-delete?${params.toString()}`);
}

/** Isolated contribution editing without a database. */
export async function mockContributionSave(_previous:import('../../../../src/domain/products/patent-contribution').ContributionFormState,form:FormData):Promise<import('../../../../src/domain/products/patent-contribution').ContributionFormState> {
 await new Promise(resolve=>setTimeout(resolve,150));const value=String(form.get('contribution_rate')||'');
 if(value==='12.34')return {error:'network',saved:null};
 return {error:null,saved:value};
}

export async function mockBulkPatent(_previous:import('../../../../src/domain/products/bulk-patents').BulkPatentState,form:FormData):Promise<import('../../../../src/domain/products/bulk-patents').BulkPatentState> {
 await new Promise(resolve=>setTimeout(resolve,150));
 const patents=form.getAll('patent');
 if(patents.includes('aaaaaaaa-aaaa-4aaa-8aaa-000000000001'))return {error:'duplicate'};
 return redirect(`/bulk-product-patents?${new URLSearchParams({count:String(patents.length),query:String(form.get('asset_query')),page:String(form.get('choice_page'))})}`);
}
