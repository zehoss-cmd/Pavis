import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { decideRevenueReview } from './actions';
import { RevenueReviewForm } from '@/components/revenue-review-form';
export default async function RevenueReviewPage({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}) {
 const supabase=await createClient(),{data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect('/login');
 const {data:reviewer,error:roleError}=await supabase.rpc('is_revenue_reviewer');if(roleError||!reviewer)notFound();
 const {data:requests,error:loadError}=await supabase.from('product_revenue_reviews').select('id,product_name,revenue_year,revenue_amount,revenue_currency,evidence,created_at,requester_id').eq('status','pending').order('created_at').order('id').limit(100);
 const flags=await searchParams;
 return <main className="profile-page"><div className="profile-heading"><p className="profile-kicker">REVENUE REVIEWS</p><h1>제품 매출 검토</h1><p>사용자가 제출한 매출과 근거를 검토하고 의견을 기록합니다. 검토 완료는 외부 감사나 매출 확정을 의미하지 않습니다.</p></div>
 {flags.saved&&<p role="status" className="profile-notice">검토 결과를 저장했습니다.</p>}{(flags.error||loadError)&&<p role="alert" className="profile-notice profile-notice-error">처리하지 못했습니다. 요청이 변경되었거나 검토 권한이 없을 수 있습니다.</p>}
 {!loadError&&!requests?.length&&<section className="profile-card"><p>검토 대기 중인 요청이 없습니다.</p></section>}<div className="profile-main">{requests?.map(item=><section className="profile-card" key={item.id}><p className="profile-card-kicker">검토 대기</p><h2>{item.product_name}</h2><p>{item.revenue_year}년 매출 {new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(item.revenue_amount)} {item.revenue_currency}</p><p>제출 근거: {item.evidence}</p><p>접수: {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(item.created_at))}</p>{item.requester_id===user.id&&<p>본인이 제출한 요청입니다.</p>}<RevenueReviewForm action={decideRevenueReview} mode="decision" id={item.id}/></section>)}</div><Link className="profile-back" href="/account">대시보드</Link></main>;
}
