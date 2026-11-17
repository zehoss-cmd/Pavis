import { renderSiteIcon } from '@/lib/branding/site-icon';
export const runtime='nodejs';
export async function GET() {
 const png = new Uint8Array(await (await renderSiteIcon(64)).arrayBuffer());
 // An ICO directory containing a PNG image, supported by modern browsers.
 const ico = new Uint8Array(22 + png.length);
 const header = new DataView(ico.buffer);
 header.setUint16(2,1,true); header.setUint16(4,1,true);
 ico[6]=64; ico[7]=64; header.setUint16(10,1,true); header.setUint16(12,32,true);
 header.setUint32(14,png.length,true); header.setUint32(18,22,true); ico.set(png,22);
 return new Response(ico,{headers:{'Content-Type':'image/x-icon','Cache-Control':'public, max-age=86400'}});
}
