import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyReviewError } from '../src/domain/products/revenue-review-form.ts';
test('매출 검토의 중복·만료·권한 오류를 구분한다',()=>{
 assert.equal(classifyReviewError('23505'),'pending');assert.equal(classifyReviewError('P0002'),'stale');assert.equal(classifyReviewError('42501'),'forbidden');assert.equal(classifyReviewError('22023'),'invalid');assert.equal(classifyReviewError('unknown'),'save');
});
