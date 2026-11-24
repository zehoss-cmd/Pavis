export type Product = {id:string;name:string;launch_year:number|null;revenue_year:number|null;revenue_amount:number|null;revenue_currency:string|null};
export type ProductFormState = {error:'invalid'|'save'|'network'|'session'|null};
export function productYear(value:unknown):number|null {
 return typeof value==='string'&&/^\d{4}$/.test(value)&&Number(value)>=1800&&Number(value)<=2100 ? Number(value) : null;
}
// Shared by the HTML input pattern and the server-side form parser.
export const productAmountPattern = String.raw`(?:\d{1,12}|\d{1,3}(?:,\d{3}){1,3})(?:\.\d{1,2})?`;
const productAmountExpression = new RegExp(`^(?:${productAmountPattern})$`);
export function normalizeProductAmount(value:string):string|null {
 return productAmountExpression.test(value) ? value.replaceAll(',', '') : null;
}

export function parseProduct(form:FormData) {
 const read=(key:string)=>String(form.get(key)||'').trim();
 const name=read('name'),launch=read('launch_year'),revenueYear=read('revenue_year'),amount=read('revenue_amount'),currency=read('revenue_currency');
 if(!name||Array.from(name).length>200||(launch&&!productYear(launch))||(amount&&(!productYear(revenueYear)||normalizeProductAmount(amount)===null||!['KRW','USD','EUR','JPY'].includes(currency)))) return null;
 return {name,launch_year:launch?Number(launch):null,revenue_year:amount?Number(revenueYear):null,revenue_amount:normalizeProductAmount(amount),revenue_currency:amount?currency:null};
}
