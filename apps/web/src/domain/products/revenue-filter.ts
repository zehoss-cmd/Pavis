export type RevenueFilter='missing'|'present'|'outdated'|'';
export function revenueFilter(value:unknown):RevenueFilter {return value==='missing'||value==='present'||value==='outdated'?value:'';}
export function productListQuery(q:string,filter:RevenueFilter,page:number) {
 const p=new URLSearchParams();if(q)p.set('q',q);if(filter)p.set('revenue',filter);if(page>1)p.set('page',String(page));const s=p.toString();return s?`?${s}`:'?';
}

/** Previous calendar year in Korea; independent of server timezone. */
export function previousRevenueYear(date:Date):number {return Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(date))-1;}
