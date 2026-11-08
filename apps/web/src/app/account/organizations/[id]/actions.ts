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
export async function createInvitation(form: FormData) {
  const org=String(form.get('organization') || '');
  const email=String(form.get('email') || '').trim().toLowerCase();
  const role=String(form.get('role') || '');
  if (!uuid.test(org)) redirect('/account?error=1');
  if (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['ip_manager','analyst','licensing_manager','viewer'].includes(role)) redirect(`/account/organizations/${org}?invite_error=1`);
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError || !user) redirect('/login');
  const {error}=await supabase.rpc('create_organization_invitation',{p_org:org,p_email:email,p_role:role});
  if(error) redirect(`/account/organizations/${org}?invite_error=1`);
  redirect(`/account/organizations/${org}?invited=1`);
}
export async function revokeInvitation(form: FormData) {
  const org=String(form.get('organization') || ''),invite=String(form.get('invitation') || '');
  if(!uuid.test(org) || !uuid.test(invite)) redirect('/account?error=1');
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError || !user) redirect('/login');
  const {error}=await supabase.rpc('revoke_organization_invitation',{p_org:org,p_invite:invite});
  if(error) redirect(`/account/organizations/${org}?invite_error=1`);
  redirect(`/account/organizations/${org}?revoked=1`);
}

export async function deleteOrganization(form: FormData) {
  const id = String(form.get('organization') || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect('/account');
  const supabase = await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError || !user) redirect('/login');
  const {error}=await supabase.rpc('delete_empty_organization',{p_org:id});
  if(error) redirect(`/account/organizations/${id}?delete_error=${error.code==='P0001'?'not_empty':'failed'}`);
  redirect('/account?deleted=1');
}
