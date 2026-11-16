import Link from 'next/link';
import { SubmitButton } from '@/components/submit-button';

type Props = {
  email?: string;
  name: string;
  verified: boolean;
  saved?: boolean;
  error?: boolean;
  readError?: boolean;
  action: (form: FormData) => void | Promise<void>;
};

export function ProfileView({ email, name, verified, saved, error, readError, action }: Props) {
  const initial = Array.from(name.trim() || email?.trim() || 'P')[0]?.toLocaleUpperCase() || 'P';
  return <main className="profile-page">
    <div className="profile-heading"><div><p className="profile-kicker">ACCOUNT SETTINGS</p><h1>내 프로필</h1><p>계정 정보와 보안 설정을 한곳에서 관리하세요.</p></div></div>
    {saved && <p className="profile-notice" role="status">프로필을 저장했습니다.</p>}
    {(error || readError) && <p className="profile-notice profile-notice-error" role="alert">프로필을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
    <div className="profile-layout">
      <section className="profile-card profile-summary" aria-labelledby="profile-summary-title">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
        <p className="profile-card-kicker">MY PROFILE</p>
        <h2 id="profile-summary-title">{readError ? '프로필을 불러올 수 없습니다' : name || '이름을 설정해 주세요'}</h2>
        <p className="profile-email">{email || '이메일 정보 없음'}</p>
        {email && <span className="profile-badge">{verified ? '이메일 인증 완료' : '이메일 인증 필요'}</span>}
      </section>
      <div className="profile-main">
        <section className="profile-card profile-settings" aria-labelledby="personal-info-title">
          <div className="profile-section-heading"><div><p className="profile-card-kicker">PERSONAL INFORMATION</p><h2 id="personal-info-title">기본 정보</h2><p>프로필에 표시할 이름을 관리하세요.</p></div></div>
          {!readError && <form action={action} className="profile-form"><label htmlFor="display-name">이름</label><input id="display-name" name="display_name" maxLength={60} defaultValue={name} autoComplete="name" required/><p>이름은 60자까지 입력할 수 있습니다.</p><div className="profile-form-actions"><SubmitButton pendingLabel="저장 중...">변경 저장</SubmitButton></div></form>}
          <div className="profile-detail"><div><strong>이메일</strong><p>로그인과 계정 확인에 사용됩니다.</p></div><span>{email || '이메일 정보 없음'}</span></div>
        </section>
        <section className="profile-card profile-settings" aria-labelledby="account-security-title">
          <div className="profile-section-heading"><div><p className="profile-card-kicker">ACCOUNT SECURITY</p><h2 id="account-security-title">계정 보안</h2><p>이메일 인증을 통해 비밀번호를 재설정할 수 있습니다.</p></div></div>
          <div className="profile-detail profile-security"><div><strong>비밀번호</strong><p>가입한 이메일로 인증번호를 받습니다.</p></div><Link href="/forgot-password">비밀번호 재설정</Link></div>
        </section>
        <Link className="profile-back" href="/account">내 조직 보기</Link>
      </div>
    </div>
  </main>;
}
