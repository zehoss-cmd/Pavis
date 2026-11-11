import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canPerformOrganizationAction } from '@/domain/organizations/authorization';
import { updateMember, createInvitation, revokeInvitation, deleteOrganization } from './actions';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = [{id:'admin',name:'관리자'},{id:'ip_manager',name:'IP 관리자'},{id:'analyst',name:'평가 담당자'},{id:'licensing_manager',name:'라이선싱 담당자'},{id:'viewer',name:'조회자'}];
type Invitation = {id:string;email:string;role:string;status:string;expires_at:string};
type Member = {user_id:string; email:string; role:string; status:string; joined_at:string};
export default async function Organization({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;updated?:string;invited?:string;revoked?:string;invite_error?:string;delete_error?:string}>}) {
  const {id}=await params;
  if (!uuid.test(id)) notFound();
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) redirect('/login');
  const {data:organization}=await supabase.from('organizations').select('id,name').eq('id',id).maybeSingle();
  if(!organization) notFound();
  const {data:membership}=await supabase.from('organization_members').select('role,status').eq('organization_id',id).eq('user_id',user.id).maybeSingle();
  const isAdmin=canPerformOrganizationAction(membership?.role,membership?.status,'members.manage');
  const result=isAdmin ? await supabase.rpc('list_organization_members',{p_org:id}) : null;
  const members=(result?.data || []) as Member[];
  const inviteResult=isAdmin ? await supabase.rpc('list_organization_invitations',{p_org:id}) : null;
  const invitations=(inviteResult?.data || []) as Invitation[];
  const flags=await searchParams;
  return <main className="auth-page"><Link href="/account" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">ORGANIZATION</p><h1>{organization.name}</h1><p>내 역할: {roles.find(r=>r.id===membership?.role)?.name || '확인 필요'}</p><Link href={`/account/organizations/${id}/patents`}>특허 자산 보기 </Link>{flags.delete_error && <p className="form-message" role="alert">{flags.delete_error==='not_empty'?'조직에 다른 구성원, 초대 기록, 특허·패밀리·포트폴리오 또는 휴지통 기록이 있어 삭제할 수 없습니다.':'조직을 삭제하지 못했습니다. 권한과 상태를 확인해 주세요.'}</p>}{flags.invited && <p className="form-message" role="status">초대가 등록되었습니다. 초대받은 분에게 PAVIS 주소를 직접 전달해 주세요.</p>}{flags.revoked && <p className="form-message" role="status">초대를 취소했습니다.</p>}{(flags.invite_error || inviteResult?.error) && <p className="form-message" role="alert">초대를 처리하지 못했습니다. 이메일과 기존 초대 상태를 확인해 주세요.</p>}{flags.updated && <p className="form-message" role="status">구성원 권한을 변경했습니다.</p>}{(flags.error || result?.error) && <p className="form-message" role="alert">변경하지 못했습니다. 마지막 활성 관리자는 변경할 수 없습니다.</p>}{isAdmin ? <><Link href={`/account/organizations/${id}/audit`}>활동 이력 보기 </Link><h2>구성원 관리</h2><p>조직의 관리자만 구성원을 확인하고 권한을 변경할 수 있습니다.</p>{members.map(member=><form action={updateMember} key={member.user_id} className="member-form"><strong>{member.email || '이메일 없음'}{member.user_id===user.id?' (나)':''}</strong><input type="hidden" name="organization" value={id}/><input type="hidden" name="user" value={member.user_id}/><label>역할<select name="role" defaultValue={member.role}>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>상태<select name="status" defaultValue={member.status}><option value="active">활성</option><option value="inactive">비활성</option></select></label><SubmitButton>변경 저장</SubmitButton></form>)}<h2>구성원 초대</h2><p>초대는 7일 동안 유효합니다. 메일은 자동 발송되지 않으므로 상대방에게 PAVIS 주소를 직접 전달해 주세요. 초대받은 이메일로 가입 및 로그인한 뒤 수락할 수 있습니다.</p><form action={createInvitation}><input type="hidden" name="organization" value={id}/><label>이메일<input name="email" type="email" maxLength={254} required/></label><label>역할<select name="role" defaultValue="viewer">{roles.filter(r=>r.id!=='admin').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><SubmitButton>초대 등록</SubmitButton></form>{invitations.length>0 && <><h2>초대 현황</h2>{invitations.map(invite=><div className="invite-row" key={invite.id}><strong>{invite.email}</strong><span>{roles.find(r=>r.id===invite.role)?.name} · {{pending:'대기',accepted:'수락',revoked:'취소',expired:'만료'}[invite.status] || '확인 필요'}</span>{invite.status==='pending' && <form action={revokeInvitation}><input type="hidden" name="organization" value={id}/><input type="hidden" name="invitation" value={invite.id}/><SubmitButton>초대 취소</SubmitButton></form>}</div>)}</>}</> : <p>구성원 관리는 조직 관리자에게 문의해 주세요.</p>}{isAdmin && <><h2>조직 삭제</h2><p>다른 구성원과 초대 기록, 특허 자산 및 휴지통 기록이 없는 조직만 삭제할 수 있습니다. 삭제한 조직은 나의 조직에서 30일 이내에 복구할 수 있습니다.</p><form action={deleteOrganization}><input type="hidden" name="organization" value={id}/><ConfirmSubmit message="이 조직을 삭제할까요? 삭제 후 30일 이내에 나의 조직에서 복구할 수 있습니다.">조직 삭제</ConfirmSubmit></form></>}<Link href="/account"> 내 조직으로</Link></div></main>;
}
