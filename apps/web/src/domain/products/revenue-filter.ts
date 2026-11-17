export type RevenueFilter='missing'|'present'|'outdated'|'';
export function revenueFilter(value:unknown):RevenueFilter {return value==='missing'||value==='present'||value==='outdated'?value:'';}
export function productListQuery(q:string,filter:RevenueFilter,page:number) {
 const p=new URLSearchParams();if(q)p.set('q',q);if(filter)p.set('revenue',filter);if(page>1)p.set('page',String(page));const s=p.toString();return s?`?${s}`:'?';
}

/** Previous calendar year in Korea; independent of server timezone. */
export function previousRevenueYear(date:Date):number {return Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(date))-1;}

/** Accept only the bounded, local product list context from a submitted form. */
export function deleteReturnQuery(query:unknown,filter:unknown,page:unknown):string {
 const q=typeof query==='string'?query.trim().slice(0,100):'';
 const raw=typeof page==='string'&&/^[1-9]\d{0,3}$/.test(page)?Number(page):1;
 const params=new URLSearchParams(productListQuery(q,revenueFilter(filter),Math.min(raw,1000)).slice(1));
 params.set('deleted','1');return `?${params.toString()}`;
}
