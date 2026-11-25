'use client';
import { useActionState, useId, useState, type ChangeEvent } from 'react';
import { UnsavedChangesStatus } from '@/components/unsaved-changes-status';
import { SubmitButton } from '@/components/submit-button';
import { normalizeProductAmount, previewRevenueChange, productAmountPattern, type Product, type ProductFormState } from '@/domain/products/validation';
import type { RevenueFilter } from '@/domain/products/revenue-filter';
import { productFormValues } from '@/domain/products/form-values';
import { saveProduct } from './actions';
export function ProductForm({org,product,previousYear,returnRevenue='', returnQuery='', returnPage=1, revenue }:{org:string;product?:Product;previousYear:number;returnRevenue?:RevenueFilter;returnQuery?:string;returnPage?:number;revenue?:Pick<Product,'revenue_year'|'revenue_amount'|'revenue_currency'>}) {
 const [state,action,pending]=useActionState(saveProduct,{error:null} as ProductFormState);
 const currencyId=useId();
 const amountHintId=useId();
 const savedValues=productFormValues(previousYear,product);
 const [values,setValues]=useState(()=>productFormValues(previousYear,product,revenue));
 const [beforeRestore,setBeforeRestore]=useState<typeof values|null>(null);
 const hasEdits=Object.entries(savedValues).some(([key,value])=>values[key as keyof typeof values]!==value);
 function restore() {
  if(beforeRestore) {
   setValues(beforeRestore);
   setBeforeRestore(null);
  } else {
   setBeforeRestore(values);
   setValues(savedValues);
  }
 }
 const amount=normalizeProductAmount(values.revenue_amount);
 const invalidAmount=values.revenue_amount!=='' && amount===null;
 const preview=product ? previewRevenueChange(product,values) : null;
 const change=(e:ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{
  const {name,value}=e.target;
  setBeforeRestore(null);
  setValues(v=>({...v,[name]:value}));
 };
 const messages={invalid:'입력 내용을 확인해 주세요. 매출액은 0 이상의 숫자로 소수점 둘째 자리까지 입력할 수 있습니다.',save:'저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.'};
 return <form action={action} className="patent-form" aria-busy={pending} onReset={e=>e.preventDefault()}>
  {state.error&&<p className="form-message" role="alert">{messages[state.error]}</p>}<input type="hidden" name="organization" value={org}/><input type="hidden" name="return_revenue" value={returnRevenue}/><input type="hidden" name="return_query" value={returnQuery}/><input type="hidden" name="return_page" value={returnPage}/>{product&&<input type="hidden" name="product" value={product.id}/>}
  <fieldset className="valuation-fieldset" disabled={pending}><legend>제품 정보</legend><div className="dcf-field-grid">
   <label className="dcf-field-wide">제품명<input name="name" maxLength={200} required value={values.name} onChange={change} placeholder="제품명을 입력하세요"/></label>
   <label>출시연도<input name="launch_year" type="number" min="1800" max="2100" step="1" value={values.launch_year} onChange={change} placeholder="예: 2024"/></label>
   <label>매출 기준연도<input name="revenue_year" type="number" min="1800" max="2100" step="1" required={values.revenue_amount!==''} value={values.revenue_year} onChange={change}/></label>
   <div><label>해당 연도 매출액<input name="revenue_amount" type="text" pattern={productAmountPattern} inputMode="decimal"
     aria-invalid={invalidAmount} aria-describedby={amountHintId} value={values.revenue_amount} onChange={change} placeholder="예: 1,234,567.89"/></label>
    <small id={amountHintId}>{invalidAmount ? '정수는 12자리, 소수는 2자리까지 입력하세요. 쉼표는 세 자리마다 사용할 수 있습니다.'
      : amount!==null ? `입력 금액 · ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(Number(amount))} ${values.revenue_currency}`
      : '빈칸은 매출 미입력으로, 0은 매출 0으로 저장됩니다.'}</small></div>
   <div><label htmlFor={currencyId}>통화</label><select id={currencyId} name="revenue_currency" value={values.revenue_currency} onChange={change}><option value="KRW">KRW · 원</option><option value="USD">USD · 달러</option><option value="EUR">EUR · 유로</option><option value="JPY">JPY · 엔</option></select></div>
  </div><p>{product ? '저장한 매출은 현재 매출로 표시되며 이전 연도의 매출은 이력에 남습니다. 현재 매출에 대해서 운영자 검토를 요청할 수 있습니다.' : '매출 기준연도는 전년도로 기본 설정됩니다. 매출액은 선택 입력이며 기준연도와 통화가 함께 저장됩니다.'}</p></fieldset>
  {preview && <section className="valuation-fieldset" aria-label="매출 변경 미리보기">
   <h3>매출 변경 미리보기</h3>
   <dl className="dcf-field-grid">
    <div><dt>현재 저장된 매출</dt><dd>{preview.before}</dd></div>
    <div><dt>저장 후 매출</dt><dd>{preview.after}</dd></div>
   </dl>
   <p>저장하면 이 제품의 대기 중인 매출 검토 요청이 종료됩니다.</p>
  </section>}
  {product && <button type="button" className="asset-overview-link" disabled={pending || (!hasEdits && !beforeRestore)} onClick={restore}>
   {beforeRestore ? '복원 취소' : '저장된 값으로 복원'}
  </button>}
  <UnsavedChangesStatus active={hasEdits && !pending}/>
  <SubmitButton>{product?'변경 저장':'제품 등록'}</SubmitButton>
 </form>;
}
