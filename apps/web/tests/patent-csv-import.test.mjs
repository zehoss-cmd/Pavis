import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePatentCsv, validateRows } from '../src/lib/patents/csv-import.ts';

test('parses BOM, quoted commas, newlines, and optional fields',()=>{
 const parsed=parsePatentCsv('\uFEFFtitle,jurisdiction,application_number,inventors,legal_status\r\n"반도체, 소자",kr,KR-123,"김, 이",등록\r\n');
 assert.deepEqual(parsed.errors,[]);assert.equal(parsed.rows[0].title,'반도체, 소자');assert.equal(parsed.rows[0].jurisdiction,'KR');assert.equal(parsed.rows[0].inventors,'김, 이');assert.equal(parsed.rows[0].legal_status,'granted');
});
test('rejects malformed headers, missing numbers, repeated numbers and invalid dates',()=>{
 assert.ok(parsePatentCsv('title,jurisdiction,application_number,unknown\nx,KR,1,x').errors.length);
 assert.ok(parsePatentCsv('title,jurisdiction,application_number\nx,KR,').errors.length);
 assert.ok(parsePatentCsv('title,jurisdiction,application_number\nx,KR,ab 1\ny,kr,AB1').errors.some(e=>e.includes('중복')));
 assert.ok(parsePatentCsv('title,jurisdiction,application_number,filing_date\nx,KR,1,2025-02-29').errors.length);
 assert.ok(parsePatentCsv('title,jurisdiction,application_number,filing_date\nx,KR,1,0000-01-01').errors.length);
 assert.ok(parsePatentCsv('title,jurisdiction,application_number\n"bad,KR,1').errors.length);
});
test('revalidates client supplied data and bounds bulk size',()=>{
 assert.ok(validateRows([{title:'x',jurisdiction:'KR',application_number:'1',organization_id:'other'}]).errors.length);
 assert.ok(validateRows(Array.from({length:101},()=>({}))).errors.length);
 assert.ok(validateRows([{title:'x',jurisdiction:'KR',application_number:'1',legal_status:'invalid'}]).errors.length);
 assert.ok(validateRows([{title:'x',jurisdiction:'KR',application_number:'1',legal_status:'toString'}]).errors.length);
});
