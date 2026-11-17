import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePatentSelection } from '../src/domain/products/bulk-patents.ts';
const id=n=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
test('bulk patent selection validates bounds and distinct UUIDs',()=>{
 assert.equal(parsePatentSelection([]),null);
 assert.deepEqual(parsePatentSelection([id(1)]),[id(1)]);
 assert.equal(parsePatentSelection(Array.from({length:25},(_,i)=>id(i))).length,25);
 assert.equal(parsePatentSelection(Array.from({length:26},(_,i)=>id(i))),null);
 assert.equal(parsePatentSelection([id(1),id(1).toUpperCase()]),null);
 assert.equal(parsePatentSelection(['bad']),null);
 assert.equal(parsePatentSelection([new File(['x'],'x')]),null);
});
