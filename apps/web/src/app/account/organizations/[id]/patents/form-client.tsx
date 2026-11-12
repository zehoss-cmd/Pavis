'use client';
import { useActionState, useState, type ChangeEvent } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { saveAsset } from './actions';
import { statusLabels, type Asset, type Family, type AssetFormState } from './form-data';
export function AssetFormClient({org,families,asset,action=saveAsset}:{org:string;families:Family[];asset?:Asset;action?:typeof saveAsset}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as AssetFormState);
 const [values,setValues]=useState(()=>({
  title:asset?.title || '',jurisdiction:asset?.jurisdiction || '',family:asset?.family_id || '',
  application_number:asset?.application_number || '',publication_number:asset?.publication_number || '',registration_number:asset?.registration_number || '',
  rights_holder:asset?.rights_holder || '',inventors:asset?.inventors || '',priority_date:asset?.priority_date || '',filing_date:asset?.filing_date || '',
  legal_status:asset?.legal_status || 'unknown',verified_date:asset?.verified_date || '',source:asset?.source || '',
 }));
 const change=(event:ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{const {name,value}=event.currentTarget;setValues(current=>({...current,[name]:value}));};
 const messages={invalid:'입력 내용을 확인해 주세요. 작성한 내용은 유지됩니다.',duplicate:'같은 국가에 동일한 출원번호가 이미 등록되어 있습니다. 작성한 내용을 수정해 주세요.',save:'저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 특허 목록에서 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다른 탭에서 로그인 상태를 확인한 뒤 다시 시도해 주세요.'};
 // React may reset form controls after an action returns an error; keep the entered values.
 return <form action={formAction} className="patent-form" aria-busy={pending} onReset={event=>event.preventDefault()}>
  {state.error && <p className="form-message" role="alert">{messages[state.error]}</p>}
  <input type="hidden" name="organization" value={org}/>{asset && <input type="hidden" name="asset" value={asset.id}/>}
  <fieldset className="valuation-fieldset" disabled={pending}><legend>특허 기본 정보</legend><div className="dcf-field-grid">
   <label className="dcf-field-wide">발명의 명칭<input name="title" maxLength={300} value={values.title} onChange={change} required/></label>
   <label>관할 국가 코드<input name="jurisdiction" maxLength={2} minLength={2} pattern="[A-Za-z]{2}" placeholder="예: KR, US" value={values.jurisdiction} onChange={change} required/></label>
   <label>특허 패밀리<select name="family" value={values.family} onChange={change}><option value="">연결하지 않음</option>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset" disabled={pending}><legend>특허 번호와 권리 관계</legend><div className="dcf-field-grid">
   <label>출원번호<input name="application_number" maxLength={100} value={values.application_number} onChange={change} placeholder="출원번호가 있다면 입력"/></label>
   <label>공개번호<input name="publication_number" maxLength={100} value={values.publication_number} onChange={change} placeholder="공개번호가 있다면 입력"/></label>
   <label>등록번호<input name="registration_number" maxLength={100} value={values.registration_number} onChange={change} placeholder="등록번호가 있다면 입력"/></label>
   <label>권리자<input name="rights_holder" maxLength={500} value={values.rights_holder} onChange={change} placeholder="여러 명이면 쉼표로 구분"/></label>
   <label className="dcf-field-wide">발명자<input name="inventors" maxLength={500} value={values.inventors} onChange={change} placeholder="여러 명이면 쉼표로 구분"/></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset" disabled={pending}><legend>날짜와 법적 상태</legend><div className="dcf-field-grid">
   <label>우선일<input name="priority_date" type="date" value={values.priority_date} onChange={change}/></label>
   <label>출원일<input name="filing_date" type="date" value={values.filing_date} onChange={change}/></label>
   <label>법적 상태<select name="legal_status" value={values.legal_status} onChange={change}>{Object.entries(statusLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>상태 확인일<input name="verified_date" type="date" value={values.verified_date} onChange={change}/></label>
   <label className="dcf-field-wide">정보 출처<input name="source" maxLength={500} value={values.source} onChange={change} placeholder="예: 특허공보, 내부 검토"/></label>
  </div><p>법적 상태는 입력한 정보이며, 공식 확인 결과를 뜻하지 않습니다.</p></fieldset>
  <SubmitButton>{asset ? '변경 저장' : '특허 등록'}</SubmitButton>
 </form>;
}
