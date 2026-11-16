import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveProfile } from './actions';
import { ProfileView } from './profile-view';
import { BusinessCardForm } from './business-card-form';
import { retryBusinessCardNotice, submitBusinessCard } from './business-card-actions';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';

export default async function Profile({searchParams}:{searchParams:Promise<{error?:string;saved?:string;card_error?:string;card_notice?:string}>}) {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  const {data:profile,error:readError}=await supabase.from('profiles').select('display_name,phone,job_title').eq('user_id',user.id).maybeSingle();
  const flags=await searchParams;
  const [{data:card,error:cardError},{data:reviewer}]=await Promise.all([supabase.from('business_card_requests').select('status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),supabase.rpc('is_business_card_reviewer')]);
  return <><ProfileView email={user.email} name={profile?.display_name || ''} phone={profile?.phone || ''} jobTitle={profile?.job_title || ''} verified={!!user.email_confirmed_at} saved={!!flags.saved} error={!!flags.error} readError={!!readError} action={saveProfile}/><section className="profile-page business-card-section" aria-labelledby="card-heading"><div className="profile-card"><p className="profile-card-kicker">PROFILE VERIFICATION</p><h2 id="card-heading">명함 인증</h2><p>명함 제출 후 운영자가 확인합니다. 승인 결과는 명함 검토 결과이며 본인 신원이나 재직에 대한 공식 증명이 아닙니다.</p>
  {cardError ? <p role="alert">명함 인증 상태를 불러오지 못했습니다.</p> : <><p>현재 상태: {card?.status === 'pending' ? '검토 대기' : card?.status === 'approved' ? '명함 검토 승인' : card?.status === 'rejected' ? '반려' : '미신청'}</p>{card?.status !== 'pending' ? <BusinessCardForm action={submitBusinessCard}/> : <form action={retryBusinessCardNotice} className="business-card-form"><SubmitButton pendingLabel="전송 중...">운영자에게 알림 다시 보내기</SubmitButton><p>알림은 1분에 한 번 보낼 수 있습니다.</p></form>}</>}
  {flags.card_notice === 'sent' && <p role="status" className="profile-notice">명함을 제출하고 운영자에게 알림을 보냈습니다.</p>}{flags.card_notice === 'rate' && <p role="alert" className="profile-notice profile-notice-error">알림을 보내지 못했습니다. 1분 후 다시 시도해 주세요.</p>}{flags.card_notice === 'failed' && <p role="alert" className="profile-notice profile-notice-error">명함은 제출되었지만 알림 메일 발송에 실패했습니다. 운영자에게 확인해 주세요.</p>}{flags.card_error && <p role="alert" className="profile-notice profile-notice-error">{flags.card_error==='mail_setup' ? '알림 메일 설정이 완료되지 않아 신청할 수 없습니다.' : flags.card_error==='invalid' ? 'JPG 또는 PNG 이미지를 3MB 이하로 선택해 주세요.' : flags.card_error==='pending' ? '이미 검토 대기 중인 신청이 있습니다.' : '명함을 제출하지 못했습니다. 다시 시도해 주세요.'}</p>}{reviewer && <p><Link className="profile-back" href="/account/business-card-review">명함 인증 검토</Link></p>}</div></section></>;
}
