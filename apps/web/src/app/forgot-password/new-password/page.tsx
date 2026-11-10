import Link from 'next/link';
import { redirect } from 'next/navigation';
import { recoverySession } from '../recovery-session';
import { resetPassword } from '../actions';

export default async function NewPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!await recoverySession()) redirect('/forgot-password?error=expired');
  const { error } = await searchParams;
  return <main className="login-screen">
    <Link href="/" className="login-brand" aria-label="PAVIS home"><span aria-hidden="true">◈</span> PAVIS</Link>
    <section className="login-panel" aria-labelledby="new-password-heading">
      <h1 id="new-password-heading">Set a new password</h1>
      {error && <p className="login-message" role="alert">{error === 'update' ? 'Unable to change your password. Please try again.' : 'Check your password and make sure both entries match.'}</p>}
      <form action={resetPassword}>
        <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /><small>Use at least 8 characters.</small></label>
        <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
        <button type="submit">Reset password</button>
      </form>
      <nav className="login-links" aria-label="Account help"><Link href="/login">Back to sign in</Link></nav>
    </section>
  </main>;
}
