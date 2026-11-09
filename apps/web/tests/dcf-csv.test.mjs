import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import { dcfCsv } from '../src/domain/valuations/dcf-csv.ts';
const flow={year_number:1,revenue:'1000.00',royalty_income:'100.00',annual_cost:'120.00',taxable_income:'-20.00',tax:'0.00',net_cashflow:'-20.00',discounted_cashflow:'-20.00'};
const snapshot={organization_name:'=위험',asset_id:'asset-id',asset_title:'특허, "제목"',jurisdiction:'KR',assessment_id:'valuation-id',valuation_date:'2025-01-01',scenario:'base',currency:'KRW',years:1,base_sales:'1000.00',growth_rate:'-12.50',royalty_rate:'10.00',contribution_rate:'100.00',annual_cost:'120.00',tax_rate:'25.00',discount_rate:'0.00',assumptions:'  @위험\n근거',model_version:'royalty-dcf-v1',result:'-20.00',status:'draft',created_at:'2025-01-01T00:00:00Z',updated_at:'2025-01-01T00:00:00Z',finalized_at:null,copied_from_id:null,copied_from_snapshot:null,cashflows:[flow]};
test('exports exact numeric values, CSV punctuation and safe spreadsheet text',()=>{
 const csv=dcfCsv(snapshot);assert.ok(csv.startsWith('\uFEFF'));const rows=parse(csv,{bom:true});
 const value=(section,label)=>rows.find(row=>row[0]===section&&row[1]===label)?.[2];
 assert.equal(value('평가','조직'),"'=위험");assert.equal(value('평가','특허명 (현재)'),'특허, "제목"');
 assert.equal(value('가정','근거 및 출처'),"'  @위험\n근거");assert.equal(value('가정','연 매출 성장률'),'-12.50');
 assert.equal(value('평가','추정 현재가치'),'-20.00');assert.equal(value('1년','할인 후 현금흐름'),'-20.00');
});
test('rejects missing cashflows, unsupported versions and numeric formula injection',()=>{
 assert.throws(()=>dcfCsv({...snapshot,cashflows:[]}));assert.throws(()=>dcfCsv({...snapshot,model_version:'unknown'}));
 assert.throws(()=>dcfCsv({...snapshot,base_sales:'=1+1'}));assert.throws(()=>dcfCsv({...snapshot,cashflows:[{...flow,year_number:2}]}));
});
