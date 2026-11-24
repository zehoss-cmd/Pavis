import {test} from 'node:test';
import assert from 'node:assert/strict';
import {valuationDifference} from '../src/domain/valuations/scenario-comparison.ts';

test('[TEST] 평가액 차이는 큰 금액과 음수에서도 센트 단위까지 보존된다',()=>{
  assert.equal(valuationDifference('999999999999999999999.99','1000000000000000000000.00'),'+0.01');
  assert.equal(valuationDifference('1000.00','-0.25'),'-1,000.25');
  assert.equal(valuationDifference('-0.05','-0.05'),'0.00');
  assert.equal(valuationDifference('','1.00'),null);
});
