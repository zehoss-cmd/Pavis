import Link from 'next/link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import type { Product } from '@/domain/products/validation';
import type { RevenueFilter } from '@/domain/products/revenue-filter';
import { deleteProduct } from './actions';
export function ProductListItem({org,product,canWrite,q,filter,page,action=deleteProduct}:{org:string;product:Product;canWrite:boolean;q:string;filter:RevenueFilter;page:number;action?:(form:FormData)=>Promise<void>}) {
 const detail=`/account/organizations/${org}/products/${product.id}${filter?`?return_revenue=${filter}`:''}`;
 return <li className="product-list-item"><Link className="product-list-summary" href={detail}><strong>{product.name}</strong><span>출시 {product.launch_year?`${product.launch_year}년`:'미입력'} · {product.revenue_amount!==null?`${product.revenue_year}년 매출 ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(product.revenue_amount)} ${product.revenue_currency}`:'매출 미입력'}</span></Link>{canWrite&&<div className="product-list-actions"><Link className="product-edit-button" href={`${detail}#edit-product`}>수정</Link><form action={action} aria-label={`${product.name} 삭제`}><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product.id}/><input type="hidden" name="return_to_list" value="1"/><input type="hidden" name="return_query" value={q}/><input type="hidden" name="return_revenue" value={filter}/><input type="hidden" name="return_page" value={page}/><ConfirmSubmit message={`제품 “${product.name}”을 삭제할까요? 삭제 후 30일 동안 휴지통에서 복구할 수 있습니다. 연결된 특허가 있으면 먼저 연결을 해제해 주세요.`}>삭제</ConfirmSubmit></form></div>}</li>;
}
