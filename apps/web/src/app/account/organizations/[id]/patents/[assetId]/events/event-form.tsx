'use client';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { statusLabels } from '../../form-data';
import type { LegalEvent, LegalEventFormState } from './form-state';

export function LegalEventForm({org,asset,page,event,action}:{org:string;asset:string;page:number;event?:LegalEvent;action:(state:LegalEventFormState,form:FormData)=>Promise<LegalEventFormState>}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as LegalEventFormState);
 const messages={invalid:'입력한 날짜와 상태, 글자 수를 확인해 주세요. 작성한 내용은 유지됩니다.',save:'이력을 저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 이력 목록에서 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다른 탭에서 로그인 상태를 확인한 뒤 다시 시도해 주세요.'};
 return <form action={formAction} aria-busy={pending} onReset={e=>e.preventDefault()}>
  {state.error&&<p role="alert" className="form-message">{messages[state.error]}</p>}
  <fieldset className="draft-form-fields" aria-label="법적 상태 이력 입력" disabled={pending}>
   <input type="hidden" name="organization" value={org}/><input type="hidden" name="asset" value={asset}/><input type="hidden" name="operation" value={event?'update':'create'}/>{event&&<><input type="hidden" name="event" value={event.id}/><input type="hidden" name="page" value={page}/></>}
   <label>사건일<input type="date" name="event_date" defaultValue={event?.event_date||''} required/></label>
   <label>당시 상태<select name="legal_status" defaultValue={event?.legal_status||'unknown'}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
   <label>정보 출처 <small>선택 사항</small><input name="source" maxLength={500} defaultValue={event?.source||''} placeholder="예: 특허공보, 내부 검토"/></label>
   <label>상태 확인일 <small>선택 사항</small><input type="date" name="verified_date" defaultValue={event?.verified_date||''}/></label>
   <label>메모 <small>선택 사항</small><textarea name="note" maxLength={1000} rows={3} defaultValue={event?.note||''} placeholder="사건의 근거 또는 설명"/></label>
   <SubmitButton>{event?'변경 저장':'이력 추가'}</SubmitButton>
  </fieldset>
 </form>;
}
