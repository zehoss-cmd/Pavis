import { LoadError } from '@/components/load-error';
import { EmptyState } from '@/components/empty-state';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { restoreRecord } from './actions';
type Entry={id:string;kind:string;name:string;deleted_at:string;expires_at:string};
const kinds:Record<string,string>={asset:'특허',family:'패밀리',portfolio:'포트폴리오',legal_event:'법적 상태 이력',valuation:'정성평가 초안',royalty_dcf:'금액평가 초안'};
export default async function RecycleBin({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;restored?:string}>}) {
 const {id}=await params,flags=await searchParams;
 const {supabase,organization,canWrite}=await patentAccess(id);
 if(!canWrite) notFound();
 const {data,error}=await supabase.rpc('registry_recycle_list',{p_org:id});
 const entries=(data||[]) as Entry[];
 const date=(value:string)=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value));
 return <main className="auth-page"><Link href={`/account/organizations/${id}/patents`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">RECYCLE BIN</p><h1>휴지통</h1><p>{organization.name} · 삭제 후 30일 이내에 복구할 수 있습니다. 삭제 당시 연결이 해제된 포트폴리오 관계는 다시 연결해야 합니다.</p><p>복구 기한이 지난 기록은 목록에서 사라지며 정리 작업을 통해 삭제됩니다. 기능 적용 전에 영구 삭제한 기록은 복구할 수 없습니다.</p>{flags.restored && <p className="form-message" role="status">레코드를 복구했습니다.</p>}{flags.error && <p className="form-message" role="alert">{flags.error==='duplicate'?'같은 출원번호가 이미 존재해 복구할 수 없습니다.':flags.error==='linked'?'연결된 특허 또는 패밀리가 없어 복구할 수 없습니다. 해당 항목을 먼저 복구해 주세요.':'복구하지 못했습니다. 기한과 권한을 확인해 주세요.'}</p>}{error ? <LoadError message="휴지통을 불러오지 못했습니다."/> : entries.length ? <><p>최근 삭제순 · 최대 200개 표시 · 한국 시간</p><ul className="audit-list">{entries.map(entry=><li key={entry.id}><strong>{entry.name}</strong><span>{kinds[entry.kind]||'레코드'} · 삭제 {date(entry.deleted_at)}</span><span>복구 기한: {date(entry.expires_at)}</span><form action={restoreRecord}><input type="hidden" name="organization" value={id}/><input type="hidden" name="record" value={entry.id}/><SubmitButton>복구</SubmitButton></form></li>)}</ul></> : <EmptyState title="복구할 수 있는 항목이 없습니다" description="삭제된 항목은 복구 기한 내에 이곳에서 확인할 수 있습니다." action={{href:`/account/organizations/${id}/patents`,label:'특허 자산 보기'}}/>}<Link href={`/account/organizations/${id}/patents`}> 특허 자산으로</Link></div></main>;
}
