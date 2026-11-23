import { notFound } from 'next/navigation';
import Link from '@/components/navigation-link';
import { LoadError } from '@/components/load-error';
import { SubmitButton } from '@/components/submit-button';
import { patentAccess } from '@/lib/patents/access';
import { requestedAssetId } from '@/lib/patents/requested-asset';
import { reviewStatusLabel } from '@/domain/products/revenue-review-history';
import { DraftForm } from '../../draft-form';
import { DcfFields } from '../dcf-fields';
import { saveDcf } from '../actions';

export default async function ProductDcf({params,searchParams}:{
  params:Promise<{id:string}>;
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}) {
  const {id}=await params;
  const query=await searchParams;
  const product=requestedAssetId(query.product),asset=requestedAssetId(query.asset);
  const {supabase,canWrite}=await patentAccess(id);
  if (!canWrite || !product || !asset) notFound();
  const [link,patent,item,annual]=await Promise.all([
    supabase.from('product_patent_links').select('contribution_rate').eq('organization_id',id).eq('product_id',product).eq('patent_id',asset).maybeSingle(),
    supabase.from('patent_assets').select('title').eq('organization_id',id).eq('id',asset).maybeSingle(),
    supabase.from('product_assets').select('name').eq('organization_id',id).eq('id',product).maybeSingle(),
    supabase.from('product_annual_revenue').select('revenue_year,revenue_amount,revenue_currency,review_status').eq('organization_id',id).eq('product_id',product).order('revenue_year',{ascending:false}),
  ]);
  if (link.error||patent.error||item.error||annual.error) return <LoadError message="평가 참고 자료를 불러오지 못했습니다."/>;
  if (!link.data||!patent.data||!item.data) notFound();
  const back=`/account/organizations/${id}/products/${product}`;
  const rate=link.data.contribution_rate;
  const selected=annual.data.find(row=>String(row.revenue_year)===query.year);
  const productName=item.data.name;
  const note=(row:typeof annual.data[number])=>`${productName} · ${row.revenue_year}년 매출 ${Number(row.revenue_amount).toLocaleString('ko-KR')} ${row.revenue_currency} · ${reviewStatusLabel(row.review_status??'not_requested')} · 특허 기여율 ${rate===null?'미입력':rate+'%'}`;
  return <main className="auth-page"><div className="auth-card patent-card">
    <Link className="asset-overview-link" href={back}>제품 상세로</Link>
    <h1>제품 매출로 금액평가 작성</h1><p>{patent.data.title} · {item.data.name}</p>
    {selected?<><h2>금액평가 초안</h2><p>{note(selected)}</p>
      <p>선택한 연도 매출을 첫해 매출의 시작값으로 사용합니다. 저장 전에 금액과 가정을 조정할 수 있습니다.</p>
      <Link href={`?product=${product}&asset=${asset}`}>연도 다시 선택</Link>
      <DraftForm key={selected.revenue_year} action={saveDcf}>
        <input type="hidden" name="organization" value={id}/><input type="hidden" name="asset" value={asset}/>
        <input type="hidden" name="operation" value="create"/>
        <DcfFields item={{base_sales:selected.revenue_amount,currency:selected.revenue_currency,contribution_rate:rate??undefined,assumptions:note(selected)}}/>
        <SubmitButton>초안 저장 및 계산</SubmitButton>
      </DraftForm></>:<><h2>참고할 매출 연도</h2>
      {annual.data.length?<ul className="asset-list">{annual.data.map(row=><li key={row.revenue_year}><p>{note(row)}</p>
        <Link className="asset-overview-link" href={`?product=${product}&asset=${asset}&year=${row.revenue_year}`}>{row.revenue_year}년 자료 적용</Link>
      </li>)}</ul>:<p>등록된 연도별 매출이 없습니다.</p>}
      <Link className="asset-overview-link" href={`/account/organizations/${id}/valuations/dcf?asset=${asset}#create-assessment`}>직접 입력으로 작성</Link>
    </>}
  </div></main>;
}
