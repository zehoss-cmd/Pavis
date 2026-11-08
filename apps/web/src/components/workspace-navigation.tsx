'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function WorkspaceNavigation() {
  const path = usePathname();
  const org = path.match(/^\/account\/organizations\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  const items = [
    { label: '대시보드', icon: '▦', href: '/account', active: path === '/account' },
    { label: '특허 자산', icon: '▤', href: org ? `/account/organizations/${org}/patents` : '/account#organizations', active: path.includes('/patents') },
    { label: '포트폴리오', icon: '▧', href: org ? `/account/organizations/${org}/portfolios` : '/account#organizations', active: path.includes('/portfolios') },
    { label: '가치평가', icon: '◈', href: org ? `/account/organizations/${org}/valuations` : '/account#organizations', active: path.includes('/valuations') },
    { label: '라이선싱', icon: '⇄', soon: true },
    { label: '조직 관리', icon: '◇', href: org ? `/account/organizations/${org}` : '/account#organizations', active: !!org && !path.includes('/patents') && !path.includes('/portfolios') && !path.includes('/valuations') },
  ];
  return <nav className="workspace-nav" aria-label="주 메뉴"><p className="nav-label">WORKSPACE</p>{items.map(item => item.soon ? <span className="nav-item nav-disabled" key={item.label}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span><small>준비 중</small></span> : <Link className={`nav-item${item.active ? ' is-active' : ''}`} aria-current={item.active ? 'page' : undefined} href={item.href!} key={item.label}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>)}<div className="nav-footer">PATENT ASSET PLATFORM<br/><strong>자산의 가능성을 발견하세요.</strong></div></nav>;
}
