'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createOrganization(form: FormData) {
  const name = String(form.get('name') || '').trim();
  if (name.length < 1 || name.length > 120) redirect('/account?error=1');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const { error } = await supabase.rpc('create_organization', { org_name: name });
  if (error) redirect('/account?error=1');
  redirect('/account?created=1');
}
