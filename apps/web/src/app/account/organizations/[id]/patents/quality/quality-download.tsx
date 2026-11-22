'use client';
export function QualityDownload({csv}:{csv:string}) {
 return <button type="button" onClick={()=>{
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='pavis-patent-quality.csv';
  link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }}>현재 페이지 발견 사항 CSV</button>;
}
