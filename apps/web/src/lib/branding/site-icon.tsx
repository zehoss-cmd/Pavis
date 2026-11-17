import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Render the existing PAVIS logo inside a square icon without changing the artwork. */
export async function renderSiteIcon(size: number) {
 const logo = await readFile(join(process.cwd(),'public','pavis-logo-transparent.png'));
 const src = `data:image/png;base64,${logo.toString('base64')}`;
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#ffffff'}}>
   {/* ImageResponse renders the local brand artwork as an icon, not a web page image. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={src} width={size} height={Math.round(size*2/3)} alt="" />
  </div>, {width:size,height:size,headers:{'Cache-Control':'public, max-age=86400'}},
 );
}
