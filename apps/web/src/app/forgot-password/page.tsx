import Link from 'next/link';
import { requestRecovery, confirmRecovery } from './actions';

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return <main className="login-screen">
    <Link href="/" className="login-brand" aria-label="PAVIS home"><span aria-hidden="true">◈</span> PAVIS</Link>
    <section className="login-panel recovery-panel" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">Reset your password</h1>
      <p className="recovery-intro">Request a verification code using your account email.</p>
      {sent && <p className="login-message" role="status">If an account exists for this email, a verification code will be sent. Check your inbox and spam folder.</p>}
      {error && <p className="login-message" role="alert">{error === 'rate' ? 'Too many requests. Please wait at least a minute before trying again. If the issue continues, try again later.' : error === 'send' ? 'Unable to process your request. Please try again later.' : error === 'verify' ? 'Check your email and verification code. If the code has expired, request a new one.' : error === 'expired' ? 'Your verification has expired. Please request and confirm a new code.' : 'Check your email and verification code.'}</p>}
      <h2>Get a verification code</h2>
      <form action={requestRecovery}><label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><button type="submit">Send verification code</button></form>
      <h2>Confirm verification code</h2>
      <form action={confirmRecovery}><label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><label>Verification code<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required /></label><button type="submit">Confirm</button></form>
      <nav className="login-links" aria-label="Account help"><Link href="/login">Back to sign in</Link></nav>
    </section>
  </main>;
}
