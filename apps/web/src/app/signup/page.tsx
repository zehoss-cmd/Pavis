import Link from 'next/link';
import { signup } from '../auth/actions';
export default async function Signup({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const params = await searchParams;
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">GET STARTED</p><h1>특허의 새로운 시작</h1><p>이메일로 PAVIS 계정을 만들어 보세요.</p>{params.error && <p className="form-message" role="alert">가입 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.</p>}<form action={signup}><label>이메일<input name="email" type="email" autoComplete="email" required /></label><label>비밀번호<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /><small>8자 이상으로 입력해 주세요.</small></label><button type="submit">회원가입</button></form><p>이미 계정이 있나요? <Link href="/login">로그인</Link></p></div></main>;
}
