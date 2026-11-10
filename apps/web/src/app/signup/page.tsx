import Link from 'next/link';
import { SignupForm } from './signup-form';

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-screen">
    <Link href="/" className="login-brand" aria-label="PAVIS home"><span aria-hidden="true">◈</span> PAVIS</Link>
    <section className="login-panel" aria-labelledby="signup-heading">
      <h1 id="signup-heading">Create your account</h1>
      {params.error && <p className="login-message" role="alert">가입 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.</p>}
      <SignupForm />
      <nav className="login-links" aria-label="Account help"><Link href="/login">Already have an account? Sign in</Link></nav>
    </section>
  </main>;
}
