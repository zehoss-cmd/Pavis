import { SubmitButton } from '@/components/submit-button';
import { saveAsset } from './actions';
export const statusLabels:Record<string,string>={unknown:'미확인',pending:'출원 중',granted:'등록',rejected:'거절',withdrawn:'취하',expired:'만료',lapsed:'소멸',revoked:'무효'};
export type Family={id:string;name:string};
export type Asset={id:string;family_id:string|null;title:string;jurisdiction:string;application_number:string|null;publication_number:string|null;registration_number:string|null;rights_holder:string|null;inventors:string|null;filing_date:string|null;priority_date:string|null;legal_status:string;source:string|null;verified_date:string|null};
export function AssetForm({org,families,asset}:{org:string;families:Family[];asset?:Asset}) {
 return <form action={saveAsset} className="patent-form">
  <input type="hidden" name="organization" value={org}/>{asset && <input type="hidden" name="asset" value={asset.id}/>}
  <fieldset className="valuation-fieldset"><legend>특허 기본 정보</legend><div className="dcf-field-grid">
   <label className="dcf-field-wide">발명의 명칭<input name="title" maxLength={300} defaultValue={asset?.title || ''} required/></label>
   <label>관할 국가 코드<input name="jurisdiction" maxLength={2} minLength={2} pattern="[A-Za-z]{2}" placeholder="예: KR, US" defaultValue={asset?.jurisdiction || ''} required/></label>
   <label>특허 패밀리<select name="family" defaultValue={asset?.family_id || ''}><option value="">연결하지 않음</option>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset"><legend>특허 번호와 권리 관계</legend><div className="dcf-field-grid">
   <label>출원번호<input name="application_number" maxLength={100} defaultValue={asset?.application_number || ''} placeholder="출원번호가 있다면 입력"/></label>
   <label>공개번호<input name="publication_number" maxLength={100} defaultValue={asset?.publication_number || ''} placeholder="공개번호가 있다면 입력"/></label>
   <label>등록번호<input name="registration_number" maxLength={100} defaultValue={asset?.registration_number || ''} placeholder="등록번호가 있다면 입력"/></label>
   <label>권리자<input name="rights_holder" maxLength={500} defaultValue={asset?.rights_holder || ''} placeholder="여러 명이면 쉼표로 구분"/></label>
   <label className="dcf-field-wide">발명자<input name="inventors" maxLength={500} defaultValue={asset?.inventors || ''} placeholder="여러 명이면 쉼표로 구분"/></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset"><legend>날짜와 법적 상태</legend><div className="dcf-field-grid">
   <label>우선일<input name="priority_date" type="date" defaultValue={asset?.priority_date || ''}/></label>
   <label>출원일<input name="filing_date" type="date" defaultValue={asset?.filing_date || ''}/></label>
   <label>법적 상태<select name="legal_status" defaultValue={asset?.legal_status || 'unknown'}>{Object.entries(statusLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>상태 확인일<input name="verified_date" type="date" defaultValue={asset?.verified_date || ''}/></label>
   <label className="dcf-field-wide">정보 출처<input name="source" maxLength={500} defaultValue={asset?.source || ''} placeholder="예: 특허공보, 내부 검토"/></label>
  </div><p>법적 상태는 입력한 정보이며, 공식 확인 결과를 뜻하지 않습니다.</p></fieldset>
  <SubmitButton>{asset ? '변경 저장' : '특허 등록'}</SubmitButton>
 </form>;
}
