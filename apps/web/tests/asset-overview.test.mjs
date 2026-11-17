import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countValue } from '../src/domain/workspace/asset-overview.ts';
test('자산 현황의 실제 0건과 조회 실패를 구분한다',()=>{
 assert.equal(countValue({count:0,error:null}),0);
 assert.equal(countValue({count:12,error:null}),12);
 assert.equal(countValue({count:null,error:null}),null);
 assert.equal(countValue({count:0,error:{message:'unavailable'}}),null);
});
