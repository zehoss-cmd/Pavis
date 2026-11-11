export type DcfFieldValues={valuation_date:string;scenario:string;currency:string;years:number;base_sales:number;growth_rate:number;royalty_rate:number;contribution_rate:number;annual_cost:number;tax_rate:number;discount_rate:number;assumptions:string|null};
const scenarios:Record<string,string>={conservative:'보수',base:'기준',optimistic:'낙관'};
export function DcfFields({item}:{item?:DcfFieldValues}) {
 return <>
  <fieldset className="valuation-fieldset"><legend>평가 기본 정보</legend><div className="dcf-field-grid">
   <label>평가 기준일<input type="date" name="valuation_date" defaultValue={item?.valuation_date||''} required/></label>
   <label>시나리오<select name="scenario" defaultValue={item?.scenario||'base'}>{Object.entries(scenarios).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
   <label>통화<select name="currency" defaultValue={item?.currency||'KRW'}>{['KRW','USD','EUR','JPY'].map(v=><option value={v} key={v}>{v}</option>)}</select></label>
   <label>예측 기간 (년)<input type="number" name="years" min="1" max="20" step="1" defaultValue={item?.years??''} required/></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset"><legend>매출과 로열티 가정</legend><div className="dcf-field-grid">
   <label>첫해 매출 (선택한 통화 단위)<input type="number" name="base_sales" min="0" max="1000000000000" step="0.01" defaultValue={item?.base_sales??''} required/></label>
   <label>연 매출 성장률 (%)<input type="number" name="growth_rate" min="-100" max="100" step="0.01" defaultValue={item?.growth_rate??''} required/></label>
   <label>로열티율 (%)<input type="number" name="royalty_rate" min="0" max="100" step="0.01" defaultValue={item?.royalty_rate??''} required/></label>
   <label>특허 기여도 (%)<input type="number" name="contribution_rate" min="0" max="100" step="0.01" defaultValue={item?.contribution_rate??''} required/></label>
   <label>연간 비용 (선택한 통화 단위)<input type="number" name="annual_cost" min="0" max="1000000000000" step="0.01" defaultValue={item?.annual_cost??''} required/></label>
  </div></fieldset>
  <fieldset className="valuation-fieldset"><legend>세금·할인 및 근거</legend><div className="dcf-field-grid">
   <label>세율 (%)<input type="number" name="tax_rate" min="0" max="100" step="0.01" defaultValue={item?.tax_rate??''} required/></label>
   <label>할인율 (%)<input type="number" name="discount_rate" min="0" max="100" step="0.01" defaultValue={item?.discount_rate??''} required/></label>
   <label className="dcf-field-wide">가정의 근거와 출처<textarea name="assumptions" maxLength={2000} rows={4} defaultValue={item?.assumptions||''} placeholder="매출, 로열티율, 기여도, 비용, 세율 및 할인율의 근거"/></label>
  </div></fieldset>
 </>;
}
