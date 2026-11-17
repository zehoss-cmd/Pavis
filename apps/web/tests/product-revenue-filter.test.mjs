import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revenueFilter,productListQuery,previousRevenueYear,deleteReturnQuery } from '../src/domain/products/revenue-filter.ts';
test('매출 필터는 유효한 값만 허용하고 검색과 페이지 이동에 유지된다',()=>{
 assert.equal(revenueFilter('outdated'),'outdated');assert.equal(revenueFilter('missing'),'missing');assert.equal(revenueFilter('present'),'present');assert.equal(revenueFilter('invalid'),'');assert.equal(revenueFilter(['missing']),'');
 assert.equal(productListQuery('제품 & A','missing',2),'?q=%EC%A0%9C%ED%92%88+%26+A&revenue=missing&page=2');assert.equal(productListQuery('','',1),'?');
});

test('매출 비교 기준은 한국의 전년도이며 연말 경계에서 바뀐다',()=>{assert.equal(previousRevenueYear(new Date('2025-12-31T14:59:59Z')),2024);assert.equal(previousRevenueYear(new Date('2025-12-31T15:00:00Z')),2025);});

test('삭제 후 제품 목록 검색 조건을 안전하게 복원한다',()=>{
 assert.equal(deleteReturnQuery('제품 & A','missing','2'),'?q=%EC%A0%9C%ED%92%88+%26+A&revenue=missing&page=2&deleted=1');
 assert.equal(deleteReturnQuery('','https://example.com','99999'),'?deleted=1');
 assert.equal(deleteReturnQuery('','outdated','1001'),'?revenue=outdated&page=1000&deleted=1');
});
