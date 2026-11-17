'use client';
import NextLink,{useLinkStatus} from 'next/link';
import { forwardRef,type ComponentProps } from 'react';
function LinkProgress() {
 const {pending}=useLinkStatus();
 return pending?<span className="pavis-navigation-progress" role="status" aria-live="polite"><span className="pavis-sr-only">화면을 불러오는 중입니다.</span></span>:null;
}
/** Next.js owns navigation and cancellation; feedback follows its actual pending state. */
const NavigationLink=forwardRef<HTMLAnchorElement,ComponentProps<typeof NextLink>>(function NavigationLink({children,...props},ref){
 return <NextLink ref={ref} {...props}>{children}<LinkProgress/></NextLink>;
});
export default NavigationLink;
