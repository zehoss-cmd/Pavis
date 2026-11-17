'use client';
import { useEffect,useState } from 'react';
import { flushSync } from 'react-dom';
/** Native same-tab GET forms initiate a document navigation rather than a Link transition. */
export function GetNavigationProgress(){
 const [pending,setPending]=useState(false);
 useEffect(()=>{
  function submit(event:SubmitEvent){
   const form=event.target;if(!(form instanceof HTMLFormElement)||event.defaultPrevented)return;
   const submitter=event.submitter instanceof HTMLButtonElement||event.submitter instanceof HTMLInputElement?event.submitter:null;
   const method=submitter?.getAttribute('formmethod')||form.method,target=submitter?.getAttribute('formtarget')||form.target,action=submitter?.getAttribute('formaction')||form.action;
   if(method.toLowerCase()!=='get'||(target&&target.toLowerCase()!=='_self'))return;
   let url:URL;try {url=new URL(action,window.location.href);}catch{return;}
   if(url.origin!==window.location.origin)return;
   // Paint before the browser starts a native document navigation.
   flushSync(()=>setPending(true));
   queueMicrotask(()=>{if(event.defaultPrevented)setPending(false);});
  }
  const reset=()=>setPending(false);
  function followAnotherLink(event:MouseEvent){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const target=event.target;if(!(target instanceof Element))return;const link=target.closest('a[href]');
   if(link instanceof HTMLAnchorElement&&(!link.target||link.target==='_self')&&!link.hasAttribute('download'))reset();
  }
  document.addEventListener('submit',submit);document.addEventListener('click',followAnotherLink);window.addEventListener('pageshow',reset);window.addEventListener('popstate',reset);
  return ()=>{document.removeEventListener('submit',submit);document.removeEventListener('click',followAnotherLink);window.removeEventListener('pageshow',reset);window.removeEventListener('popstate',reset);};
 },[]);
 return pending?<div className="pavis-navigation-progress" role="status" aria-live="polite"><span className="pavis-sr-only">검색 결과를 불러오는 중입니다.</span></div>:null;
}
