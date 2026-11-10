import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFamilySearch,familyPageQuery,familyMaxPage} from '../src/lib/patents/family-search.ts';
test('family search bounds input and preserves encoded query',()=>{
 assert.deepEqual(parseFamilySearch({q:'  AI 특허  ',page:'2'}),{q:'AI 특허',page:2});
 assert.deepEqual(parseFamilySearch({q:['bad'],page:'-1'}),{q:'',page:1});
 assert.equal(parseFamilySearch({q:'x'.repeat(101),page:'9999'}).q.length,100);
 assert.equal(parseFamilySearch({page:'9999'}).page,familyMaxPage);
 assert.equal(familyPageQuery('AI & 특허',2),'?q=AI+%26+%ED%8A%B9%ED%97%88&page=2');
});
