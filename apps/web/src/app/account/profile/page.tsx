import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveProfile } from './actions';
export default async function Profile({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  const {data:profile,error:readError}=await supabase.from('profiles').select('display_name').eq('user_id',user.id).maybeSingle();
  const flags=await searchParams;
  return <main className="auth-page"><Link href="/account" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">MY PROFILE</p><h1>내 프로필</h1><p>나를 알아보기 쉽게 이름을 설정해 주세요.</p><p>{user.email}</p>{flags.saved && <p className="form-message" role="status">프로필을 저장했습니다.</p>}{(flags.error || readError) && <p className="form-message" role="alert">프로필을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}{!readError && <form action={saveProfile}><label>이름<input name="display_name" maxLength={60} defaultValue={profile?.display_name || ''} autoComplete="name" required/></label><SubmitButton>저장하기</SubmitButton></form>}<Link href="/account"> 내 조직으로</Link></div></main>;
}
