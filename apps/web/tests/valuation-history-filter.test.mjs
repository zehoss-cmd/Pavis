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

test('기준일 기간은 유효한 날짜와 올바른 순서만 허용한다', async () => {
 const {parseValuationDateRange}=await import('../src/lib/valuations/history-filter.ts');
 assert.deepEqual(parseValuationDateRange(undefined,''),{from:'',to:''});
 assert.deepEqual(parseValuationDateRange('2024-02-29','2024-02-29'),{from:'2024-02-29',to:'2024-02-29'});
 assert.deepEqual(parseValuationDateRange('2025-01-01',undefined),{from:'2025-01-01',to:''});
 assert.equal(parseValuationDateRange('2025-02-29','2025-03-01'),null);
 assert.equal(parseValuationDateRange('2026-02-01','2026-01-01'),null);
 assert.equal(parseValuationDateRange(['2025-01-01'],'2025-12-31'),null);
});
