'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createRecoveryGrant, recoveryCookieName, recoveryLifetimeSeconds } from '@/domain/auth/recovery-grant';
import { recoverySession } from './recovery-session';

export async function requestRecovery(form: FormData) {
  const email = String(form.get('email') || '').trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/forgot-password?error=input');
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    console.error('PAVIS password recovery request failed', { status: error.status, code: error.code });
    redirect(error.status === 429 ? '/forgot-password?error=rate' : '/forgot-password?error=send');
  }
  redirect('/forgot-password?sent=1');
}

export async function confirmRecovery(form: FormData) {
  const email = String(form.get('email') || '').trim();
  const token = String(form.get('token') || '').trim();
  if (!email || email.length > 254 || !/^\d{6,10}$/.test(token)) redirect('/forgot-password?error=input');
  const store = await cookies();
  store.delete(recoveryCookieName);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error || !data.session?.access_token || !data.user?.id) redirect('/forgot-password?error=verify');
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
  if (password.length < 8 || password.length > 72 || password !== confirm) redirect('/forgot-password/new-password?error=input');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('PAVIS password reset failed', { status: error.status, code: error.code });
    redirect('/forgot-password/new-password?error=update');
  }
  (await cookies()).delete(recoveryCookieName);
  await supabase.auth.signOut();
  redirect('/login?password_reset=1');
}
