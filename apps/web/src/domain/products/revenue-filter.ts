export const revenueFilterOptions = [
 {value:'', label:'전체 제품'},
 {value:'missing', label:'매출 미입력'},
 {value:'present', label:'매출 입력됨'},
 {value:'outdated', label:'기준연도 확인'},
] as const;
export type RevenueFilter = typeof revenueFilterOptions[number]['value'];
export function revenueFilter(value:unknown):RevenueFilter {
 return revenueFilterOptions.find(option => option.value === value)?.value ?? '';
}
export function productListQuery(q:string,filter:RevenueFilter,page:number) {
 const p=new URLSearchParams();if(q)p.set('q',q);if(filter)p.set('revenue',filter);if(page>1)p.set('page',String(page));const s=p.toString();return s?`?${s}`:'?';
}

/** Previous calendar year in Korea; independent of server timezone. */
export function previousRevenueYear(date:Date):number {return Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(date))-1;}

export function productReturnContext(query:unknown,filter:unknown,page:unknown) {
 const q=typeof query==='string'?query.trim().slice(0,100):'';
 const raw=typeof page==='string'&&/^[1-9]\d{0,3}$/.test(page)?Number(page):1;
 return {q,filter:revenueFilter(filter),page:Math.min(raw,productMaxPage)};
}

export function productDetailContext(query:unknown,filter:unknown,page:unknown) {
 const context=productReturnContext(query,filter,page);
 const params=new URLSearchParams();
 if(context.q)params.set('return_query',context.q);
 if(context.filter)params.set('return_revenue',context.filter);
 if(context.page>1)params.set('return_page',String(context.page));
 return params;
}

/** Accept only the bounded, local product list context from a submitted form. */
export function deleteReturnQuery(query:unknown,filter:unknown,page:unknown):string {
 const context=productReturnContext(query,filter,page);
 const params=new URLSearchParams(productListQuery(context.q,context.filter,context.page).slice(1));
 params.set('deleted','1');return `?${params.toString()}`;
}

export const productPageSize=25;
export const productMaxPage=1000;

export function productPageInfo(page:number,count:number,displayed:number) {
 const last=Math.min(productMaxPage,Math.max(1,Math.ceil(count/productPageSize)));
 return {
  last,
  firstItem:displayed>0?(page-1)*productPageSize+1:0,
  lastItem:displayed>0?(page-1)*productPageSize+displayed:0,
  capped:count>productMaxPage*productPageSize,
 };
}
