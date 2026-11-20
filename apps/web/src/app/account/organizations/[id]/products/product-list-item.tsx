import Link from '@/components/navigation-link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import type { Product } from '@/domain/products/validation';
import { previousRevenueYear, type RevenueFilter } from '@/domain/products/revenue-filter';
import { deleteProduct } from './actions';
export function ProductListItem({org,product,canWrite,q,filter,page,previousYear=previousRevenueYear(new Date()),action=deleteProduct}:{org:string;product:Product;canWrite:boolean;q:string;filter:RevenueFilter;page:number;previousYear?:number;action?:(form:FormData)=>Promise<void>}) {
 const detail=`/account/organizations/${org}/products/${product.id}${filter?`?return_revenue=${filter}`:''}`;
 const outdated=product.revenue_amount!==null&&product.revenue_year!==null&&product.revenue_year<previousYear;
 const needsRevenue=product.revenue_amount===null||outdated;
 return <li className="product-list-item"><Link className="product-list-summary" href={detail}><strong>{product.name}</strong><span>출시 {product.launch_year?`${product.launch_year}년`:'미입력'} · {product.revenue_amount!==null?`${product.revenue_year}년 매출 ${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(product.revenue_amount)} ${product.revenue_currency}`:'매출 미입력'}{outdated&&' · 기준연도 확인'}</span></Link><div className="product-list-actions"><Link className="product-edit-button" href={`${detail}#valuation-readiness`} aria-label={`${product.name} 평가 준비 현황`}>평가 준비</Link>{canWrite&&<><Link className="product-edit-button" href={`${detail}#edit-product`}>{needsRevenue?'매출 보완':'수정'}</Link><form action={action} aria-label={`${product.name} 삭제`}><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product.id}/><input type="hidden" name="return_to_list" value="1"/><input type="hidden" name="return_query" value={q}/><input type="hidden" name="return_revenue" value={filter}/><input type="hidden" name="return_page" value={page}/><ConfirmSubmit message={`제품 “${product.name}”을 삭제할까요? 삭제 후 30일 동안 휴지통에서 복구할 수 있습니다. 연결된 특허가 있으면 먼저 연결을 해제해 주세요.`}>삭제</ConfirmSubmit></form></>}</div></li>;
}
