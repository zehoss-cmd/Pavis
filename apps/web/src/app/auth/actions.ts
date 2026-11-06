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
  const { error } = await supabase.auth.signUp(values);
  if (error) redirect('/signup?error=1');
  redirect('/login?check=1');
}
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
