import { patentAccess } from '@/lib/patents/access';
import { createPatentXlsxTemplate } from '@/lib/patents/xlsx-template';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;const {canWrite}=await patentAccess(id);
 if(!canWrite) return new Response(null,{status:404});
 return new Response(Buffer.from(createPatentXlsxTemplate()),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="pavis-patent-template.xlsx"','Cache-Control':'private, no-store'}});
}
