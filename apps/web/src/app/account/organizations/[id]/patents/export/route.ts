import { patentAccess } from '@/lib/patents/access';
import { literalSearchPattern, parsePatentSearch, type SearchParams } from '@/lib/patents/search';
import { patentCsv, patentExportLimit } from '@/domain/patents/patent-csv';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const {supabase}=await patentAccess(id);
 const url=new URL(request.url), raw:SearchParams={};
 for(const key of new Set(url.searchParams.keys())) {
  const values=url.searchParams.getAll(key);
  raw[key]=values.length===1?values[0]:values;
 }
 const search=parsePatentSearch(raw);
 let query=supabase.from('patent_assets').select('title,jurisdiction,application_number,publication_number,registration_number,rights_holder,inventors,priority_date,filing_date,legal_status,source,verified_date',{count:'exact'}).eq('organization_id',id);
 if(search.q) query=query.ilike(search.field,literalSearchPattern(search.q));
 if(search.country) query=query.eq('jurisdiction',search.country);
 if(search.status) query=query.eq('legal_status',search.status);
 if(search.family) query=query.eq('family_id',search.family);
 if(search.sort==='title') query=query.order('title',{ascending:true}).order('id',{ascending:true});
 else query=query.order('created_at',{ascending:search.sort==='oldest'}).order('id',{ascending:search.sort==='oldest'});
 const {data,error,count}=await query.range(0,patentExportLimit-1);
 if(error||count===null||!data) return new Response('특허 목록을 불러오지 못했습니다.',{status:500,headers});
 if(count>patentExportLimit) return new Response('검색 조건을 좁혀 주세요.',{status:413,headers});
 if(data.length!==count) return new Response('특허 목록이 완전하지 않습니다.',{status:500,headers});
 return new Response(patentCsv(data),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="pavis-patents.csv"'}});
}
