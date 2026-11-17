import Link from '../../../../../src/components/navigation-link';
import { CancelForm } from './cancel-form';
export default function Start(){return <main><h1>전환 시작</h1><Link href="/loading-check/slow" prefetch={false}>느린 페이지 열기</Link><Link href="#detail">같은 페이지 이동</Link><form method="get" action="/loading-check/slow"><label>검색어<input name="q" required/></label><button type="submit">검색</button></form><CancelForm/><p id="detail">현재 화면의 상세</p></main>;}
