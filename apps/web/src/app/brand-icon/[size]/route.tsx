import { renderSiteIcon } from '@/lib/branding/site-icon';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{size:string}>}) {
 const {size}=await params;
 if (!['32','180','192','512'].includes(size)) return new Response(null,{status:404});
 return renderSiteIcon(Number(size));
}
