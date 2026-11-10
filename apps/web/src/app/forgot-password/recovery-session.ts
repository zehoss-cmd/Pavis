import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { recoveryCookieName, validateRecoveryGrant } from '@/domain/auth/recovery-grant';

export async function recoverySession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const grant = (await cookies()).get(recoveryCookieName)?.value;
  if (!session?.access_token || session.user.id !== user.id || !validateRecoveryGrant(grant, session.access_token, user.id)) return null;
  return supabase;
}
