import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../auth/actions';
export default async function Account() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">YOUR ACCOUNT</p><h1>환영합니다</h1><p>{user.email} 계정으로 로그인했습니다.</p><p>조직과 특허 관리 기능을 준비하고 있습니다.</p><form action={logout}><button>로그아웃</button></form></div></main>;
}
