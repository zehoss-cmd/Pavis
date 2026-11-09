import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import { qualitativeCsv } from '../src/domain/valuations/qualitative-csv.ts';
const criteria=[{key:'legal',score:1,weight:40,note:'=위험'},{key:'technical',score:2,weight:30,note:'자료, "출처"'},{key:'market',score:3,weight:20,note:null},{key:'commercial',score:4,weight:10,note:'검토\n완료'}];
const snapshot={organization_name:'조직',asset_id:'asset-id',asset_title:'특허',jurisdiction:'KR',assessment_id:'assessment-id',assessment_date:'2025-01-01',status:'draft',model_version:'qualitative-v1',model_name:'모델',model_revision:'v1',model_description:null,weighted_score:'2.00',created_at:'2025-01-01T00:00:00Z',updated_at:'2025-01-01T00:00:00Z',finalized_at:null,criteria};
test('exports model, weights and evidence while protecting spreadsheet text',()=>{
 const csv=qualitativeCsv(snapshot);assert.ok(csv.startsWith('\uFEFF'));const rows=parse(csv,{bom:true});const val=(section,label)=>rows.find(row=>row[0]===section&&row[1]===label)?.[2];
 assert.equal(val('평가','가중 평균'),'2.00');assert.equal(val('모델','모델 버전'),'v1');assert.equal(val('법적 안정성','가중치'),'40');assert.equal(val('법적 안정성','근거 및 출처'),"'=위험");assert.equal(val('기술성','근거 및 출처'),'자료, "출처"');assert.equal(val('사업화 가능성','근거 및 출처'),'검토\n완료');
});
test('rejects incomplete or inconsistent snapshots',()=>{
 assert.throws(()=>qualitativeCsv({...snapshot,criteria:criteria.slice(1)}));assert.throws(()=>qualitativeCsv({...snapshot,criteria:criteria.map((item,i)=>i?item:{...item,weight:99})}));assert.throws(()=>qualitativeCsv({...snapshot,weighted_score:'=1+1'}));assert.throws(()=>qualitativeCsv({...snapshot,model_version:'unknown'}));
});
