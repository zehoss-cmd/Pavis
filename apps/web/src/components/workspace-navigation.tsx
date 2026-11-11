'use client';
import Link from 'next/link';
import { WorkspaceIcon } from './workspace-icon';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { organizationFromPath, resolveWorkspaceOrganization, workspaceRoutes, type WorkspaceOrganization } from '@/domain/workspace/navigation';
const key='pavis.workspace.organization';
const event='pavis-workspace-organization';
function readSelection():string|null {try {return window.sessionStorage.getItem(key);} catch {return null;}}
function subscribeSelection(callback:()=>void) {window.addEventListener('storage',callback);window.addEventListener(event,callback);return ()=>{window.removeEventListener('storage',callback);window.removeEventListener(event,callback);};}
function saveSelection(id:string) {try {window.sessionStorage.setItem(key,id);window.dispatchEvent(new Event(event));} catch { /* Navigation still works if browser storage is blocked. */ }}
const serverSelection=()=>null;
export function WorkspaceNavigation({organizations,loadError}:{organizations:WorkspaceOrganization[];loadError:boolean}) {
 const path=usePathname(),router=useRouter(),stored=useSyncExternalStore(subscribeSelection,readSelection,serverSelection);
 const pathOrg=organizationFromPath(path);
 const org=resolveWorkspaceOrganization(path,organizations,stored),routes=workspaceRoutes(org);
 useEffect(()=>{if(pathOrg&&organizations.some(item=>item.id===pathOrg)&&readSelection()!==pathOrg) saveSelection(pathOrg);},[pathOrg,organizations]);
 const selected=organizations.find(item=>item.id===org);
 const items=[
  {label:'대시보드',icon:'home',href:'/account',active:path==='/account'},
  {label:'특허 자산',icon:'patent',href:routes.patents,active:path.includes('/patents')&&!path.includes('/valuations')},
  {label:'포트폴리오',icon:'portfolio',href:routes.portfolios,active:path.includes('/portfolios')},
  {label:'가치평가',icon:'valuation',href:routes.valuations,active:path.includes('/valuations')},
  {label:'라이선싱',icon:'license',href:null,soon:true},
  {label:'조직 관리',icon:'organization',href:routes.organization,active:!!pathOrg&&!path.includes('/patents')&&!path.includes('/portfolios')&&!path.includes('/valuations')},
 ];
 return <nav className="workspace-nav" aria-label="주 메뉴"><p className="nav-label">WORKSPACE</p>{loadError?<p className="workspace-org-message" role="alert">조직 목록을 불러오지 못했습니다. 새로고침해 주세요.</p>:organizations.length>1?<label className="workspace-org-selector">현재 조직<select aria-label="현재 조직" value={org||''} onChange={e=>{const next=e.target.value;if(!organizations.some(item=>item.id===next)) return;saveSelection(next);router.push(`/account/organizations/${next}`);}}><option value="" disabled>조직 선택</option>{organizations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>:selected?<p className="workspace-org-name">현재 조직 <strong>{selected.name}</strong></p>:<p className="workspace-org-message">{organizations.length?'현재 조직을 확인할 수 없습니다. 대시보드에서 조직을 선택해 주세요.':'조직을 만들거나 초대를 수락해 주세요.'}</p>}{!loadError&&organizations.length>1&&!org&&<p className="workspace-org-message">메뉴를 사용하려면 조직을 선택해 주세요.</p>}<div className="workspace-nav-items" role="region" aria-label="워크스페이스 메뉴" tabIndex={0}>{items.map(item=>item.href?<Link className={`nav-item${item.active?' is-active':''}`} aria-current={item.active?'page':undefined} href={item.href} key={item.label}><span className="nav-icon"><WorkspaceIcon name={item.icon}/></span><span>{item.label}</span></Link>:<span className="nav-item nav-disabled" aria-disabled="true" key={item.label}><span className="nav-icon"><WorkspaceIcon name={item.icon}/></span><span>{item.label}</span>{item.soon&&<small>준비 중</small>}</span>)}</div><div className="nav-footer">PATENT ASSET PLATFORM<br/><strong>자산의 가능성을 발견하세요.</strong></div></nav>;
}
