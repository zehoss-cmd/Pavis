import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { parsePatentXlsx } from '../src/lib/patents/xlsx-import.ts';
const workbook=(sheetXml, extra={})=>Buffer.from(zipSync(Object.fromEntries(Object.entries({
 'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Patents" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':sheetXml,
 ...extra,
}).map(([key,value])=>[key,strToU8(value)]))));
const wrap=rows=>'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows+'</sheetData></worksheet>';
const cell=(ref,value)=>`<c r="${ref}" t="inlineStr"><is><t>${value}</t></is></c>`;
const heading='<row r="1">'+cell('A1','title')+cell('B1','jurisdiction')+cell('C1','application_number')+'</row>';
const row='<row r="2">'+cell('A2','Test invention')+cell('B2','KR')+cell('C2','10-001')+'</row>';
test('reads a real single-sheet XLSX with text cells',async()=>{
 const result=await parsePatentXlsx(workbook(wrap(heading+row)));assert.deepEqual(result.errors,[]);assert.equal(result.rows.length,1);assert.equal(result.rows[0].application_number,'10-001');
});
test('rejects formulas, sparse oversized coordinates, and decompression bombs',async()=>{
 const formula='<row r="2">'+cell('A2','Test')+cell('B2','KR')+'<c r="C2"><f>1+1</f><v>2</v></c></row>';
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+formula)))).errors.length);
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+'<row r="1048576">'+cell('A1048576','bad')+'</row>')))).errors.length);
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/extra.xml':'x'.repeat(2*1024*1024+1)}))).errors.length);
});
test('rejects numeric identifiers, multiple sheets and external links',async()=>{
 const numeric='<row r="2">'+cell('A2','Test')+cell('B2','KR')+'<c r="C2"><v>12</v></c></row>';
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+numeric)))).errors.length);
 const two='<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="a" sheetId="1" r:id="rId1"/><sheet name="b" sheetId="2" r:id="rId2"/></sheets></workbook>';
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/workbook.xml':two}))).errors.length);
 const rel='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="https://example.invalid/" TargetMode="External"/></Relationships>';
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/_rels/workbook.xml.rels':rel}))).errors.length);
});

test('reads an Excel date cell and preserves a text identifier with leading zeros',async()=>{
 const {readFileSync}=await import('node:fs');
 const file=readFileSync(new URL('./fixtures/patent-excel.xlsx',import.meta.url));
 const result=await parsePatentXlsx(file);assert.deepEqual(result.errors,[]);assert.equal(result.rows[0].application_number,'001234');assert.equal(result.rows[0].filing_date,'2025-02-14');
});
test('generated XLSX template can be read back',async()=>{
 const {createPatentXlsxTemplate}=await import('../src/lib/patents/xlsx-template.ts');
 const result=await parsePatentXlsx(Buffer.from(createPatentXlsxTemplate()));assert.deepEqual(result.errors,[]);assert.equal(result.rows[0].application_number,'10-2025-0000001');
});

test('rejects non-XML worksheet targets and malformed archives',async()=>{
 const rel='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.bin"/></Relationships>';
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/_rels/workbook.xml.rels':rel}))).errors.length);
 assert.ok((await parsePatentXlsx(Buffer.from('not a zip archive'))).errors.length);
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/__proto__/x.xml':'unexpected'}))).errors.length);
 assert.ok((await parsePatentXlsx(workbook(wrap(heading+row),{'xl/toString/x.xml':'unexpected'}))).errors.length);
});
