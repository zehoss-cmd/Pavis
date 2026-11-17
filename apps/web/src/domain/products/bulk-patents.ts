export const bulkPatentLimit=25;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type BulkPatentState={error:'invalid'|'duplicate'|'session'|'network'|'save'|null};
export function parsePatentSelection(values:FormDataEntryValue[]):string[]|null {
 if(values.length<1||values.length>bulkPatentLimit||values.some(value=>typeof value!=='string'||!uuid.test(value)))return null;
 const ids=(values as string[]).map(value=>value.toLowerCase());
 return new Set(ids).size===ids.length?ids:null;
}
