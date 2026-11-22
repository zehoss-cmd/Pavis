import { textCell } from '../valuations/csv.ts';

export function qualityCsv(today:string,page:number,assetCount:number,findings:readonly (readonly string[])[]) {
 const headings=['기준일','페이지','점검 대상 수','특허 ID','발명의 명칭','관할','출원번호','점검 항목'];
 const rows=findings.map(row=>[today,page,assetCount,...row]);
 return '\uFEFF'+[headings,...rows].map(row=>row.map(textCell).join(',')).join('\r\n')+'\r\n';
}
