import { patentAccess } from '@/lib/patents/access';
import { csvHeaders } from '@/lib/patents/csv-import';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;const {canWrite}=await patentAccess(id);
 if(!canWrite) return new Response(null,{status:404});
 const example=['Sample patent','KR','10-2025-0000001','','','Example holder','Example inventor','2025-01-01','2025-02-01','pending','Manual',''];
 return new Response('\uFEFF'+csvHeaders.join(',')+'\r\n'+example.join(',')+'\r\n',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="pavis-patent-template.csv"','Cache-Control':'private, no-store'}});
}
