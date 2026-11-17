import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revenueFilter,productListQuery } from '../src/domain/products/revenue-filter.ts';
test('매출 필터는 유효한 값만 허용하고 검색과 페이지 이동에 유지된다',()=>{
 assert.equal(revenueFilter('missing'),'missing');assert.equal(revenueFilter('present'),'present');assert.equal(revenueFilter('invalid'),'');assert.equal(revenueFilter(['missing']),'');
 assert.equal(productListQuery('제품 & A','missing',2),'?q=%EC%A0%9C%ED%92%88+%26+A&revenue=missing&page=2');assert.equal(productListQuery('','',1),'?');
});
