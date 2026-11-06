'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function credentials(form: FormData) {
  return { email: String(form.get('email') || '').trim(), password: String(form.get('password') || '') };
}
export async function login(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(form));
  if (error) redirect('/login?error=1');
  redirect('/account');
}
export async function signup(form: FormData) {
  const values = credentials(form);
  if (values.password.length < 8 || values.password.length > 72) redirect('/signup?error=1');
  const supabase = await createClient();
  const siteUrl = process.env.PAVIS_SITE_URL;
  if (!siteUrl) throw new Error('PAVIS_SITE_URL 환경 설정이 필요합니다.');
  const callback = new URL('/auth/callback', siteUrl);
  if (!['http:', 'https:'].includes(callback.protocol)) throw new Error('PAVIS_SITE_URL이 올바르지 않습니다.');
  if (process.env.NODE_ENV === 'production' && callback.protocol !== 'https:') throw new Error('운영 환경에는 HTTPS 주소가 필요합니다.');
  const { error } = await supabase.auth.signUp({ ...values, options: { emailRedirectTo: callback.toString() } });
  if (error) redirect('/signup?error=1');
  redirect('/login?check=1');
}
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
