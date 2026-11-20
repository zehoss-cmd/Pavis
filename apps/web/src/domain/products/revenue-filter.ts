export type RevenueFilter='missing'|'present'|'outdated'|'';
export function revenueFilter(value:unknown):RevenueFilter {return value==='missing'||value==='present'||value==='outdated'?value:'';}
export function productListQuery(q:string,filter:RevenueFilter,page:number) {
 const p=new URLSearchParams();if(q)p.set('q',q);if(filter)p.set('revenue',filter);if(page>1)p.set('page',String(page));const s=p.toString();return s?`?${s}`:'?';
}

/** Previous calendar year in Korea; independent of server timezone. */
export function previousRevenueYear(date:Date):number {return Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(date))-1;}

export function productReturnContext(query:unknown,filter:unknown,page:unknown) {
 const q=typeof query==='string'?query.trim().slice(0,100):'';
 const raw=typeof page==='string'&&/^[1-9]\d{0,3}$/.test(page)?Number(page):1;
 return {q,filter:revenueFilter(filter),page:Math.min(raw,1000)};
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
