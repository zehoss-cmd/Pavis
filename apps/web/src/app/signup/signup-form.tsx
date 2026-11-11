'use client';

import { SubmitButton } from '@/components/submit-button';

import { useState } from 'react';
import { signup } from '../auth/actions';
import { passwordRequirements } from '@/domain/auth/password-policy';

export function SignupForm() {
  const [password, setPassword] = useState('');
  const requirements = passwordRequirements(password);

  return <form action={signup}>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} aria-describedby="signup-password-hint signup-character-hint" />
      <small id="signup-password-hint" className={requirements.length ? 'password-hint-valid' : 'password-hint-invalid'}>Use at least 8 characters.</small>
      <small id="signup-character-hint" className={requirements.characters ? 'password-hint-valid' : 'password-hint-invalid'}>Include a lowercase letter, an uppercase letter, and a number.</small>
    </label>
    <SubmitButton disabled={!requirements.length || !requirements.characters} pendingLabel="Please wait...">Sign up</SubmitButton>
  </form>;
}
