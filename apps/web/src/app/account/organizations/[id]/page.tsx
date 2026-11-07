import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateMember } from './actions';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = [{id:'admin',name:'관리자'},{id:'ip_manager',name:'IP 관리자'},{id:'analyst',name:'평가 담당자'},{id:'licensing_manager',name:'라이선싱 담당자'},{id:'viewer',name:'조회자'}];
type Member = {user_id:string; email:string; role:string; status:string; joined_at:string};
export default async function Organization({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;updated?:string}>}) {
  const {id}=await params;
  if (!uuid.test(id)) notFound();
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) redirect('/login');
  const {data:organization}=await supabase.from('organizations').select('id,name').eq('id',id).maybeSingle();
  if(!organization) notFound();
  const {data:membership}=await supabase.from('organization_members').select('role').eq('organization_id',id).eq('user_id',user.id).maybeSingle();
  const isAdmin=membership?.role==='admin';
  const result=isAdmin ? await supabase.rpc('list_organization_members',{p_org:id}) : null;
  const members=(result?.data || []) as Member[];
  const flags=await searchParams;
  return <main className="auth-page"><Link href="/account" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">ORGANIZATION</p><h1>{organization.name}</h1><p>내 역할: {roles.find(r=>r.id===membership?.role)?.name || '확인 필요'}</p>{flags.updated && <p className="form-message" role="status">구성원 권한을 변경했습니다.</p>}{(flags.error || result?.error) && <p className="form-message" role="alert">변경하지 못했습니다. 마지막 활성 관리자는 변경할 수 없습니다.</p>}{isAdmin ? <><Link href={`/account/organizations/${id}/audit`}>활동 이력 보기 →</Link><h2>구성원 관리</h2><p>조직의 관리자만 구성원을 확인하고 권한을 변경할 수 있습니다.</p>{members.map(member=><form action={updateMember} key={member.user_id} className="member-form"><strong>{member.email || '이메일 없음'}{member.user_id===user.id?' (나)':''}</strong><input type="hidden" name="organization" value={id}/><input type="hidden" name="user" value={member.user_id}/><label>역할<select name="role" defaultValue={member.role}>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>상태<select name="status" defaultValue={member.status}><option value="active">활성</option><option value="inactive">비활성</option></select></label><button type="submit">변경 저장</button></form>)}<p>구성원 초대는 준비 중입니다.</p></> : <p>구성원 관리는 조직 관리자에게 문의해 주세요.</p>}<Link href="/account">← 내 조직으로</Link></div></main>;
}
