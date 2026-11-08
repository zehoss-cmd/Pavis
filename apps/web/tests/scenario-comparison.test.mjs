import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComparisonFilter } from '../src/domain/valuations/scenario-comparison.ts';
const valid={asset:'3dbe1094-356b-44dd-9ab1-774bf3f995ff',date:'2024-02-29',currency:'KRW'};
test('comparison requires a valid asset, calendar date and supported currency',()=>{
 assert.deepEqual(parseComparisonFilter(valid),valid);
 for (const input of [{...valid,asset:'x'},{...valid,date:'2025-02-29'},{...valid,date:'0000-01-01'},{...valid,currency:'krw'},{...valid,currency:'CNY'},{...valid,asset:['x']},{...valid,date:''}]) assert.equal(parseComparisonFilter(input),null);
});
