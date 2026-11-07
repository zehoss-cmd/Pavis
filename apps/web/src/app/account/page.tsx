import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
import { createOrganization, acceptInvitation } from './actions';
const roleNames: Record<string,string> = {ip_manager:'IP 관리자',analyst:'평가 담당자',licensing_manager:'라이선싱 담당자',viewer:'조회자'};
export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; joined?: string; invite_error?: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const params = await searchParams;
  const {data: invitationData, error: invitationError} = await supabase.rpc('my_organization_invitations');
  const invitations = (invitationData || []) as {id:string;organization_name:string;role:string;expires_at:string}[];
  const { data: organizations, error: loadError } = await supabase.from('organizations').select('id,name').order('created_at');
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">YOUR WORKSPACE</p><h1>나의 조직</h1><p>{user.email} 계정으로 로그인했습니다.</p><Link href="/account/profile">내 프로필 설정 →</Link>{params.joined && <p className="form-message" role="status">조직 초대를 수락했습니다.</p>}{(params.invite_error || invitationError) && <p className="form-message" role="alert">초대를 불러오거나 수락하지 못했습니다.</p>}{invitations.length>0 && <section><h2>받은 조직 초대</h2>{invitations.map(invite=><form action={acceptInvitation} key={invite.id}><strong>{invite.organization_name}</strong><p>{roleNames[invite.role] || '구성원'} · {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(invite.expires_at))}까지 수락 가능</p><input type="hidden" name="invitation" value={invite.id}/><button type="submit">초대 수락</button></form>)}</section>}{params.created && <p className="form-message" role="status">조직을 만들었습니다.</p>}{(params.error || loadError) && <p className="form-message" role="alert">조직 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}{organizations && organizations.length > 0 ? <ul>{organizations.map(org => <li key={org.id}><Link href={`/account/organizations/${org.id}`}>{org.name} →</Link></li>)}</ul> : !loadError && <p>아직 참여한 조직이 없어요. 조직을 만들고 시작해 보세요.</p>}<form action={createOrganization}><label>조직 이름<input name="name" minLength={1} maxLength={120} required /></label><button>조직 만들기</button></form><form action={logout}><button>로그아웃</button></form></div></main>;
}
