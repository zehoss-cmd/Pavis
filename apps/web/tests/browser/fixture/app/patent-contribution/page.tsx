import { ContributionForm } from '../../../../../src/app/account/organizations/[id]/products/[productId]/contribution-form';
import { mockContributionSave } from '../actions';
export default function Page(){return <main><h1>특허 기여율 검사</h1><section aria-label="첫 특허"><ContributionForm org="org" product="product" patent="patent1" title="첫 특허" initial={null} action={mockContributionSave}/></section><section aria-label="둘째 특허"><ContributionForm org="org" product="product" patent="patent2" title="둘째 특허" initial={0} action={mockContributionSave}/></section></main>;}
