import { test } from 'node:test';
import assert from 'node:assert/strict';
import {isSelfReview,reviewAppliesToCurrent,reviewHistoryPage,reviewStatusLabel} from '../src/domain/products/revenue-review-history.ts';
test('검토 이력에서 현재 버전과 이전 버전을 명확히 구분한다',()=>{
 assert.equal(isSelfReview('user','user'),true);assert.equal(isSelfReview('user',null),false);assert.equal(isSelfReview('user','other'),false);
 assert.equal(reviewAppliesToCurrent(4,4),true);assert.equal(reviewAppliesToCurrent(3,4),false);
 assert.equal(reviewStatusLabel('reviewed'),'운영자 검토 완료');assert.equal(reviewStatusLabel('superseded'),'변경으로 검토 종료');assert.equal(reviewStatusLabel('invalid'),'상태 확인 필요');
});
test('이력 페이지는 잘못된 값이나 과도한 페이지를 제한한다',()=>{
 assert.equal(reviewHistoryPage('2'),2);assert.equal(reviewHistoryPage('0'),1);assert.equal(reviewHistoryPage('1001'),1000);assert.equal(reviewHistoryPage(['2']),1);assert.equal(reviewHistoryPage('2x'),1);
});
