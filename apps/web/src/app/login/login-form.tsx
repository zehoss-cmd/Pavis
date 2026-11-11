'use client';
import { SubmitButton } from '@/components/submit-button';

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
    <label>Email address<input ref={email} name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    <label className="remember-email"><input ref={remember} type="checkbox" onChange={event => { if (!event.currentTarget.checked) { try { localStorage.removeItem(savedEmailKey); } catch { /* Storage may be disabled. */ } } }} />Remember me</label>
    <SubmitButton pendingLabel="Please wait...">Sign in</SubmitButton>
  </form>;
}
