import Link from 'next/link';
import { signup } from '../auth/actions';

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-screen">
    <Link href="/" className="login-brand" aria-label="PAVIS home"><span aria-hidden="true">◈</span> PAVIS</Link>
    <section className="login-panel" aria-labelledby="signup-heading">
      <h1 id="signup-heading">Create your account</h1>
      {params.error && <p className="login-message" role="alert">가입 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.</p>}
      <form action={signup}>
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /><small>Use at least 8 characters.</small></label>
        <button type="submit">Sign up</button>
      </form>
      <nav className="login-links" aria-label="Account help"><Link href="/login">Already have an account? Sign in</Link></nav>
    </section>
  </main>;
}
