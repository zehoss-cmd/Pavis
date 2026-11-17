import { parseEventPage, eventPageQuery, eventPageSize, eventMaxPage } from '@/lib/patents/event-pagination';
import { LoadError } from '@/components/load-error';
import Link from '@/components/navigation-link';
import { notFound } from 'next/navigation';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { patentAccess } from '@/lib/patents/access';
import { statusLabels } from '../../form';
import { manageLegalEvent, saveLegalEvent } from './actions';
import { LegalEventForm } from './event-form';
import type { LegalEvent } from './form-state';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function LegalEvents({params,searchParams}:{params:Promise<{id:string;assetId:string}>;searchParams:Promise<{error?:string;created?:string;updated?:string;deleted?:string;page?:string|string[]}>}) {
 const {id,assetId}=await params,flags=await searchParams;if(!uuid.test(assetId)) notFound();
 const {supabase,organization,canWrite}=await patentAccess(id);
 const page=parseEventPage(flags.page), offset=(page-1)*eventPageSize;
 const [{data:asset,error:assetError},{data:eventPage,error:eventError}]=await Promise.all([supabase.from('patent_assets').select('id,title').eq('organization_id',id).eq('id',assetId).maybeSingle(),supabase.from('patent_legal_events').select('id,event_date,legal_status,source,verified_date,note').eq('organization_id',id).eq('asset_id',assetId).order('event_date',{ascending:false}).order('id',{ascending:false}).range(offset,offset+eventPageSize)]);
 const events=(eventPage||[]).slice(0,eventPageSize), hasNext=(eventPage?.length||0)>eventPageSize;
 if(assetError) throw new Error('특허를 불러오지 못했습니다.');if(!asset) notFound();
 return <main className="auth-page"><Link href={`/account/organizations/${id}/patents/${assetId}`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">LEGAL STATUS HISTORY</p><h1>법적 상태 이력</h1><p>{organization.name} · {asset.title}</p><p>사용자가 입력한 이력이며 공식 확인 결과가 아닙니다. 이력을 추가하거나 수정해도 특허의 현재 상태는 자동 변경되지 않습니다.</p>{(flags.created||flags.updated||flags.deleted)&&<p className="form-message" role="status">{flags.created?'이력을 추가했습니다.':flags.updated?'이력을 수정했습니다.':'이력을 삭제했습니다. 30일 내 휴지통에서 복구할 수 있습니다.'}</p>}{flags.error&&<p className="form-message" role="alert">이력을 처리하지 못했습니다. 입력 내용과 권한을 확인해 주세요.</p>}<h2 id="legal-events">기록된 이력</h2><p>사건일 기준 최신순 · 페이지당 25건</p>{eventError?<LoadError message="이력을 불러오지 못했습니다."/>:events?.length?<ul className="audit-list">{(events as LegalEvent[]).map(event=><li key={event.id}><strong>{event.event_date} · {statusLabels[event.legal_status]||'미확인'}</strong><span>출처: {event.source||'미입력'} · 확인일: {event.verified_date||'미입력'}</span>{event.note&&<span className="legal-event-note">{event.note}</span>}{canWrite&&<><details><summary>이력 수정</summary><LegalEventForm org={id} asset={assetId} page={page} event={event} action={saveLegalEvent}/></details><form action={manageLegalEvent}><input type="hidden" name="organization" value={id}/><input type="hidden" name="asset" value={assetId}/><input type="hidden" name="event" value={event.id}/><input type="hidden" name="operation" value="delete"/><input type="hidden" name="page" value={page}/><ConfirmSubmit message="이 상태 이력을 삭제할까요? 30일 이내 휴지통에서 복구할 수 있습니다.">이력 삭제</ConfirmSubmit></form></>}</li>)}</ul>:<p>{page>1?"이 페이지에 상태 이력이 없습니다. 이전 페이지를 확인해 주세요.":"아직 등록된 상태 이력이 없습니다."}</p>}{!eventError&&(page>1||hasNext)&&<nav className="patent-pagination" aria-label="법적 상태 이력 페이지">{page>1&&<Link href={eventPageQuery(page-1)}>이전</Link>}<span>{page}페이지</span>{hasNext&&page<eventMaxPage&&<Link href={eventPageQuery(page+1)}>다음</Link>}{hasNext&&page===eventMaxPage&&<span>표시 가능한 페이지 한도입니다.</span>}</nav>}{canWrite&&<><h2>이력 추가</h2><LegalEventForm org={id} asset={assetId} page={page} action={saveLegalEvent}/></>}<Link href={`/account/organizations/${id}/patents/${assetId}`}> 특허 상세로</Link></div></main>;
}
