import test from 'node:test';
import assert from 'node:assert/strict';
import { parseValuationStatus } from '../src/lib/valuations/history-filter.ts';
test('평가 상태 필터는 허용된 상태만 받아들인다', () => {
 assert.equal(parseValuationStatus(undefined), 'all');
 assert.equal(parseValuationStatus('all'), 'all');
 assert.equal(parseValuationStatus('draft'), 'draft');
 assert.equal(parseValuationStatus('final'), 'final');
 assert.equal(parseValuationStatus('other'), null);
 assert.equal(parseValuationStatus(['draft','final']), null);
});
