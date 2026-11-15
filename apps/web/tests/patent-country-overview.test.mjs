import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCountries} from '../src/lib/patents/country-overview.ts';

test('country counts are ordered by count then code and include all rows',()=>{
 const rows=[{jurisdiction:'US'},{jurisdiction:'KR'},{jurisdiction:'JP'},{jurisdiction:'KR'},{jurisdiction:'US'}];
 assert.deepEqual(summarizeCountries(rows),[{country:'KR',count:2},{country:'US',count:2},{country:'JP',count:1}]);
 assert.deepEqual(summarizeCountries([]),[]);
});
