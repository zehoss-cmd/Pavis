import { OrganizationQuality } from '../../../../../src/app/account/organizations/[id]/patents/quality/organization-quality';
import { qualityView } from '../../../../../src/domain/patents/quality';

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const view = qualityView(new URLSearchParams(await searchParams));
  return <main><OrganizationQuality base="/test-patents" canWrite={false}
    rule={Number(view.get('rule'))} page={Number(view.get('page') ?? 1)}/></main>;
}
