import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { requestedAssetId, selectedRequestedAsset } from '@/lib/patents/requested-asset';
import { currencies, parseComparisonFilter, inspectScenarioComparison } from '@/domain/valuations/scenario-comparison';

type Scenario = 'conservative' | 'base' | 'optimistic';
type RecordItem = { id:string; scenario:Scenario; currency:string; valuation_date:string; status:string; years:number; base_sales:number; growth_rate:number; royalty_rate:number; contribution_rate:number; annual_cost:number; tax_rate:number; discount_rate:number; assumptions:string|null; model_version:string; result_text:string; created_at:string; finalized_at:string|null };
const columns:{key:Scenario;label:string}[]=[{key:'conservative',label:'보수'},{key:'base',label:'기준'},{key:'optimistic',label:'낙관'}];
const dateTime=(value:string)=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value));

export default async function Compare({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{asset?:string;date?:string;currency?:string}>}) {
 const {id}=await params, query=await searchParams;
 const {supabase,organization,canWrite}=await patentAccess(id); if(!canWrite) notFound();
 const filter=parseComparisonFilter(query), submitted=Object.keys(query).length>0;
 const {data:assets,error:assetsError}=await supabase.from('patent_assets').select('id,title').eq('organization_id',id).order('title').order('id').limit(200);
 const assetOptions=[...(assets||[])];
 const assetId=requestedAssetId(query.asset);
 let requestedAssetError=false;
 if(assetId&&!assetOptions.some(asset=>asset.id===assetId)) {
  const {data:requestedAsset,error}=await supabase.from('patent_assets').select('id,title').eq('organization_id',id).eq('id',assetId).maybeSingle();
  requestedAssetError=!!error;
  if(requestedAsset) assetOptions.push(requestedAsset);
 }
 const selectedAsset=selectedRequestedAsset(assetId,assetOptions);
 let records:RecordItem[]=[];let recordsError=false;let truncated=false;
 if(filter&&selectedAsset) {
  const {data,error}=await supabase.from('royalty_dcf_assessments').select('id,scenario,currency,valuation_date,status,years,base_sales,growth_rate,royalty_rate,contribution_rate,annual_cost,tax_rate,discount_rate,assumptions,model_version,result_text,created_at,finalized_at').eq('organization_id',id).eq('asset_id',filter.asset).eq('valuation_date',filter.date).eq('currency',filter.currency).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(301);
  recordsError=!!error; truncated=(data?.length||0)>300; records=(data||[]).slice(0,300) as RecordItem[];
 }
 const inspection=inspectScenarioComparison(records,truncated);
 const scenarioLabel=(key:string)=>columns.find(column=>column.key===key)?.label||'미확인';
 return <main className="auth-page"><Link href={`/account/organizations/${id}/valuations/dcf`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">ROYALTY DCF · SCENARIO COMPARISON</p><h1>가치평가 시나리오 비교</h1><p>{organization.name} · 같은 특허, 평가 기준일, 통화의 기록을 비교합니다.</p><p>보수·기준·낙관 결과는 각각 별도 평가입니다. 같은 분류에 기록이 여러 개면 모두 표시하며 작성 시각과 확정 여부를 확인하세요. 금액을 합산하거나 자동으로 최신 기록을 선택하지 않습니다.</p><form method="get"><label>대상 특허<select name="asset" required defaultValue={selectedAsset}><option value="">특허 선택</option>{assetOptions.map(asset=><option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label><label>평가 기준일<input type="date" name="date" required defaultValue={filter?.date||''}/></label><label>통화<select name="currency" required defaultValue={filter?.currency||''}><option value="">통화 선택</option>{currencies.map(currency=><option key={currency} value={currency}>{currency}</option>)}</select></label><SubmitButton>시나리오 비교</SubmitButton></form><p>특허명 순 최대 200건과 요청한 특허를 선택할 수 있습니다. 시간 표시는 한국 시간입니다.</p>{assetsError&&<p role="alert" className="form-message">특허 목록을 불러오지 못했습니다.</p>}{requestedAssetError&&<p role="alert" className="form-message">요청한 특허를 불러오지 못했습니다.</p>}{filter&&!selectedAsset&&!requestedAssetError&&<p role="alert" className="form-message">요청한 특허를 선택할 수 없습니다. 특허를 다시 선택해 주세요.</p>}{submitted&&!filter&&<p role="alert" className="form-message">특허, 유효한 기준일과 통화를 모두 선택해 주세요.</p>}{recordsError&&<p role="alert" className="form-message">평가 기록을 불러오지 못했습니다.</p>}{filter&&selectedAsset&&!recordsError&&<><p>기준일 {filter.date} · 통화 {filter.currency} · {records.length}건{truncated?' (최근 300건만 표시)':''}</p>{truncated&&<p role="alert">기록이 300건을 초과하여 일부가 표시되지 않습니다. 아래 안내는 표시된 기록에만 적용됩니다.</p>}{records.length>0&&<section className="scenario-review" aria-labelledby="scenario-review-title"><h2 id="scenario-review-title">비교 전 확인</h2><p>표시된 기록: 보수 {inspection.counts.conservative}건 · 기준 {inspection.counts.base}건 · 낙관 {inspection.counts.optimistic}건</p><ul>{inspection.missing.length>0&&<li>{inspection.missing.map(scenarioLabel).join('·')} 시나리오의 기록이 없습니다.</li>}{inspection.repeated.length>0&&<li>{inspection.repeated.map(scenarioLabel).join('·')} 시나리오에 여러 기록이 있습니다. 비교할 기록을 직접 확인해 주세요.</li>}{inspection.mixedVersions&&<li>서로 다른 평가모델 버전이 포함되어 있습니다. 계산 방식과 가정을 확인해 주세요.</li>}{inspection.mixedStatus&&<li>초안과 확정 평가가 함께 표시됩니다. 확정 여부를 확인해 주세요.</li>}<li>각 금액은 별도 가정의 결과이며 합산하지 않습니다. 특허·패밀리 간 평가액도 중복 수익을 확인하기 전에는 합산할 수 없습니다.</li></ul></section>}<div className="scenario-grid">{columns.map(column=><section key={column.key} className="scenario-column" aria-label={`${column.label} 시나리오`}><h2>{column.label}</h2>{records.some(item=>item.scenario===column.key)?records.filter(item=>item.scenario===column.key).map(item=><article className="scenario-card" key={item.id}><strong>{item.result_text} {item.currency}</strong><p>{item.status==='final'?'확정':'초안'} · {item.model_version}</p><p>작성 {dateTime(item.created_at)}{item.finalized_at&&<> · 확정 {dateTime(item.finalized_at)}</>}</p><dl><div><dt>예측 기간</dt><dd>{item.years}년</dd></div><div><dt>첫해 매출</dt><dd>{item.base_sales} {item.currency}</dd></div><div><dt>성장률</dt><dd>{item.growth_rate}%</dd></div><div><dt>로열티율</dt><dd>{item.royalty_rate}%</dd></div><div><dt>특허 기여도</dt><dd>{item.contribution_rate}%</dd></div><div><dt>연 비용</dt><dd>{item.annual_cost} {item.currency}</dd></div><div><dt>세율</dt><dd>{item.tax_rate}%</dd></div><div><dt>할인율</dt><dd>{item.discount_rate}%</dd></div></dl><p>가정의 근거: {item.assumptions||'미입력'}</p><Link href={`/account/organizations/${id}/valuations/dcf/${item.id}`}>연도별 계산 근거 </Link></article>):<p>해당하는 평가가 없습니다.</p>}</section>)}</div></>}<p>결과는 입력 가정에 따른 추정치이며, 권리기간과 각 가정의 타당성을 별도로 확인해야 합니다.</p><Link href={`/account/organizations/${id}/valuations/dcf`}> 평가 작성 및 수정</Link></div></main>;
}
