import { textCell } from '../valuations/csv.ts';
import { csvHeaders } from '../../lib/patents/csv-import.ts';

export const patentExportLimit=1000;
export function patentCsv(rows:ReadonlyArray<Record<(typeof csvHeaders)[number],string|null>>):string {
 const lines=[csvHeaders.map(textCell).join(',')];
 for(const row of rows) lines.push(csvHeaders.map(key=>textCell(row[key])).join(','));
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
