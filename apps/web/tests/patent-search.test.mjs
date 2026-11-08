import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePatentSearch, literalSearchPattern, patentPageQuery } from '../src/lib/patents/search.ts';

test('search rejects unrecognized field, status and pages and normalizes country', () => {
  assert.deepEqual(parsePatentSearch({field:'organization_id',country:' kr ',status:'all',page:'-3',sort:'wrong'}),{field:'title',q:'',country:'KR',status:'',page:1,sort:'newest'});
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
