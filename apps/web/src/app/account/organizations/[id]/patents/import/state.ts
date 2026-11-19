import type { PatentCsvRow } from '@/lib/patents/csv-import';
export type ImportState={stage:'initial'|'preview'|'success'|'error';rows:PatentCsvRow[];errors:string[];count?:number;locations?:readonly string[]};
export const initialImportState:ImportState={stage:'initial',rows:[],errors:[]};
