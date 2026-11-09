import Link from 'next/link';
import { WorkspaceNavigation } from '@/components/workspace-navigation';
import { logout } from '../auth/actions';
import { createClient } from '@/lib/supabase/server';

export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
  const supabase=await createClient();
  const {data:organizations,error}=await supabase.from('organizations').select('id,name').order('created_at').order('id');
  return <div className="workspace"><header className="workspace-header"><Link href="/account" className="workspace-brand"><span className="brand-mark">◈</span><span>PAVIS</span><small>WORKSPACE</small></Link><div className="workspace-header-actions"><Link href="/account/profile">내 프로필</Link><form action={logout}><button type="submit">로그아웃</button></form></div></header><div className="workspace-body"><WorkspaceNavigation organizations={organizations||[]} loadError={!!error}/><div className="workspace-content">{children}</div></div></div>;
}
