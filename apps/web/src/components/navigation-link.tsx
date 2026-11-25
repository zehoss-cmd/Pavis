'use client';
import NextLink,{useLinkStatus} from 'next/link';
import { forwardRef,type ComponentProps } from 'react';
import { allowFormNavigation } from './unsaved-changes';
function LinkProgress() {
 const {pending}=useLinkStatus();
 return pending?<span className="pavis-navigation-progress" role="status" aria-live="polite"><span className="pavis-sr-only">화면을 불러오는 중입니다.</span></span>:null;
}
/** Next.js owns navigation and cancellation; feedback follows its actual pending state. */
const NavigationLink=forwardRef<HTMLAnchorElement,ComponentProps<typeof NextLink>>(function NavigationLink({children,onNavigate,...props},ref){
 return <NextLink ref={ref} {...props} onNavigate={event=>{
  const target=typeof props.href==='string' ? props.href : null;
  const url=target===null ? null : new URL(target, window.location.href);
  const destination=url===null || url.pathname!==window.location.pathname || url.search!==window.location.search;
  if(destination && !allowFormNavigation()) {
   event.preventDefault();
   return;
  }
  onNavigate?.(event);
 }}>{children}<LinkProgress/></NextLink>;
});
export default NavigationLink;
