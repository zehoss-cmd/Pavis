import '../../../../src/app/globals.css';
import { GetNavigationProgress } from '../../../../src/components/get-navigation-progress';
import Link from '../../../../src/components/navigation-link';

export default function FixtureLayout({children}:{children:React.ReactNode}) {
 return <html lang="ko"><body><GetNavigationProgress/><header><Link href="/loading-check">공통 헤더</Link></header>{children}</body></html>;
}
