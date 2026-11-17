import { RevenueReviewForm } from '../../../../../src/components/revenue-review-form';
import { mockRevenueRequest,mockRevenueDecision } from '../actions';
export default function Page(){return <main><h1>매출 검토 오류 복구</h1><section aria-label="검토 요청"><RevenueReviewForm action={mockRevenueRequest} mode="request" org="test" product="test"/></section><section aria-label="검토 결정"><RevenueReviewForm action={mockRevenueDecision} mode="decision" id="test"/></section></main>;}
