import Link from '@/components/navigation-link';
import { reviewStatusLabel } from '@/domain/products/revenue-review-history';

type Props = {
  revenueYear: number | null;
  hasRevenue: boolean;
  previousYear: number;
  reviewStatus: string | null;
  linkedCount: number | null;
  missingCount: number | null;
  canWrite: boolean;
  valuationHref?: string;
};

export function ValuationReadiness({
  revenueYear, hasRevenue, previousYear, reviewStatus, linkedCount, missingCount, canWrite, valuationHref,
}: Props) {
  return (
    <section id="valuation-readiness" aria-labelledby="valuation-readiness-title">
      <h2 id="valuation-readiness-title">가치평가 준비 현황</h2>
      <dl>
        <dt>매출 기준연도</dt>
        <dd>{hasRevenue && revenueYear
          ? `${revenueYear}년${revenueYear < previousYear ? ' · 전년도보다 오래된 자료' : ''}`
          : '미입력'}</dd>
        <dt>현재 매출의 검토 상태</dt>
        <dd>{reviewStatus === null ? '불러오지 못했습니다' : reviewStatusLabel(reviewStatus)}</dd>
        <dt>연결된 특허</dt>
        <dd>{linkedCount === null ? '불러오지 못했습니다' : `${linkedCount}건`}</dd>
        <dt>기여율 미입력</dt>
        <dd>{missingCount === null ? '불러오지 못했습니다' : `${missingCount}건 (0% 입력 제외)`}</dd>
      </dl>
      <p>이 현황은 평가에 필요한 자료를 확인하는 데 사용합니다. 매출과 기여율은 평가에 자동 반영되지 않습니다.</p>
      <nav className="patent-actions" aria-label="가치평가 준비 바로가기">
        {canWrite && <Link className="asset-overview-link" href="#edit-product">매출 정보 수정</Link>}
        <Link className="asset-overview-link" href="#revenue-review">매출 검토 보기</Link>
        <Link className="asset-overview-link" href="#product-patents">연결 특허 및 기여율 보기</Link>
        {valuationHref && <Link className="asset-overview-link" href={valuationHref}>가치평가 열기</Link>}
      </nav>
    </section>
  );
}
