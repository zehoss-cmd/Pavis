import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canPerformOrganizationAction } from '@/domain/organizations/authorization';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const labels: Record<string, string> = {
  'organization.created': '조직 생성',
  'organization.deleted': '조직 삭제',
  'organization.restored': '조직 복구',
  'organization.member.updated': '구성원 권한 또는 상태 변경',
  'organization.invitation.created': '구성원 초대 등록',
  'organization.invitation.revoked': '구성원 초대 취소',
  'organization.invitation.accepted': '구성원 초대 수락',
  'patent.family.created': '특허 패밀리 등록',
  'patent.family.updated': '특허 패밀리 수정',
  'patent.family.deleted': '특허 패밀리 삭제',
  'patent.family.restored': '특허 패밀리 복구',
  'patent.asset.created': '특허 자산 등록',
  'patent.asset.updated': '특허 자산 수정',
  'patent.asset.deleted': '특허 자산 삭제',
  'patent.asset.restored': '특허 자산 복구',
  'patent.legal_event.created': '법적 상태 이력 추가',
  'patent.legal_event.updated': '법적 상태 이력 수정',
  'patent.legal_event.deleted': '법적 상태 이력 삭제',
  'patent.legal_event.restored': '법적 상태 이력 복구',
  'patent.portfolio.created': '포트폴리오 생성',
  'patent.portfolio.updated': '포트폴리오 수정',
  'patent.portfolio.deleted': '포트폴리오 삭제',
  'patent.portfolio.restored': '포트폴리오 복구',
  'patent.portfolio.asset.added': '포트폴리오 특허 연결',
  'patent.portfolio.asset.removed': '포트폴리오 특허 연결 해제',
};
const roles: Record<string, string> = {admin:'관리자',ip_manager:'IP 관리자',analyst:'평가 담당자',licensing_manager:'라이선싱 담당자',viewer:'조회자'};
const statuses: Record<string, string> = {active:'활성',inactive:'비활성'};
type Member = { user_id: string; email: string | null };

export default async function AuditPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!uuid.test(id)) notFound();
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const {data:membership} = await supabase.from('organization_members').select('role,status').eq('organization_id',id).eq('user_id',user.id).maybeSingle();
  if (!canPerformOrganizationAction(membership?.role,membership?.status,'audit.read')) notFound();
  const [{data:organization},{data:entries,error:logError},{data:memberData,error:memberError}] = await Promise.all([
    supabase.from('organizations').select('name').eq('id',id).maybeSingle(),
    supabase.from('audit_logs').select('id,actor_user_id,action,target_id,occurred_at,previous_role,new_role,previous_status,new_status').eq('organization_id',id).order('occurred_at',{ascending:false}).order('id',{ascending:false}).limit(50),
    supabase.rpc('list_organization_members',{p_org:id}),
  ]);
  if (!organization) notFound();
  const members = (memberData || []) as Member[];
  const memberName = (memberId: string | null) => memberId === user.id ? '나' : members.find(member => member.user_id === memberId)?.email || '확인할 수 없는 사용자';
  return <main className="auth-page"><Link href="/account" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">AUDIT HISTORY</p><h1>활동 이력</h1><p>{organization.name} · 최근 50건</p><p>조직 생성과 구성원 권한 변경을 확인할 수 있습니다.</p>{(logError || memberError) ? <p className="form-message" role="alert">이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : entries?.length ? <ul className="audit-list">{entries.map(entry=><li key={entry.id}><strong>{labels[entry.action] || '기타 조직 활동'}</strong><span>{memberName(entry.actor_user_id)}{entry.action === 'organization.member.updated' ? ` · 대상: ${memberName(entry.target_id)}` : ''}</span>{entry.action === 'organization.member.updated' && (entry.previous_role && entry.new_role && entry.previous_status && entry.new_status ? <span>{entry.previous_role !== entry.new_role && `역할 변경 전: ${roles[entry.previous_role] || '알 수 없음'} · 변경 후: ${roles[entry.new_role] || '알 수 없음'}`}{entry.previous_role !== entry.new_role && entry.previous_status !== entry.new_status && ' · '}{entry.previous_status !== entry.new_status && `상태 변경 전: ${statuses[entry.previous_status] || '알 수 없음'} · 변경 후: ${statuses[entry.new_status] || '알 수 없음'}`}</span> : <span>변경 상세 기록이 없는 이전 이력입니다.</span>)}<time dateTime={entry.occurred_at}>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(entry.occurred_at))} (한국 시간)</time></li>)}</ul> : <p>아직 기록된 활동이 없습니다.</p>}<Link href={`/account/organizations/${id}`}> 조직 관리로</Link></div></main>;
}
