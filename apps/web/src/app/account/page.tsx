import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
import { createOrganization } from './actions';
export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  const params = await searchParams;
  const { data: organizations, error: loadError } = await supabase.from('organizations').select('id,name').order('created_at');
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">YOUR WORKSPACE</p><h1>나의 조직</h1><p>{user.email} 계정으로 로그인했습니다.</p>{params.created && <p className="form-message" role="status">조직을 만들었습니다.</p>}{(params.error || loadError) && <p className="form-message" role="alert">조직 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}{organizations && organizations.length > 0 ? <ul>{organizations.map(org => <li key={org.id}>{org.name}</li>)}</ul> : !loadError && <p>아직 참여한 조직이 없어요. 조직을 만들고 시작해 보세요.</p>}<form action={createOrganization}><label>조직 이름<input name="name" minLength={1} maxLength={120} required /></label><button>조직 만들기</button></form><form action={logout}><button>로그아웃</button></form></div></main>;
}
