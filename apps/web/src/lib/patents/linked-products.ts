import { parsePortfolioPage } from '../portfolios/pagination.ts';
export const linkedProductPageSize=25;
export const linkedProductMaxPage=1000;
type QueryValue=string|string[]|undefined;
export type LinkedProductContext={product_page?:QueryValue;from_family?:QueryValue;family_q?:QueryValue;family_page?:QueryValue;return_family?:QueryValue};
export function productPage(value:QueryValue){return parsePortfolioPage(value);}
export function productPageUrl(context:LinkedProductContext,page:number) {
 const result=new URLSearchParams();
 for(const key of ['from_family','family_q','family_page','return_family'] as const){const value=context[key];if(typeof value==='string'&&value.length<=200)result.set(key,value);}
 if(page>1&&page<=linkedProductMaxPage)result.set('product_page',String(page));
 const query=result.toString();return `${query?'?'+query:'?'}#linked-products`;
}
