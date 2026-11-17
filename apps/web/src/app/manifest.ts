import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return {name:'PAVIS | 특허의 가능성을 가치로',short_name:'PAVIS',start_url:'/',display:'browser',background_color:'#ffffff',icons:[{src:'/brand-icon/192?v=2',sizes:'192x192',type:'image/png'},{src:'/brand-icon/512?v=2',sizes:'512x512',type:'image/png'}]};
}
