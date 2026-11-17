import Link from '@/components/navigation-link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { reviewBusinessCard } from './actions';
export default async function BusinessCardReview({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if (error || !user) redirect('/login');
 const {data:reviewer,error:roleError}=await supabase.rpc('is_business_card_reviewer');
 if (roleError || !reviewer) notFound();
 const {data:requests,error:loadError}=await supabase.from('business_card_requests').select('id,user_id,requester_email,status,created_at').eq('status','pending').order('created_at').limit(100);
 const flags=await searchParams;
 return <main className="profile-page"><div className="profile-heading"><p className="profile-kicker">REVIEW REQUESTS</p><h1>명함 인증 검토</h1><p>명함 제출 내역을 확인하고 검토 결과를 기록하세요.</p></div>
 {flags.saved && <p role="status" className="profile-notice">검토 결과를 저장했습니다.</p>}{(flags.error || loadError) && <p role="alert" className="profile-notice profile-notice-error">요청을 처리하지 못했습니다. 다시 시도해 주세요.</p>}
 {!loadError && !requests?.length && <section className="profile-card"><p>검토 대기 중인 요청이 없습니다.</p></section>}
 <div className="profile-main">{requests?.map(item=><section className="profile-card" key={item.id}><p className="profile-card-kicker">검토 대기</p><h2>{item.requester_email}</h2><p>제출: {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(item.created_at))}</p><p><Link className="profile-back" href={`/account/business-card-review/${item.id}/file`}>명함 파일 다운로드</Link></p>{item.user_id===user.id?<p>본인의 요청은 직접 검토할 수 없습니다.</p>:<form action={reviewBusinessCard} className="profile-form"><input type="hidden" name="id" value={item.id}/><div className="profile-review-actions"><button type="submit" name="decision" value="approved">승인</button><button type="submit" name="decision" value="rejected">반려</button></div></form>}</section>)}</div><Link className="profile-back" href="/account">내 조직 보기</Link></main>;
}
