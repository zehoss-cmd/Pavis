import test from 'node:test';
import assert from 'node:assert/strict';
import { requestedAssetId,selectedRequestedAsset } from '../src/lib/patents/requested-asset.ts';
const id='3dbe1094-356b-44dd-9ab1-774bf3f995ff';
test('valuation forms only preselect valid, available assets',()=>{
 assert.equal(requestedAssetId(id),id);
 for(const value of ['',undefined,['x'],`${id},other`,'not-a-uuid']) assert.equal(requestedAssetId(value),null);
 assert.equal(selectedRequestedAsset(id,[{id}]),id);
 assert.equal(selectedRequestedAsset(id,[{id:'b1d5a6e7-0000-4000-8000-000000000001'}]),'');
 assert.equal(selectedRequestedAsset(null,[{id}]),'');
});
