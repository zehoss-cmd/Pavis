import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFamilySearch,familyPageQuery,familyMaxPage,familyAssetQuery,familyReturnQuery,savedFamilyContext} from '../src/lib/patents/family-search.ts';
test('family search bounds input and preserves encoded query',()=>{
 assert.deepEqual(parseFamilySearch({q:'  AI 특허  ',page:'2'}),{q:'AI 특허',page:2});
 assert.deepEqual(parseFamilySearch({q:['bad'],page:'-1'}),{q:'',page:1});
 assert.equal(parseFamilySearch({q:'x'.repeat(101),page:'9999'}).q.length,100);
 assert.equal(parseFamilySearch({page:'9999'}).page,familyMaxPage);
 assert.equal(familyPageQuery('AI & 특허',2),'?q=AI+%26+%ED%8A%B9%ED%97%88&page=2');
});

test('family return links preserve bounded search context without accepting a destination',()=>{
 const encoded=familyAssetQuery('AI & 특허',2);
 const params=Object.fromEntries(new URLSearchParams(encoded.slice(1)));
 assert.equal(familyReturnQuery(params),'?q=AI+%26+%ED%8A%B9%ED%97%88&page=2');
 assert.equal(familyReturnQuery({from_family:'1',family_q:'x'.repeat(101),family_page:'9999'}),`?q=${'x'.repeat(100)}&page=1000`);
 assert.equal(familyReturnQuery({from_family:'https://example.com',family_q:'test'}),'');
 assert.equal(familyReturnQuery({from_family:'1',family_q:['bad'],family_page:'-1'}),'?');
});

test('save preserves only validated family return context',()=>{
 const family='12345678-1234-1234-1234-123456789abc';
 const params=Object.fromEntries(new URLSearchParams(familyAssetQuery('AI & 특허',2,family).slice(1)));
 assert.equal(savedFamilyContext(params),familyAssetQuery('AI & 특허',2,family));
 assert.equal(savedFamilyContext({...params,return_family:'https://example.com'}),'');
 assert.equal(savedFamilyContext({...params,from_family:'0'}),'');
 assert.equal(savedFamilyContext({...params,family_page:'9999'}),familyAssetQuery('AI & 특허',1000,family));
});
