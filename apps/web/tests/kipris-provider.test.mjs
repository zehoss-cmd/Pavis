import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKipris,lookupKipris} from '../src/lib/patent-providers/kipris.ts';
const xml='<response><header><successYN>Y</successYN><resultCode>00</resultCode></header><body><items><item><inventionTitle>센서 &amp; 회로</inventionTitle><applicationNumber>1020050050026</applicationNumber><applicationDate>20050610</applicationDate><openNumber>1020060123456</openNumber><applicantName>출원인</applicantName></item></items></body></response>';
test('KIPRIS XML maps bibliographic details and retains unknown legal status',()=>{
 const item=parseKipris(xml);assert.equal(item.title,'센서 & 회로');assert.equal(item.application_number,'1020050050026');assert.equal(item.filing_date,'2005-06-10');assert.equal(item.source,'KIPRISPlus');assert.equal('legal_status' in item,false);
});
test('KIPRIS rejects errors, malformed XML and unsafe document types',()=>{
 assert.equal(parseKipris('<response><successYN>N</successYN><resultCode>30</resultCode></response>'),null);
 assert.equal(parseKipris('<response>'),null);
 assert.equal(parseKipris('<!DOCTYPE response [<!ENTITY x "bad">]><response>&x;</response>'),null);
});
test('KIPRIS uses HTTPS and refuses mismatched results',async()=>{
 const original=globalThis.fetch;let target;
 try{globalThis.fetch=async url=>{target=url;return new Response(xml)};assert.equal(await lookupKipris('1020050050027','private-key'),null);assert.equal(target.protocol,'https:');assert.equal(target.hostname,'plus.kipris.or.kr');}
 finally{globalThis.fetch=original;}
});
