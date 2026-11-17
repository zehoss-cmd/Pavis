'use client';
import { useActionState,useState } from 'react';
import type { ContributionFormState } from '@/domain/products/patent-contribution';
import { savePatentContribution } from '../actions';
type Action=(state:ContributionFormState,form:FormData)=>Promise<ContributionFormState>;
export function ContributionForm({org,product,patent,title,initial,action=savePatentContribution}:{org:string;product:string;patent:string;title:string;initial:number|null;action?:Action}) {
 const [state,formAction,pending]=useActionState(action,{error:null,saved:null} as ContributionFormState),[value,setValue]=useState(initial===null?'':String(initial));
 const messages={invalid:'0에서 100 사이를 소수점 둘째 자리까지 입력해 주세요. 입력값은 유지됩니다.',network:'연결 오류가 발생했습니다. 다른 탭에서 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다른 탭에서 다시 로그인해 주세요.',save:'저장하지 못했습니다. 연결 상태와 권한을 확인해 주세요.'};
 return <form action={formAction} className="contribution-form" aria-busy={pending} onReset={event=>event.preventDefault()}><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product}/><input type="hidden" name="patent" value={patent}/><label>{title} 기여율 (%)<input name="contribution_rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} placeholder="미입력" disabled={pending}/></label><button type="submit" disabled={pending}>{pending?'저장 중...':'기여율 저장'}</button>{state.error&&<p role="alert" className="form-message">{messages[state.error]}</p>}{state.saved!==null&&state.saved===value.trim()&&<p role="status">기여율을 저장했습니다.</p>}</form>;
}
