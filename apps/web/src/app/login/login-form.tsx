'use client';

import { useEffect, useRef } from 'react';
import { login } from '../auth/actions';

const savedEmailKey = 'pavis.saved-login-email';

export function LoginForm() {
  const email = useRef<HTMLInputElement>(null);
  const remember = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(savedEmailKey);
      if (saved && email.current && remember.current) {
        email.current.value = saved;
        remember.current.checked = true;
      }
    } catch {
      // Login still works if browser storage is unavailable.
    }
  }, []);

  function savePreference() {
    try {
      if (remember.current?.checked && email.current?.value.trim()) {
        localStorage.setItem(savedEmailKey, email.current.value.trim());
      } else {
        localStorage.removeItem(savedEmailKey);
      }
    } catch {
      // The login request does not depend on browser storage.
    }
  }

  return <form action={login} onSubmit={savePreference}>
    <label>이메일<input ref={email} name="email" type="email" autoComplete="email" required /></label>
    <label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>
    <label className="remember-email"><input ref={remember} type="checkbox" onChange={event => { if (!event.currentTarget.checked) { try { localStorage.removeItem(savedEmailKey); } catch { /* Storage may be disabled. */ } } }} />아이디 저장</label>
    <button type="submit">로그인</button>
  </form>;
}
