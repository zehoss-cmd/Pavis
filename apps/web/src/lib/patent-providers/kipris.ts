import { SaxesParser } from 'saxes';
import type { PatentLookup } from './types';
export function parseKipris(xml:string):PatentLookup|null {
 let value='',failed=false;const fields:Record<string,string>={};
 const allowed=new Set(['successYN','resultCode','inventionTitle','applicationNumber','openNumber','registerNumber','applicantName','applicationDate']);
 const parser=new SaxesParser();
 parser.on('doctype',()=>{throw new Error('doctype');});
 parser.on('opentag',tag=>{void tag;value='';});
 parser.on('text',text=>{value+=text;});parser.on('cdata',text=>{value+=text;});
 parser.on('closetag',tag=>{if(allowed.has(tag.name)&&!fields[tag.name])fields[tag.name]=value.trim();value='';});
 parser.on('error',()=>{failed=true;});
 try{parser.write(xml).close();}catch{return null;}
 if(failed||fields.successYN==='N'||(fields.resultCode&&fields.resultCode!=='00'))return null;
 if(!fields.inventionTitle||!fields.applicationNumber)return null;
 const date=fields.applicationDate||'',filing_date=/^\d{8}$/.test(date)?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`:'';
 return {title:fields.inventionTitle.slice(0,300),jurisdiction:'KR',application_number:fields.applicationNumber.slice(0,100),publication_number:(fields.openNumber||'').slice(0,100),registration_number:(fields.registerNumber||'').slice(0,100),rights_holder:'',filing_date,source:'KIPRISPlus'};
}
export async function lookupKipris(number:string,key:string):Promise<PatentLookup|null> {
 const url=new URL('https://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch');
 url.searchParams.set('applicationNumber',number);url.searchParams.set('ServiceKey',key);url.searchParams.set('numOfRows','1');
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw new Error('provider');
 const data=await response.arrayBuffer();if(data.byteLength>1024*1024)throw new Error('provider');
 const result=parseKipris(new TextDecoder().decode(data));
 if(result&&result.application_number.replace(/\D/g,'')!==number)return null;
 return result;
}
