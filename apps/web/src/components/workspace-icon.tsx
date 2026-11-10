import type { ReactNode } from 'react';

const shapes: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/></>,
  patent: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  portfolio: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
  valuation: <><path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/></>,
  license: <><path d="M8 12.5 6 14.5a3.5 3.5 0 0 0 5 5l2-2M16 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2"/><path d="m8.5 15.5 7-7"/></>,
  organization: <><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M10 21v-5h4v5"/></>,
};
export function WorkspaceIcon({name}:{name:string}) {
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">{shapes[name]}</svg>;
}
