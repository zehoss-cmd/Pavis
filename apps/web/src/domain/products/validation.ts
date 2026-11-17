export type Product = {id:string;name:string;launch_year:number|null;revenue_year:number|null;revenue_amount:number|null;revenue_currency:string|null};
export type ProductFormState = {error:'invalid'|'save'|'network'|'session'|null};
const year=(value:string)=>/^\d{4}$/.test(value)&&Number(value)>=1800&&Number(value)<=2100;
export function parseProduct(form:FormData) {
 const read=(key:string)=>String(form.get(key)||'').trim();
 const name=read('name'),launch=read('launch_year'),revenueYear=read('revenue_year'),amount=read('revenue_amount'),currency=read('revenue_currency');
 if(!name||Array.from(name).length>200||(launch&&!year(launch))||(amount&&(!year(revenueYear)||!/^\d{1,12}(\.\d{1,2})?$/.test(amount)||!['KRW','USD','EUR','JPY'].includes(currency)))) return null;
 return {name,launch_year:launch?Number(launch):null,revenue_year:amount?Number(revenueYear):null,revenue_amount:amount||null,revenue_currency:amount?currency:null};
}
