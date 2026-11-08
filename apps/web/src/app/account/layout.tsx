import Link from 'next/link';
import { WorkspaceNavigation } from '@/components/workspace-navigation';
import { logout } from '../auth/actions';

export default function WorkspaceLayout({children}:{children:React.ReactNode}) {
  return <div className="workspace"><header className="workspace-header"><Link href="/account" className="workspace-brand"><span className="brand-mark">◈</span><span>PAVIS</span><small>WORKSPACE</small></Link><div className="workspace-header-actions"><Link href="/account/profile">내 프로필</Link><form action={logout}><button type="submit">로그아웃</button></form></div></header><div className="workspace-body"><WorkspaceNavigation/><div className="workspace-content">{children}</div></div></div>;
}
