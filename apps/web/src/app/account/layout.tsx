import { SubmitButton } from '@/components/submit-button';
import Link from '@/components/navigation-link';
import Image from 'next/image';
import { WorkspaceNavigation } from '@/components/workspace-navigation';
import { logout } from '../auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';

async function WorkspaceMenu() {
  const supabase=await createClient();
  const {data:organizations,error}=await supabase.from('organizations').select('id,name').order('created_at').order('id');
  return <WorkspaceNavigation organizations={organizations||[]} loadError={!!error}/>;
}
function WorkspaceMenuLoading(){return <nav className="workspace-nav workspace-nav-loading" aria-label="주 메뉴" aria-busy="true"><p className="nav-label">WORKSPACE</p><p role="status">조직 메뉴를 불러오는 중입니다</p><div className="pavis-nav-skeleton" aria-hidden="true"><span/><span/><span/></div></nav>;}
export default function WorkspaceLayout({children}:{children:React.ReactNode}) {
  return <div className="workspace"><a className="skip-to-content" href="#workspace-main">본문으로 바로가기</a><header className="workspace-header"><Link href="/account" className="workspace-brand"><Image src="/pavis-logo-transparent.png" alt="PAVIS" width={94} height={56} className="pavis-logo-image" priority /></Link><div className="workspace-header-actions"><Link href="/account/profile">내 프로필</Link><form action={logout}><SubmitButton>로그아웃</SubmitButton></form></div></header><div className="workspace-body"><Suspense fallback={<WorkspaceMenuLoading/>}><WorkspaceMenu/></Suspense><div className="workspace-content" id="workspace-main" tabIndex={-1}>{children}</div></div></div>;
}
