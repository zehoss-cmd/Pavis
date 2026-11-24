'use client';
export function CsvDownload({csv,filename,label}:{csv:string;filename:string;label:string}) {
 return <button type="button" onClick={()=>{
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }}>{label}</button>;
}
