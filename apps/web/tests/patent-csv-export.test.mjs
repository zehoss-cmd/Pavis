import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import { patentCsv, patentExportLimit } from '../src/domain/patents/patent-csv.ts';
import { csvHeaders } from '../src/lib/patents/csv-import.ts';

test('patent CSV handles Korean, commas, quotes, line breaks, empty fields and spreadsheet formulas',()=>{
 const row={title:'기술, "A"\n다음 줄',jurisdiction:'KR',application_number:'00123',publication_number:null,registration_number:null,rights_holder:'=1+1',inventors:'@USER',priority_date:null,filing_date:'2025-03-01',legal_status:'granted',source:'\tformula',verified_date:null};
 const csv=patentCsv([row]);
 assert.ok(csv.startsWith('\uFEFF'));
 const rows=parse(csv,{bom:true,columns:true});
 assert.deepEqual(Object.keys(rows[0]),csvHeaders);
 assert.equal(rows[0].title,row.title);
 assert.equal(rows[0].application_number,'00123');
 assert.equal(rows[0].rights_holder,"'=1+1");
 assert.equal(rows[0].inventors,"'@USER");
 assert.equal(rows[0].source,"'\tformula");
 assert.equal(rows[0].publication_number,'');
 assert.equal(patentExportLimit,1000);
});

test('empty patent CSV still provides its columns',()=>{
 const parsed=parse(patentCsv([]),{bom:true});
 assert.deepEqual(parsed,[csvHeaders]);
});
