import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveProfile } from './actions';
import { ProfileView } from './profile-view';

export default async function Profile({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  const {data:profile,error:readError}=await supabase.from('profiles').select('display_name').eq('user_id',user.id).maybeSingle();
  const flags=await searchParams;
  return <ProfileView email={user.email} name={profile?.display_name || ''} verified={!!user.email_confirmed_at} saved={!!flags.saved} error={!!flags.error} readError={!!readError} action={saveProfile}/>;
}
