import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patentQualityContext,patentQualityRules} from '../src/domain/patents/quality.ts';

const clean={
 id:'test',title:'센서',jurisdiction:'KR',family_id:'family',rights_holder:'회사',inventors:'연구자',
 application_number:'10-2020-0000001',publication_number:'10-2021-0000002',registration_number:'10-2022-0000003',
 filing_date:'2020-02-01',priority_date:'2020-01-01',verified_date:'2026-11-20',legal_status:'granted',source:'공식 공보',
};
const context=patentQualityContext(new Date('2026-11-21T15:00:00Z'));
const variants=[
 {title:null},{title:'가'.repeat(301)},{title:'A\tB'},{jurisdiction:null},{jurisdiction:'KOR'},
 {family_id:null},{rights_holder:null},{inventors:null},{rights_holder:'A'.repeat(501)},{inventors:'A'.repeat(501)},
 {application_number:null},{publication_number:null},{registration_number:null},{application_number:'1'.repeat(101)},
 {publication_number:'1'.repeat(101)},{registration_number:'1'.repeat(101)},{application_number:'1\t2'},{publication_number:'1\t2'},
 {registration_number:'1\t2'},{application_number:'123'},
 {filing_date:null},{priority_date:null},{verified_date:null},{filing_date:'2025-02-29'},{priority_date:'2025-2-01'},
 {verified_date:'bad'},{filing_date:'2026-11-23'},{priority_date:'2026-11-23'},{verified_date:'2026-11-23'},{priority_date:'2020-02-02'},
 {legal_status:null},{legal_status:'unknown'},{legal_status:'other'},{legal_status:'pending'},
 {legal_status:'expired',registration_number:null},{legal_status:'lapsed',registration_number:null},{legal_status:'revoked',registration_number:null},
 {source:null},{source:'A'.repeat(501)},{source:'A\tB'},
 {verified_date:null},{source:null},{verified_date:'2020-01-15'},{verified_date:'2019-12-31'},{verified_date:'2025-11-22'},
 {publication_number:clean.application_number},{registration_number:clean.application_number},{registration_number:clean.publication_number},
 {rights_holder:'A\tB'},{inventors:'A\tB'},
];
test('all 50 quality checks identify their own defect on synthetic assets',()=>{
 assert.equal(patentQualityRules.length,50);
 assert.equal(variants.length,50);
 for(const [index,[number,label,check]] of patentQualityRules.entries()){
  assert.equal(number,index+1);
  assert.equal(check(clean,context),false,label);
  assert.equal(check({...clean,...variants[index]},context),true,label);
 }
});
test('Korea date and calendar year boundary are stable',()=>{
 assert.deepEqual(context,{today:'2026-11-22',staleBefore:'2025-11-22'});
 assert.deepEqual(patentQualityContext(new Date('2024-02-29T00:00:00Z')),{today:'2024-02-29',staleBefore:'2023-02-28'});
});

test('quality view preserves approved conditions and excludes arbitrary destinations',async()=>{
 const {qualityReturnQuery}=await import('../src/domain/patents/quality.ts');
 assert.equal(qualityReturnQuery('page=2&group=3&rule=26&q=date&view=assets&issues=1&redirect=https://example.org'),'page=2&group=3&rule=26&q=date&view=assets&issues=1');
 assert.equal(qualityReturnQuery('page=-2&group=8&rule=51&view=other&issues=0'),'');
});
test('quality CSV includes scope and guards spreadsheet formulas',async()=>{
 const {qualityCsv}=await import('../src/domain/patents/quality-csv.ts');
 const result=qualityCsv('2026-11-22',2,25,[['id','=1+1','KR','123','누락']]);
 assert.match(result,/"기준일","페이지","점검 대상 수"/);
 assert.match(result,/"2026-11-22","2","25","id","'=1\+1"/);
});
