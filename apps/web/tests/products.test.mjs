import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProduct, previewRevenueChange } from '../src/domain/products/validation.ts';
const form=(entries)=>{const f=new FormData();for(const [key,value] of Object.entries(entries))f.set(key,value);return f;};
test('제품은 이름과 매출 기준연도 및 금액을 보존한다',()=>{
 assert.deepEqual(parseProduct(form({name:' 제품 A ',launch_year:'2020',revenue_year:'2025',revenue_amount:'1234.50',revenue_currency:'KRW'})),{name:'제품 A',launch_year:2020,revenue_year:2025,revenue_amount:'1234.50',revenue_currency:'KRW'});
 assert.deepEqual(parseProduct(form({name:'제품',revenue_year:'2025',revenue_currency:'KRW'})),{name:'제품',launch_year:null,revenue_year:null,revenue_amount:null,revenue_currency:null});
 assert.equal(parseProduct(form({name:'제품',revenue_year:'2025',revenue_amount:'0',revenue_currency:'KRW'})).revenue_amount,'0');
});
test('유효하지 않은 금액, 연도, 통화와 이름을 거부한다',()=>{
 for(const values of [{name:' '},{name:'A',launch_year:'1799'},{name:'A',revenue_amount:'-1',revenue_year:'2025',revenue_currency:'KRW'},{name:'A',revenue_amount:'1.001',revenue_year:'2025',revenue_currency:'KRW'},{name:'A',revenue_amount:'1',revenue_year:'',revenue_currency:'KRW'},{name:'A',revenue_amount:'1',revenue_year:'2025',revenue_currency:'XXX'}])assert.equal(parseProduct(form(values)),null);
});

test('제품 매출의 천 단위 구분을 검증하고 정확한 소수 문자열을 저장한다',()=>{
 const parse=(amount)=>parseProduct(form({name:'TEST 제품',revenue_amount:amount,revenue_year:'2025',revenue_currency:'USD'}));
 assert.equal(parse('999,999,999,999.99').revenue_amount,'999999999999.99');
 assert.equal(parse('1,234.50').revenue_amount,'1234.50');
 for(const amount of ['1,23','12,34,567','1,000,000,000,000','1,234.001','1e3']) assert.equal(parse(amount),null);
});

test('매출 미리보기는 실제 값 변경만 표시하고 미입력과 0을 구분한다',()=>{
 const current={revenue_year:2025,revenue_amount:1234,revenue_currency:'KRW'};
 const draft={revenue_year:'2025',revenue_amount:'1,234.00',revenue_currency:'KRW'};
 assert.equal(previewRevenueChange(current,draft),null);
 assert.equal(previewRevenueChange(current,{...draft,revenue_year:''}),null);
 assert.equal(previewRevenueChange(current,{...draft,revenue_amount:'1,23'}),null);
 assert.equal(previewRevenueChange(current,{...draft,revenue_amount:''}).after,'매출 미입력');
 assert.deepEqual(previewRevenueChange(current,{...draft,revenue_amount:'0',revenue_currency:'USD'}),{before:'2025년 · 1,234 KRW',after:'2025년 · 0 USD'});
});
