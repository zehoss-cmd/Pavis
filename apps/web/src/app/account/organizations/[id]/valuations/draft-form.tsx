'use client';

import { useActionState } from 'react';
import type { DraftFormState } from './draft-form-state';

export function DraftForm({action,children}:{action:(state:DraftFormState,form:FormData)=>Promise<DraftFormState>;children:React.ReactNode}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as DraftFormState);
 const messages={invalid:'입력 내용을 확인해 주세요. 작성한 내용은 유지됩니다.',save:'저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 평가 목록에서 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다른 탭에서 로그인 상태를 확인한 뒤 다시 시도해 주세요.'};
 return <form action={formAction} aria-busy={pending} onReset={event=>event.preventDefault()}>
  {state.error && <p role="alert" className="form-message">{messages[state.error]}</p>}
  <fieldset className="draft-form-fields" aria-label="평가 입력" disabled={pending}>{children}</fieldset>
 </form>;
}
