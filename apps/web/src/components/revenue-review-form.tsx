'use client';
import { useActionState,useState } from 'react';
import type { RevenueReviewFormState } from '@/domain/products/revenue-review-form';
type ReviewAction=(state:RevenueReviewFormState,form:FormData)=>Promise<RevenueReviewFormState>;
const messages={invalid:'입력 내용을 확인해 주세요. 작성한 내용은 유지됩니다.',pending:'이미 검토 대기 중인 요청이 있습니다. 다른 탭에서 상태를 확인해 주세요.',stale:'제품 정보가 변경되었거나 이미 처리된 요청입니다. 작성한 내용을 복사한 뒤 다른 탭에서 현재 상태를 확인해 주세요.',forbidden:'권한을 확인할 수 없습니다. 작성한 내용을 유지한 채 다른 탭에서 권한을 확인해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 작성한 내용을 유지한 채 다른 탭에서 다시 로그인해 주세요.',network:'연결이 끊겼습니다. 요청이 처리됐을 수 있으므로 다른 탭에서 결과를 확인한 뒤 다시 시도해 주세요.',save:'저장하지 못했습니다. 작성한 내용을 유지한 채 다른 탭에서 상태와 권한을 확인해 주세요.'};
export function RevenueReviewForm({action,mode,org,product,returnRevenue='',id}:{action:ReviewAction;mode:'request'|'decision';org?:string;product?:string;returnRevenue?:string;id?:string}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as RevenueReviewFormState),[text,setText]=useState('');
 return <form action={formAction} className={mode==='request'?'patent-form':'profile-form'} aria-busy={pending} onReset={event=>event.preventDefault()}>
  {state.error&&<p className="form-message" role="alert">{messages[state.error]}</p>}
  {mode==='request'?<><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product}/><input type="hidden" name="return_revenue" value={returnRevenue}/></>:<input type="hidden" name="id" value={id}/>}
  <fieldset className="draft-form-fields" disabled={pending}><label>{mode==='request'?'매출 근거 설명':'검토 의견'}<textarea name={mode==='request'?'evidence':'note'} required maxLength={1000} rows={mode==='request'?4:3} value={text} onChange={event=>setText(event.target.value)} placeholder={mode==='request'?'예: 확인 가능한 매출 자료의 명칭, 기간, 확인 방법':'검토한 근거 또는 추가로 필요한 자료를 적어 주세요'}/></label>
  {mode==='request'?<><p>제출한 제품명, 매출 기준연도·금액·통화와 근거 설명은 조직 구성원과 PAVIS 운영자가 열람합니다. 파일 첨부는 지원하지 않습니다.</p><button type="submit">{pending?'처리 중...':'운영자 검토 요청'}</button></>:<div className="profile-review-actions"><button type="submit" name="decision" value="reviewed">{pending?'처리 중...':'검토 완료'}</button><button type="submit" name="decision" value="needs_info">{pending?'처리 중...':'추가 자료 요청'}</button></div>}</fieldset>
 </form>;
}
