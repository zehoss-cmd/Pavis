'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requestRecovery(form: FormData) {
  const email = String(form.get('email') || '').trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/forgot-password?error=input');
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    console.error('PAVIS password recovery request failed', { status: error.status, code: error.code });
    redirect('/forgot-password?error=send');
  }
  redirect('/forgot-password?sent=1');
}

export async function resetPassword(form: FormData) {
  const email = String(form.get('email') || '').trim();
  const token = String(form.get('token') || '').trim();
  const password = String(form.get('password') || '');
  const confirm = String(form.get('confirm') || '');
  if (!email || email.length > 254 || !/^\d{6,10}$/.test(token) || password.length < 8 || password.length > 72 || password !== confirm) redirect('/forgot-password?error=input');
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) redirect('/forgot-password?sent=1&error=verify');
  const { error: updateError } = await supabase.auth.updateUser({ password });
  await supabase.auth.signOut();
  if (updateError) {
    console.error('PAVIS password reset failed', { status: updateError.status, code: updateError.code });
    redirect('/forgot-password?error=update');
  }
  redirect('/login?password_reset=1');
}
