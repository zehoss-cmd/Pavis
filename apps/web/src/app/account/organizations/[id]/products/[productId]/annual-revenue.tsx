import Link from '@/components/navigation-link';
import { LoadError } from '@/components/load-error';
import { productDetailContext, productReturnContext } from '@/domain/products/revenue-filter';
import { reviewStatusLabel } from '@/domain/products/revenue-review-history';
import type { Product } from '@/domain/products/validation';

export type AnnualRevenueRow = {
  revenue_year:number; revenue_amount:number; revenue_currency:string;
  revenue_revision:number; review_status:string|null;
};
const amount = new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});

export function AnnualRevenue({org,product,revision,rows,failed,canWrite,context}:{
  org:string; product:Product; revision:number; rows:AnnualRevenueRow[];
  failed:boolean; canWrite:boolean; context:ReturnType<typeof productReturnContext>;
}) {
  const path = `/account/organizations/${org}/products/${product.id}`;
  const params = productDetailContext(context.q,context.filter,String(context.page));
  return <section id="annual-revenue" aria-labelledby="annual-revenue-title">
    <h2 id="annual-revenue-title">연도별 매출</h2>
    {failed ? <LoadError message="연도별 매출을 불러오지 못했습니다."/> : rows.length ? <>
      <p>연도별 마지막 저장 금액과 해당 금액의 검토 상태를 표시합니다.</p>
      <ul className="audit-list">{rows.map(row=>{
        const current = row.revenue_year===product.revenue_year && row.revenue_revision===revision;
        const reviewParams = new URLSearchParams(params);
        reviewParams.set('year',String(row.revenue_year));
        const editParams = new URLSearchParams(params);
        editParams.set('revenue_edit_year',String(row.revenue_year));
        return <li key={row.revenue_year}>
          <strong>{row.revenue_year}년 · {amount.format(row.revenue_amount)} {row.revenue_currency}</strong>
          <span>{current?'현재 매출':'이전 기록'} · {reviewStatusLabel(row.review_status??'not_requested')}</span>
          <nav className="patent-actions" aria-label={`${row.revenue_year}년 매출 작업`}>
            <Link className="asset-overview-link" href={`${path}/review-history?${reviewParams}`}>검토 이력 보기</Link>
            {canWrite&&!current&&<Link className="asset-overview-link" href={`${path}?${editParams}#edit-product`}>정보 수정에 불러오기</Link>}
          </nav>
        </li>;
      })}</ul>
    </> : <p>저장된 매출이 없습니다.</p>}
    {canWrite&&<Link className="asset-overview-link" href={`${path}${params.size?`?${params}`:''}#edit-product`}>매출 입력하러 가기</Link>}
  </section>;
}
