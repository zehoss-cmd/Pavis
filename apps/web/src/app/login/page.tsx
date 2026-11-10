import Link from 'next/link';
import { LoginForm } from './login-form';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; check?: string; password_reset?: string }> }) {
  const params = await searchParams;
  return <main className="login-screen">
    <Link href="/" className="login-brand" aria-label="PAVIS 홈"><span aria-hidden="true">◈</span> PAVIS</Link>
    <section className="login-panel" aria-labelledby="login-heading">
      <h1 id="login-heading">계정에 로그인</h1>
      {params.error && <p className="login-message" role="alert">이메일 또는 비밀번호를 확인해 주세요.</p>}
      {params.check && <p className="login-message" role="status">가입 요청을 확인했습니다. 이메일 인증이 필요한 경우 받은 편지함을 확인해 주세요.</p>}
      {params.password_reset && <p className="login-message" role="status">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.</p>}
      <LoginForm />
      <nav className="login-links" aria-label="계정 도움말"><Link href="/forgot-password">비밀번호 찾기</Link><Link href="/signup">회원가입</Link></nav>
    </section>
  </main>;
}
