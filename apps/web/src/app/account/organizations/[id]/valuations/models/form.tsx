'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import type { ModelFormState } from './form-state';

const dimensions=[['legal','법적 안정성'],['technical','기술성'],['market','시장성'],['commercial','사업화 가능성']] as const;

export function ModelForm({org,action}:{org:string;action:(state:ModelFormState,form:FormData)=>Promise<ModelFormState>}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as ModelFormState);
 const messages={invalid:'입력값과 가중치 합계 100%를 확인해 주세요. 작성한 내용은 유지됩니다.',duplicate:'같은 이름과 버전이 이미 있습니다. 작성한 내용을 수정해 주세요.',save:'등록하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 모델 목록에서 등록 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다른 탭에서 로그인 상태를 확인한 뒤 다시 시도해 주세요.'};
 return <form action={formAction} aria-busy={pending} onReset={event=>event.preventDefault()}>
  {state.error&&<p role="alert" className="form-message">{messages[state.error]}</p>}
  <fieldset className="draft-form-fields" aria-label="모델 입력" disabled={pending}>
   <input type="hidden" name="organization" value={org}/>
   <label>모델 이름<input name="name" maxLength={80} required placeholder="예: 기술이전 검토"/></label>
   <label>버전<input name="version" maxLength={40} required placeholder="예: v1.0"/></label>
   <label>기준 설명 및 출처<textarea name="description" maxLength={1000} rows={3} placeholder="가중치를 정한 근거를 기록하세요"/></label>
   {dimensions.map(([key,label])=><label key={key}>{label} 가중치 (%)<input type="number" name={`${key}_weight`} min="0" max="100" step="1" required defaultValue="25"/></label>)}
   <SubmitButton>모델 버전 등록</SubmitButton>
  </fieldset>
 </form>;
}
