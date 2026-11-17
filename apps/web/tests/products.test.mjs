import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProduct } from '../src/domain/products/validation.ts';
const form=(entries)=>{const f=new FormData();for(const [key,value] of Object.entries(entries))f.set(key,value);return f;};
test('제품은 이름과 매출 기준연도 및 금액을 보존한다',()=>{
 assert.deepEqual(parseProduct(form({name:' 제품 A ',launch_year:'2020',revenue_year:'2025',revenue_amount:'1234.50',revenue_currency:'KRW'})),{name:'제품 A',launch_year:2020,revenue_year:2025,revenue_amount:'1234.50',revenue_currency:'KRW'});
 assert.deepEqual(parseProduct(form({name:'제품',revenue_year:'2025',revenue_currency:'KRW'})),{name:'제품',launch_year:null,revenue_year:null,revenue_amount:null,revenue_currency:null});
 assert.equal(parseProduct(form({name:'제품',revenue_year:'2025',revenue_amount:'0',revenue_currency:'KRW'})).revenue_amount,'0');
});
test('유효하지 않은 금액, 연도, 통화와 이름을 거부한다',()=>{
 for(const values of [{name:' '},{name:'A',launch_year:'1799'},{name:'A',revenue_amount:'-1',revenue_year:'2025',revenue_currency:'KRW'},{name:'A',revenue_amount:'1.001',revenue_year:'2025',revenue_currency:'KRW'},{name:'A',revenue_amount:'1',revenue_year:'',revenue_currency:'KRW'},{name:'A',revenue_amount:'1',revenue_year:'2025',revenue_currency:'XXX'}])assert.equal(parseProduct(form(values)),null);
});
