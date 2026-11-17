import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProductPatentSearchField} from '../src/domain/products/patent-search.ts';
test('product patent search only accepts known columns',()=>{
 assert.equal(parseProductPatentSearchField('application_number'),'application_number');
 assert.equal(parseProductPatentSearchField('jurisdiction'),'jurisdiction');
 for(const value of [null,'constructor','__proto__','organization_id','title,organization_id', ['title']])assert.equal(parseProductPatentSearchField(value),'title');
});
