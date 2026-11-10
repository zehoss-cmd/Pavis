'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createRecoveryGrant, recoveryCookieName, recoveryLifetimeSeconds } from '@/domain/auth/recovery-grant';
import { recoverySession } from './recovery-session';
import { isValidPassword } from '@/domain/auth/password-policy';
import { recoveryRequestCookieName, recoveryCodeSeconds, parseRecoveryRequest } from '@/domain/auth/recovery-request';

export async function requestRecovery(form: FormData) {
  const email = String(form.get('email') || '').trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/forgot-password?error=input');
  const store = await cookies();
  store.delete(recoveryRequestCookieName);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    console.error('PAVIS password recovery request failed', { status: error.status, code: error.code });
    redirect(error.status === 429 ? '/forgot-password?error=rate' : '/forgot-password?error=send');
  }
  store.set(recoveryRequestCookieName, JSON.stringify({ email, expiresAt: Date.now() + recoveryCodeSeconds * 1000 }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: recoveryCodeSeconds });
  redirect('/forgot-password?sent=1');
}

export async function confirmRecovery(form: FormData) {
  const store = await cookies();
  const request = parseRecoveryRequest(store.get(recoveryRequestCookieName)?.value);
  const token = String(form.get('token') || '').trim();
  if (!request) redirect('/forgot-password?error=email_expired');
  if (!/^\d{6,10}$/.test(token)) redirect('/forgot-password?error=input');
  store.delete(recoveryCookieName);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: request.email, token, type: 'recovery' });
  if (error || !data.session?.access_token || !data.user?.id) redirect('/forgot-password?error=verify');
  store.delete(recoveryRequestCookieName);
  store.set(recoveryCookieName, createRecoveryGrant(data.session.access_token, data.user.id), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: recoveryLifetimeSeconds,
  });
  redirect('/forgot-password/new-password');
}

export async function resetPassword(form: FormData) {
  const supabase = await recoverySession();
  if (!supabase) redirect('/forgot-password?error=expired');
  const password = String(form.get('password') || '');
  const confirm = String(form.get('confirm') || '');
  if (!isValidPassword(password) || password !== confirm) redirect('/forgot-password/new-password?error=input');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('PAVIS password reset failed', { status: error.status, code: error.code });
    redirect('/forgot-password/new-password?error=update');
  }
  (await cookies()).delete(recoveryCookieName);
  await supabase.auth.signOut();
  redirect('/login?password_reset=1');
}
