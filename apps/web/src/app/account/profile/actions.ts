'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveProfile(form: FormData) {
  const name = String(form.get('display_name') || '').trim();
  const phone = String(form.get('phone') || '').trim();
  const jobTitle = String(form.get('job_title') || '').trim();
  if (!name || Array.from(name).length > 60 || Array.from(phone).length > 30 || Array.from(jobTitle).length > 100) redirect('/account/profile?error=1');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { data: existing, error: readError } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (readError) redirect('/account/profile?error=1');
  const values = {display_name:name,phone:phone || null,job_title:jobTitle || null};
  let error;
  if (existing) {
    ({ error } = await supabase.from('profiles').update(values).eq('user_id',user.id));
  } else {
    ({ error } = await supabase.from('profiles').insert({user_id:user.id,...values}));
    if (error?.code === '23505') ({ error } = await supabase.from('profiles').update(values).eq('user_id',user.id));
  }
  if (error) redirect('/account/profile?error=1');
  redirect('/account/profile?saved=1');
}
