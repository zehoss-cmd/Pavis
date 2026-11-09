import { patentAccess } from '@/lib/patents/access';
import { dcfCsv, type ExportSnapshot } from '@/domain/valuations/dcf-csv';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request:Request,{params}:{params:Promise<{id:string;assessmentId:string}>}) {
 const {id,assessmentId}=await params;
 if(!uuid.test(id)||!uuid.test(assessmentId)) return new Response(null,{status:404});
 const {supabase,canReadValuation}=await patentAccess(id);if(!canReadValuation) return new Response(null,{status:404});
 const {data,error}=await supabase.rpc('royalty_dcf_export_snapshot',{p_org:id,p_assessment:assessmentId});
 if(error) return new Response('평가 자료를 불러오지 못했습니다.',{status:500,headers:{'Cache-Control':'private, no-store'}});
 if(!data) return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
 try {
  const csv=dcfCsv(data as ExportSnapshot);
  return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="pavis-dcf-${assessmentId}.csv"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 } catch {return new Response('평가 자료가 완전하지 않아 내보낼 수 없습니다.',{status:409,headers:{'Cache-Control':'private, no-store'}});}
}
