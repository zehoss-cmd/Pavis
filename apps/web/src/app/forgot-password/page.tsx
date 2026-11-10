import Link from 'next/link';
import { requestRecovery, resetPassword } from './actions';

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return <main className="auth-page"><Link href="/" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card">
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>비밀번호 재설정</h1>
    <p>가입한 이메일로 인증번호를 받아 새 비밀번호를 설정해 주세요.</p>
    {sent && <p className="form-message" role="status">가입된 이메일이라면 인증번호가 발송됩니다. 받은 편지함과 스팸함을 확인해 주세요.</p>}
    {error && <p className="form-message" role="alert">{error === 'send' ? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' : error === 'verify' ? '이메일 또는 인증번호를 확인해 주세요. 만료된 경우 다시 요청해 주세요.' : error === 'update' ? '비밀번호를 변경하지 못했습니다. 인증번호를 다시 요청해 주세요.' : '입력 내용과 비밀번호 확인을 확인해 주세요.'}</p>}
    <h2>1. 인증번호 받기</h2><form action={requestRecovery}><label>가입 이메일<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><button type="submit">인증번호 받기</button></form>
    <h2>2. 새 비밀번호 설정</h2><form action={resetPassword}><label>가입 이메일<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><label>인증번호<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label><label>새 비밀번호<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /><small>8자 이상으로 입력해 주세요.</small></label><label>새 비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label><button type="submit">비밀번호 변경</button></form>
    <Link href="/login" className="auth-navigation">로그인으로 돌아가기</Link>
  </div></main>;
}
