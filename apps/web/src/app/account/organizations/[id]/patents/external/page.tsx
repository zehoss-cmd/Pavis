import {notFound} from 'next/navigation';
import Link from '@/components/navigation-link';
import {patentAccess} from '@/lib/patents/access';
import {ExternalLookup} from './external-lookup';
import {LoadError} from '@/components/load-error';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{supabase,organization,canWrite}=await patentAccess(id);if(!canWrite)notFound();
 const {data,error}=await supabase.from('patent_families').select('id,name').eq('organization_id',id).order('name').limit(200);
 return <main className="auth-page"><div className="auth-card patent-card"><p className="eyebrow">PATENT DATA</p><h1>외부 특허 데이터 연결</h1><p>{organization.name} · 출원번호로 외부 특허 정보를 불러와 검토 후 등록합니다.</p>{error?<LoadError message="패밀리 목록을 불러오지 못했습니다."/>:<ExternalLookup org={id} families={data||[]} configured={!!process.env.KIPRIS_API_KEY} googleConfigured={!!(process.env.GOOGLE_PATENTS_PROJECT_ID&&process.env.GOOGLE_PATENTS_SERVICE_ACCOUNT_JSON)}/>}<p>API 인증정보는 서버 설정에서 관리합니다. 비밀키를 이 화면에 입력하거나 공유하지 마세요.</p><Link href={`/account/organizations/${id}/patents`}>특허 자산으로</Link></div></main>;
}
