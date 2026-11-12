import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEventPage,eventPageQuery,eventResultQuery,eventPageSize,eventMaxPage} from '../src/lib/patents/event-pagination.ts';

test('legal history pages are bounded and preserve return location',()=>{
 for (const invalid of [undefined,'','0','-1','2.5',['2'],'10000']) assert.equal(parseEventPage(invalid),1);
 assert.equal(parseEventPage('2'),2);
 assert.equal(parseEventPage('9999'),eventMaxPage);
 assert.equal(eventPageSize,25);
 assert.equal(eventPageQuery(1),'?#legal-events');
 assert.equal(eventPageQuery(2),'?page=2#legal-events');
 assert.equal(eventResultQuery('updated',2),'?updated=1&page=2#legal-events');
 assert.equal(eventResultQuery('save',2),'?error=save&page=2#legal-events');
});
