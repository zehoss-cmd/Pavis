import test from 'node:test';
import assert from 'node:assert/strict';
import {parseValuationPage,valuationPageQuery,valuationResultQuery,valuationPageSize,valuationMaxPage} from '../src/lib/valuations/pagination.ts';

test('assessment pages have bounded positive offsets',()=>{
 for(const value of [undefined, '', '0', '-1', '1.5', ['2'], '10000']) assert.equal(parseValuationPage(value),1);
 assert.equal(parseValuationPage('2'),2);
 assert.equal(parseValuationPage('9999'),valuationMaxPage);
 assert.equal(valuationPageSize,25);
});

test('page links preserve the requested asset and return location',()=>{
 assert.equal(valuationPageQuery(1),'?#valuation-records');
 assert.equal(valuationPageQuery(2,'abc & xyz'),'?page=2&asset=abc+%26+xyz#valuation-records');
 assert.equal(valuationResultQuery('update',2),'?update=1&page=2#valuation-records');
 assert.equal(valuationResultQuery('delete',1),'?delete=1#valuation-records');
});
