import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComparisonFilter } from '../src/domain/valuations/scenario-comparison.ts';
const valid={asset:'3dbe1094-356b-44dd-9ab1-774bf3f995ff',date:'2024-02-29',currency:'KRW'};
test('comparison requires a valid asset, calendar date and supported currency',()=>{
 assert.deepEqual(parseComparisonFilter(valid),valid);
 for (const input of [{...valid,asset:'x'},{...valid,date:'2025-02-29'},{...valid,date:'0000-01-01'},{...valid,currency:'krw'},{...valid,currency:'CNY'},{...valid,asset:['x']},{...valid,date:''}]) assert.equal(parseComparisonFilter(input),null);
});

test('comparison review identifies missing, repeated, mixed versions and statuses', async () => {
 const {inspectScenarioComparison}=await import('../src/domain/valuations/scenario-comparison.ts');
 const rows=[{scenario:'base',status:'final',model_version:'v1'},{scenario:'base',status:'draft',model_version:'v2'},{scenario:'optimistic',status:'final',model_version:'v1'}];
 const result=inspectScenarioComparison(rows,true);
 assert.deepEqual(result.counts,{conservative:0,base:2,optimistic:1});
 assert.deepEqual(result.missing,['conservative']);assert.deepEqual(result.repeated,['base']);
 assert.equal(result.mixedVersions,true);assert.equal(result.mixedStatus,true);assert.equal(result.truncated,true);
 const complete=inspectScenarioComparison([{scenario:'conservative',status:'final',model_version:'v1'},{scenario:'base',status:'final',model_version:'v1'},{scenario:'optimistic',status:'final',model_version:'v1'}],false);
 assert.deepEqual(complete.missing,[]);assert.deepEqual(complete.repeated,[]);assert.equal(complete.mixedVersions,false);assert.equal(complete.mixedStatus,false);
});
