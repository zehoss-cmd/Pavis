import { fromBuffer, type Entry } from 'yauzl';
import { SaxesParser } from 'saxes';
import readXlsxFile from 'read-excel-file/node';
import { zipSync } from 'fflate';
import { maxCsvBytes, maxCsvRows, parsePatentTable, type CsvResult } from './csv-import.ts';

const maxEntries=128, maxExpandedBytes=2*1024*1024, maxColumn=12;
const unsafeKeys=new Set([...Object.getOwnPropertyNames(Object.prototype).map(key=>key.toLowerCase()),'prototype']);
function inspectXml(bytes:Buffer,path:string) {
 const xml=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if((path==='[content_types].xml' || path.endsWith('.rels')) && /macroEnabled|vbaProject/i.test(xml)) throw new Error('macro');
 const parser=new SaxesParser();
 let inSheetData=0, rows=0, sheets=0, depth=0, elements=0;
 parser.on('doctype',()=>{throw new Error('doctype');});
 parser.on('opentag',tag=>{
  if(++depth>64 || ++elements>20000) throw new Error('xml limits');
  const name=tag.name.split(':').pop();
  if(path==='xl/workbook.xml' && name==='sheet') {
   if(++sheets>1) throw new Error('multiple sheets');
   if(Object.entries(tag.attributes).some(([key,value])=>key.endsWith(':id') && typeof value==='string' && unsafeKeys.has(value.toLowerCase()))) throw new Error('unsafe id');
  }
  if(name==='Relationship') {
   if(typeof tag.attributes.TargetMode==='string' && tag.attributes.TargetMode.toLowerCase()==='external') throw new Error('external link');
   const type=tag.attributes.Type,target=tag.attributes.Target,relationId=tag.attributes.Id;
   if(typeof relationId==='string' && unsafeKeys.has(relationId.toLowerCase())) throw new Error('unsafe id');
   if(typeof target==='string' && target.toLowerCase().split('/').some(part=>unsafeKeys.has(part))) throw new Error('unsafe target');
   if(typeof type==='string' && /\/(worksheet|sharedStrings|styles)$/i.test(type) && (typeof target!=='string' || !target.toLowerCase().endsWith('.xml') || target.split('/').includes('..'))) throw new Error('unexpected relationship');
  }
  if(name==='sheetData') inSheetData++;
  if(inSheetData && name==='f') throw new Error('formula');
  if(inSheetData && name==='row') {
   if(++rows>maxCsvRows+1) throw new Error('rows');
   const value=tag.attributes.r;
   if(typeof value==='string' && (!/^[1-9]\d*$/.test(value)||Number(value)>maxCsvRows+1)) throw new Error('row number');
  }
  if(inSheetData && name==='c') {
   const coordinate=tag.attributes.r;
   if(typeof coordinate!=='string') throw new Error('cell reference');
   const match=/^([A-Z]{1,3})([1-9]\d*)$/i.exec(coordinate);
   if(!match || Number(match[2])>maxCsvRows+1) throw new Error('cell row');
   const col=Array.from(match[1].toUpperCase()).reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);
   if(col>maxColumn) throw new Error('cell column');
  }
 });
 parser.on('closetag',tag=>{if(tag.name.split(':').pop()==='sheetData') inSheetData--;depth--;});
 parser.write(xml).close();
}
async function inspectZip(buffer:Buffer):Promise<Record<string,Uint8Array>> {
 return await new Promise<Record<string,Uint8Array>>((resolve,reject)=>{
  fromBuffer(buffer,{lazyEntries:true,autoClose:false,validateEntrySizes:true,strictFileNames:true},(error,zip)=>{
   if(error||!zip){reject(new Error('zip'));return;}
   let finished=false,total=0,entries=0;const names=new Set<string>();const files:Record<string,Uint8Array>=Object.create(null);
   const finish=(error?:Error)=>{if(finished)return;finished=true;zip.close();if(error) reject(error); else resolve(files);};
   zip.on('error',()=>finish(new Error('zip')));
   zip.on('end',()=>finish());
   zip.on('entry',(entry:Entry)=>{
    if(++entries>maxEntries || entry.uncompressedSize>maxExpandedBytes || (entry.generalPurposeBitFlag&1)!==0) {finish(new Error('limits'));return;}
    const name=entry.fileName.toLowerCase();
    if(names.has(name) || name.split('/').some(part=>unsafeKeys.has(part)) || name.includes('vbaproject.bin') || name.includes('externallinks/') || name==='encryptedpackage' || name==='encryptioninfo') {finish(new Error('unsupported'));return;}
    names.add(name);
    if(name.endsWith('/')){zip.readEntry();return;}
    zip.openReadStream(entry,(streamError,stream)=>{
     if(streamError||!stream){finish(new Error('stream'));return;}
     const chunks:Buffer[]=[];let size=0;
     stream.on('error',()=>finish(new Error('stream')));
     stream.on('data',(chunk:Buffer)=>{size+=chunk.length;total+=chunk.length;if(size>maxExpandedBytes||total>maxExpandedBytes){stream.destroy();finish(new Error('limits'));}else chunks.push(chunk);});
     stream.on('end',()=>{if(finished)return;try {const content=Buffer.concat(chunks);if(name.endsWith('.xml')||name.endsWith('.rels')) inspectXml(content,name);files[entry.fileName]=content;}catch{finish(new Error('xml'));return;}zip.readEntry();});
    });
   });
   zip.readEntry();
  });
 });
}
export async function parsePatentXlsx(buffer:Buffer):Promise<CsvResult> {
 if(buffer.length===0 || buffer.length>maxCsvBytes) return {rows:[],errors:['파일은 비어 있지 않아야 하며 256KB 이하여야 합니다.']};
 try {
  const files=await inspectZip(buffer);
  // Rebuild from inspected entries so another ZIP reader cannot process hidden local records.
  const safeZip=Buffer.from(zipSync(files,{level:0}));
  const sheets=await readXlsxFile(safeZip);
  if(sheets.length!==1) return {rows:[],errors:['엑셀 파일에는 작업할 시트 하나만 있어야 합니다.']};
  const data=sheets[0].data as unknown[][];
  const dates=new Set(['priority_date','filing_date','verified_date']);
  const header=(data[0]||[]).map(value=>typeof value==='string'?value.trim():'');
  const errors:string[]=[];
  const table=data.map((cells,rowIndex)=>cells.map((value,colIndex)=>{
   if(value===null || value===undefined) return '';
   if(typeof value==='string') return value;
   if(value instanceof Date && rowIndex>0 && dates.has(header[colIndex]) && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0,10);
   errors.push(`데이터 ${Math.max(rowIndex,1)}번: 날짜 외 셀은 텍스트 형식으로 입력해 주세요.`);
   return '';
  }));
  if(errors.length) return {rows:[],errors:errors.slice(0,100)};
  return parsePatentTable([table[0],...table.slice(1).filter(row=>row.some(value=>value.trim()))]);
 } catch {return {rows:[],errors:['XLSX 파일을 읽을 수 없습니다. 시트 1개, 100건 이하의 텍스트 데이터만 사용하고 수식·외부 연결을 제거해 주세요.']};}
}
