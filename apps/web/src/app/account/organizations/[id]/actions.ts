'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = ['admin','ip_manager','analyst','licensing_manager','viewer'];
export async function updateMember(form: FormData) {
  const org = String(form.get('organization') || '');
  const user = String(form.get('user') || '');
  const role = String(form.get('role') || '');
  const status = String(form.get('status') || '');
  if (!uuid.test(org) || !uuid.test(user) || !roles.includes(role) || !['active','inactive'].includes(status)) redirect('/account?error=1');
  const supabase = await createClient();
  const { data: { user: actor }, error: authError } = await supabase.auth.getUser();
  if (authError || !actor) redirect('/login');
  const { error } = await supabase.rpc('set_organization_member', {p_org:org,p_user:user,p_role:role,p_status:status});
  if (error) redirect(`/account/organizations/${org}?error=1`);
  redirect(`/account/organizations/${org}?updated=1`);
}
