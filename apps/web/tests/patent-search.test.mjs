import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePatentSearch, literalSearchPattern, patentPageQuery } from '../src/lib/patents/search.ts';

test('search rejects unrecognized field, status and pages and normalizes country', () => {
  assert.deepEqual(parsePatentSearch({field:'organization_id',country:' kr ',status:'all',page:'-3',sort:'wrong'}),{field:'title',q:'',country:'KR',status:'',family:'',page:1,sort:'newest'});
  assert.equal(parsePatentSearch({page:'9999'}).page,1000);
  assert.equal(parsePatentSearch({country:'K%',page:['2']}).country,'');
});
test('search safely treats LIKE wildcards as literals and keeps filters in page links', () => {
  assert.equal(literalSearchPattern('A%_\\B'),'%A\\%\\_\\\\B%');
  const filter=parsePatentSearch({field:'rights_holder',q:'  A & B  ',country:'us',status:'granted',sort:'title',page:'2'});
  const query=new URLSearchParams(patentPageQuery(filter,3).slice(1));
  assert.equal(query.get('field'),'rights_holder');
  assert.equal(query.get('q'),'A & B');
  assert.equal(query.get('country'),'US');
  assert.equal(query.get('status'),'granted');
  assert.equal(query.get('sort'),'title');
  assert.equal(query.get('page'),'3');
});

test('family filter accepts only UUIDs and remains in pagination links',()=>{
 const family='3dbe1094-356b-44dd-9ab1-774bf3f995ff';
 const search=parsePatentSearch({country:'KR',family});
 assert.equal(search.family,family);
 assert.equal(new URLSearchParams(patentPageQuery(search,2).slice(1)).get('family'),family);
 assert.equal(parsePatentSearch({family:'invalid'}).family,'');
});

test('clearing one patent filter preserves the others and returns to page one',()=>{
 const family='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const search=parsePatentSearch({field:'application_number',q:'KR & 123',country:'kr',status:'granted',sort:'title',family,page:'4'});
 for(const key of ['q','country','status']){
  const params=new URLSearchParams(patentPageQuery({...search,[key]:''},1));
  assert.equal(params.has(key),false);
  assert.equal(params.has('page'),false);
  assert.equal(params.get('family'),family);
  assert.equal(params.get('sort'),'title');
  for(const other of ['q','country','status'].filter(value=>value!==key))assert.equal(params.get(other),search[other]);
 }
});

test('patent return queries preserve bounded filters and discard unrelated keys',async()=>{
 const {patentListReturnQuery}=await import('../src/lib/patents/search.ts');
 const family='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const search=parsePatentSearch({field:'application_number',q:'KR & 123',country:'KR',status:'granted',family,sort:'title',page:'4'});
 const query=patentPageQuery(search,4);
 assert.equal(patentListReturnQuery(query+'&deleted=1&redirect=https://example.org'),query.slice(1));
 assert.equal(patentListReturnQuery(['page=4']),'');
 assert.equal(patentListReturnQuery('page=9000'),'page=1000');
});
