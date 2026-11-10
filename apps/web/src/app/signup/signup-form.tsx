'use client';

import { useState } from 'react';
import { signup } from '../auth/actions';

export function SignupForm() {
  const [password, setPassword] = useState('');
  const passwordLongEnough = password.length >= 8;

  return <form action={signup}>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} aria-describedby="signup-password-hint" />
      <small id="signup-password-hint" className={passwordLongEnough ? 'password-hint-valid' : 'password-hint-invalid'}>Use at least 8 characters.</small>
    </label>
    <button type="submit" disabled={!passwordLongEnough}>Sign up</button>
  </form>;
}
