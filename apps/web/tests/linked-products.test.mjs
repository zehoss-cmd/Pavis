import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productPage, productPageUrl } from '../src/lib/patents/linked-products.ts';
test('관련 제품 페이지 이동은 패밀리 검색 맥락을 보존하고 잘못된 페이지를 제한한다',()=>{
 assert.equal(productPage('2'),2);assert.equal(productPage('0'),1);assert.equal(productPage('10001'),1);assert.equal(productPage(['2']),1);
 assert.equal(productPageUrl({from_family:'1',family_q:'반도체 & AI',family_page:'2',return_family:'abc'},2),'?from_family=1&family_q=%EB%B0%98%EB%8F%84%EC%B2%B4+%26+AI&family_page=2&return_family=abc&product_page=2#linked-products');
 assert.equal(productPageUrl({},1),'?#linked-products');
});
