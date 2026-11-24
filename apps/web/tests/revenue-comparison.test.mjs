import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareAnnualRevenue} from '../src/domain/valuations/revenue-comparison.ts';

const revenue=(year,amount,currency='USD')=>({revenue_year:year,revenue_amount:amount,revenue_currency:currency});
test('[TEST] 연속된 동일 통화 매출만 비교한다',()=>{
 const current=revenue(2025,120);
 assert.equal(compareAnnualRevenue(current,revenue(2024,100)),'전년 대비 +20 USD (+20%)');
 assert.equal(compareAnnualRevenue(current,revenue(2023,100)),'전년도 매출 기록 없음');
 assert.equal(compareAnnualRevenue(current),'전년도 매출 기록 없음');
 assert.match(compareAnnualRevenue(current,revenue(2024,100,'KRW')),/통화가 달라/);
});
test('[TEST] 0원, 감소, 소수점 매출을 구분한다',()=>{
 assert.match(compareAnnualRevenue(revenue(2025,10),revenue(2024,0)),/\+10 USD.*산정 불가/);
 assert.equal(compareAnnualRevenue(revenue(2025,0),revenue(2024,10)),'전년 대비 -10 USD (-100%)');
 assert.equal(compareAnnualRevenue(revenue(2025,10.01),revenue(2024,10)),'전년 대비 +0.01 USD (+0.1%)');
});
