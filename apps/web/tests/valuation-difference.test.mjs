import {test} from 'node:test';
import assert from 'node:assert/strict';
import {valuationDifference} from '../src/domain/valuations/scenario-comparison.ts';

test('[TEST] 평가액 차이는 큰 금액과 음수에서도 센트 단위까지 보존된다',()=>{
  assert.equal(valuationDifference('999999999999999999999.99','1000000000000000000000.00'),'+0.01');
  assert.equal(valuationDifference('1000.00','-0.25'),'-1,000.25');
  assert.equal(valuationDifference('-0.05','-0.05'),'0.00');
  assert.equal(valuationDifference('','1.00'),null);
});

test('[TEST] 비교 CSV는 원본 금액과 음수 차이를 보존하고 텍스트 수식을 이스케이프한다',async()=>{
  const {comparisonCsv}=await import('../src/domain/valuations/comparison-csv.ts');
  const record={id:'a',result_text:'9007199254740993.30',created_at:'2026-01-01',model_version:'v1',status:'draft',scenario:'base',years:2,base_sales:10,growth_rate:1,royalty_rate:2,contribution_rate:3,annual_cost:4,tax_rate:5,discount_rate:6,assumptions:'=1+1'};
  const csv=comparisonCsv({asset:'asset',date:'2026-01-01',currency:'USD'},'센서, "A"',record,{...record,id:'b',base_sales:12,result_text:'9007199254740993.29'});
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"센서, ""A"""'));
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes('9007199254740993.30,9007199254740993.29,"USD",-0.01'));
  assert.ok(csv.includes('"첫해 매출",10,12,"USD","변경"'));
});
