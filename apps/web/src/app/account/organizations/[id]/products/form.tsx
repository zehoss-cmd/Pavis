'use client';
import { useActionState, useState, type ChangeEvent } from 'react';
import { SubmitButton } from '@/components/submit-button';
import type { Product, ProductFormState } from '@/domain/products/validation';
import type { RevenueFilter } from '@/domain/products/revenue-filter';
import { saveProduct } from './actions';
export function ProductForm({org,product,previousYear,returnRevenue='' }:{org:string;product?:Product;previousYear:number;returnRevenue?:RevenueFilter}) {
 const [state,action,pending]=useActionState(saveProduct,{error:null} as ProductFormState);
 const [values,setValues]=useState(()=>({name:product?.name||'',launch_year:product?.launch_year?.toString()||'',revenue_year:product?.revenue_year?.toString()||String(previousYear),revenue_amount:product?.revenue_amount?.toString()??'',revenue_currency:product?.revenue_currency||'KRW'}));
 const change=(e:ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setValues(v=>({...v,[e.target.name]:e.target.value}));
 const messages={invalid:'입력 내용을 확인해 주세요. 매출액은 0 이상의 숫자로 소수점 둘째 자리까지 입력할 수 있습니다.',save:'저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.',network:'연결 오류가 발생했습니다. 저장 여부를 확인한 뒤 다시 시도해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.'};
 return <form action={action} className="patent-form" aria-busy={pending} onReset={e=>e.preventDefault()}>
  {state.error&&<p className="form-message" role="alert">{messages[state.error]}</p>}<input type="hidden" name="organization" value={org}/><input type="hidden" name="return_revenue" value={returnRevenue}/>{product&&<input type="hidden" name="product" value={product.id}/>}
  <fieldset className="valuation-fieldset" disabled={pending}><legend>제품 정보</legend><div className="dcf-field-grid">
   <label className="dcf-field-wide">제품명<input name="name" maxLength={200} required value={values.name} onChange={change} placeholder="제품명을 입력하세요"/></label>
   <label>출시연도<input name="launch_year" type="number" min="1800" max="2100" step="1" value={values.launch_year} onChange={change} placeholder="예: 2024"/></label>
   <label>매출 기준연도<input name="revenue_year" type="number" min="1800" max="2100" step="1" value={values.revenue_year} onChange={change}/></label>
   <label>해당 연도 매출액<input name="revenue_amount" type="number" min="0" max="999999999999.99" step="0.01" inputMode="decimal" value={values.revenue_amount} onChange={change} placeholder="금액 입력"/></label>
   <label>통화<select name="revenue_currency" value={values.revenue_currency} onChange={change}><option value="KRW">KRW · 원</option><option value="USD">USD · 달러</option><option value="EUR">EUR · 유로</option><option value="JPY">JPY · 엔</option></select></label>
  </div><p>매출 기준연도는 전년도로 기본 설정됩니다. 매출액은 선택 입력이며 기준연도와 통화가 함께 저장됩니다.</p></fieldset>
  <SubmitButton>{product?'변경 저장':'제품 등록'}</SubmitButton>
 </form>;
}
