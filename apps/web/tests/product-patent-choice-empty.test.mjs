import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patentChoiceEmpty} from '../src/domain/products/patent-choice-empty.ts';
const base={page:1,query:'',rows:0,hasNext:false,maxPage:1000};
test('empty candidate guidance distinguishes next, previous, search and register',()=>{
 assert.equal(patentChoiceEmpty({...base,rows:25,hasNext:true}).action,'next');
 assert.equal(patentChoiceEmpty({...base,page:1000,rows:25,hasNext:true}).action,'limit');
 assert.equal(patentChoiceEmpty({...base,page:2}).action,'previous');
 assert.equal(patentChoiceEmpty({...base,query:'abc'}).action,'reset');
 assert.equal(patentChoiceEmpty(base).action,'register');
 assert.match(patentChoiceEmpty({...base,rows:25,hasNext:true}).message,/이 페이지/);
});
