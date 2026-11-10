import Link from 'next/link';
import { LoginForm } from './login-form';
export default async function Login({searchParams}: {searchParams: Promise<{error?: string; check?: string; password_reset?: string}>}) {
  const params = await searchParams;
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>다시 만나 반가워요</h1><p>계정에 로그인하고 PAVIS를 시작하세요.</p>{params.error && <p className="form-message" role="alert">이메일 또는 비밀번호를 확인해 주세요.</p>}{params.check && <p className="form-message" role="status">가입 요청을 확인했습니다. 이메일 인증이 필요한 경우 받은 편지함을 확인해 주세요.</p>}{params.password_reset && <p className="form-message" role="status">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.</p>}<LoginForm /><p><Link href="/forgot-password" className="auth-navigation">비밀번호 찾기</Link></p><p>처음이신가요? <Link href="/signup">회원가입</Link></p></div></main>;
}
