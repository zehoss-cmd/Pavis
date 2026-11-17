import { SubmitButton } from '@/components/submit-button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createOrganization, acceptInvitation, restoreOrganization } from './actions';
import { OrganizationCreate } from './organization-create';
import { AssetOverview } from './asset-overview';
const roleNames: Record<string,string> = {ip_manager:'IP 관리자',analyst:'평가 담당자',licensing_manager:'라이선싱 담당자',viewer:'조회자'};
export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; joined?: string; invite_error?: string; deleted?: string; restored?: string; restore_error?: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const params = await searchParams;
  const {data:revenueReviewer}=await supabase.rpc('is_revenue_reviewer');
  const {data: invitationData, error: invitationError} = await supabase.rpc('my_organization_invitations');
  const invitations = (invitationData || []) as {id:string;organization_name:string;role:string;expires_at:string}[];
  const {data: deletedData,error: deletedError}=await supabase.rpc('deleted_organizations');
  const deletedOrganizations=(deletedData || []) as {id:string;name:string;expires_at:string}[];
  const { data: organizations, error: loadError } = await supabase.from('organizations').select('id,name').order('created_at');
  return <main className="dashboard"><div className="dashboard-heading"><div><p className="workspace-kicker">PAVIS WORKSPACE</p><h1>안녕하세요, 반가워요</h1><p>조직의 특허와 제품 자산을 한곳에서 관리하세요.</p></div><span className="account-pill">{user.email}</span></div>
    {(params.joined || params.created || params.deleted || params.restored) && <p className="dashboard-message" role="status">{params.joined ? '조직 초대를 수락했습니다.' : params.deleted ? '조직을 삭제했습니다. 30일 이내에 복구할 수 있습니다.' : params.restored ? '조직을 복구했습니다.' : '조직을 만들었습니다.'}</p>}
    {(params.invite_error || invitationError || params.error || loadError || params.restore_error || deletedError) && <p className="dashboard-message error" role="alert">정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
    <div className="dashboard-grid"><div className="dashboard-main">{revenueReviewer&&<section className="panel organizations-panel"><h2>운영자 검토</h2><p>사용자가 제출한 매출 검토 요청을 확인합니다.</p><Link className="asset-overview-link" href="/account/revenue-review">제품 매출 검토</Link></section>}<section className="panel welcome-panel"><div><span className="panel-tag">WORKSPACE OVERVIEW</span><h2>특허 자산 관리</h2><p>조직을 선택하고 특허·제품 자산과 가치평가를 살펴보세요.</p></div><a className="workspace-primary" href="#organizations">내 조직 보기</a></section>
    <AssetOverview supabase={supabase}/><section className="panel organizations-panel" id="organizations"><div className="panel-heading"><div><span className="section-icon" aria-hidden="true">▦</span><div><h2>나의 조직</h2><p>조직별로 특허 자산을 안전하게 관리합니다.</p></div></div><span className="count-badge">{organizations?.length ?? 0}개</span></div><OrganizationCreate action={createOrganization}/>{organizations && organizations.length > 0 ? <div className="organization-list">{organizations.map(org => <div className="organization-row" key={org.id}><span className="org-avatar">{org.name.slice(0,1)}</span><div className="org-name"><strong>{org.name}</strong><small>조직 워크스페이스</small></div><Link href={`/account/organizations/${org.id}/patents`}>특허 자산 보기 </Link><Link href={`/account/organizations/${org.id}/products`}>제품 자산 보기</Link><Link href={`/account/organizations/${org.id}/products?revenue=missing`}>매출 미입력 제품</Link><Link href={`/account/organizations/${org.id}`}>조직 관리</Link></div>)}</div> : !loadError && <div className="empty-organizations"><span>▧</span><strong>아직 참여한 조직이 없어요</strong><p>새 조직을 만들거나 초대를 수락해 시작하세요.</p></div>}</section>
    {deletedOrganizations.length>0 && <section className="panel invite-panel"><h2>삭제된 조직</h2><p>삭제한 본인만 30일 이내에 복구할 수 있습니다.</p>{deletedOrganizations.map(org=><form action={restoreOrganization} key={org.id}><div><strong>{org.name}</strong><p>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(org.expires_at))}까지 복구 가능</p></div><input type="hidden" name="record" value={org.id}/><SubmitButton>조직 복구</SubmitButton></form>)}</section>}{invitations.length>0 && <section className="panel invite-panel"><h2>받은 조직 초대</h2>{invitations.map(invite=><form action={acceptInvitation} key={invite.id}><div><strong>{invite.organization_name}</strong><p>{roleNames[invite.role] || '구성원'} · {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(invite.expires_at))}까지 수락 가능</p></div><input type="hidden" name="invitation" value={invite.id}/><SubmitButton>초대 수락</SubmitButton></form>)}</section>}</div>
    <aside className="dashboard-side"><section className="panel guide-panel"><span className="section-icon sky">✦</span><h2>시작 가이드</h2><ol><li><span>1</span><div><strong>조직 선택 또는 생성</strong><small>업무를 함께할 공간을 준비해요.</small></div></li><li><span>2</span><div><strong>특허 자산 등록</strong><small>특허와 패밀리를 한곳에 모아요.</small></div></li><li><span>3</span><div><strong>가치평가</strong><small>특허의 평가 근거와 결과를 확인해요.</small></div></li></ol></section></aside></div></main>;
}
