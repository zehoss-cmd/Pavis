'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveProfile(form: FormData) {
  const name = String(form.get('display_name') || '').trim();
  if (!name || Array.from(name).length > 60) redirect('/account/profile?error=1');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: existing, error: readError } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (readError) redirect('/account/profile?error=1');
  let error;
  if (existing) {
    ({ error } = await supabase.from('profiles').update({display_name:name}).eq('user_id',user.id));
  } else {
    ({ error } = await supabase.from('profiles').insert({user_id:user.id,display_name:name}));
    if (error?.code === '23505') ({ error } = await supabase.from('profiles').update({display_name:name}).eq('user_id',user.id));
  }
  if (error) redirect('/account/profile?error=1');
  redirect('/account/profile?saved=1');
}
