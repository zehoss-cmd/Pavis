import type { Product } from './validation';

type Revenue = Pick<Product, 'revenue_amount'|'revenue_year'|'revenue_currency'>;

export function productFormValues(previousYear:number, product?:Product, revenue?:Revenue) {
 const source=revenue ?? product;
 return {
  name:product?.name ?? '',
  launch_year:product?.launch_year?.toString() ?? '',
  revenue_year:source?.revenue_year?.toString() ?? String(previousYear),
  revenue_amount:source?.revenue_amount?.toString() ?? '',
  revenue_currency:source?.revenue_currency ?? 'KRW',
 };
}
