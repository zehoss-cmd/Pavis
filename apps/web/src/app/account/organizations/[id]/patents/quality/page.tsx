import Link from '@/components/navigation-link';
import { LoadError } from '@/components/load-error';
import { patentAccess } from '@/lib/patents/access';
import { pageSize, maxPage } from '@/lib/patents/search';
import { patentQualityContext, patentQualityRules, qualityGroups, qualityView, type QualityAsset } from '@/domain/patents/quality';

import { qualityCsv } from '@/domain/patents/quality-csv';
import { OrganizationQuality } from './organization-quality';
import { qualityColumns } from '@/lib/patents/quality-columns';
import { QualityDownload } from './quality-download';

export default async function PatentQuality({params,searchParams}:{
 params:Promise<{id:string}>;
 searchParams:Promise<Record<string,string|string[]|undefined>>;
}) {
 const {id}=await params;
 const {supabase,organization,canWrite}=await patentAccess(id);
 const raw=new URLSearchParams();
 for(const [key,value] of Object.entries(await searchParams))if(typeof value==='string')raw.set(key,value);
 const view=qualityView(raw);
 const page=Number(view.get('page')??1);
 const group=Number(view.get('group')??0);
 const query=view.get('q')??'';
 const rule=Number(view.get('rule')??0);
 const byAsset=view.get('view')==='assets';
 const issuesOnly=view.get('issues')==='1';
 const base=`/account/organizations/${id}/patents`;
 if(view.get('scope')==='organization')return <main className="auth-page"><div className="auth-card patent-card">
  <h1>조직 전체 특허 품질 점검</h1>
  <p>{organization.name} · 등록된 특허 전체를 50개 규칙으로 점검합니다.</p>
  <Link className="asset-overview-link" href={base+'/quality'}>페이지별 점검으로</Link>
  <OrganizationQuality key={id} base={base} canWrite={canWrite} rule={rule} page={page}/>
 </div></main>;
 const from=(page-1)*pageSize;
 const {data,error,status}=await supabase.from('patent_assets')
  .select(qualityColumns)
  .eq('organization_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+pageSize);
 const context=patentQualityContext(new Date());
 const assets:QualityAsset[]=(data??[]).slice(0,pageSize);
 const checks=patentQualityRules.map(([number,label,check])=>({
  number,label,group:Math.ceil(number/10),matches:assets.filter(asset=>check(asset,context)),
 }));
 const findings=new Map(assets.map(asset=>[asset.id,checks.filter(check=>check.matches.includes(asset))]));
 const affected=assets.filter(asset=>findings.get(asset.id)!.length>0).length;
 const total=checks.reduce((sum,check)=>sum+check.matches.length,0);
 const shown=checks.filter(check=>(!rule||check.number===rule)&&(!group||check.group===group)
  &&check.label.toLowerCase().includes(query.toLowerCase())&&(!issuesOnly||check.matches.length>0));
 const shownRules=new Set(shown.map(check=>check.number));
 const visibleAssets=assets.map(asset=>({asset,matches:findings.get(asset.id)!.filter(check=>shownRules.has(check.number))}))
  .filter(({matches})=>!issuesOnly||matches.length>0);
 const href=(next:number)=>{
  const params=new URLSearchParams(view);
  params.delete('page');
  if(next>1)params.set('page',String(next));
  return `?${params}`;
 };
 const detail=(asset:QualityAsset)=>`${base}/${asset.id}?${new URLSearchParams({return_quality:view.toString()})}${canWrite?'#edit-patent':''}`;
 const assetLink=(asset:QualityAsset)=><Link href={detail(asset)}>{asset.title?.trim()||'제목 없는 특허'} · {asset.jurisdiction||'관할 미입력'} · {asset.application_number||'출원번호 미입력'}</Link>;
 const csv=qualityCsv(context.today,page,assets.length,checks.flatMap(check=>check.matches.map(asset=>[
  asset.id,asset.title??'',asset.jurisdiction??'',asset.application_number??'',check.label,
 ])));
 return <main className="auth-page"><div className="auth-card patent-card">
  <h1>특허 데이터 품질 점검</h1>
  <p>{organization.name} · 기준일 {context.today}</p>
  <p>현재 페이지의 특허를 점검합니다. 관할과 특허 상황에 따라 예외가 있을 수 있습니다.</p>
  <Link className="asset-overview-link" href="?scope=organization" prefetch={false}>조직 전체 점검</Link>
  <Link className="asset-overview-link" href={base}>특허 목록으로</Link>
  {error&&status!==416?<LoadError message="특허 데이터를 불러오지 못했습니다."/>:<>
   <ul aria-label="현재 페이지 점검 요약">
    <li>점검 대상 {assets.length}건</li>
    <li>보완 항목 있음 {affected}건</li>
    <li>발견 사항 없음 {assets.length-affected}건</li>
    <li>전체 발견 사항 {total}건</li>
    <li>발견 사항이 있는 규칙 {checks.filter(check=>check.matches.length>0).length}개</li>
   </ul>
   <form key={view.toString()} method="get" className="search-form">
    {page>1&&<input type="hidden" name="page" value={page}/>}
    <label>보기 방식<select name="view" defaultValue={byAsset?'assets':''}><option value="">규칙별</option><option value="assets">특허별</option></select></label>
    <label>점검 영역<select name="group" defaultValue={group||''}><option value="">전체 영역</option>{qualityGroups.map((label,i)=><option key={label} value={i+1}>{label}</option>)}</select></label>
    <label>항목명 검색<input name="q" type="search" maxLength={100} defaultValue={query}/></label>
    <label>점검 항목<select name="rule" defaultValue={rule||''}><option value="">전체 50개 항목</option>{checks.map(check=><option key={check.number} value={check.number}>{check.label}</option>)}</select></label>
    <label>발견 사항이 있는 결과만<select name="issues" defaultValue={issuesOnly?'1':''}><option value="">모두 보기</option><option value="1">발견 사항 있음</option></select></label>
    <button type="submit">보기 적용</button>
    <Link href={page>1?`?page=${page}`:'?'}>보기 초기화</Link>
   </form>
   <p>표시 규칙 {shown.length} / {checks.length}개</p>
   {total>0&&<QualityDownload csv={csv}/>}
   {!assets.length ? <p>이 페이지에 점검할 특허가 없습니다.</p>
    : byAsset ? <ul className="asset-list">{visibleAssets.map(({asset,matches})=><li key={asset.id}>
      {assetLink(asset)}<p>{matches.length}건</p>
      {matches.length>0&&<ul>{matches.map(check=><li key={check.number}>{check.label}</li>)}</ul>}
    </li>)}</ul>
    : qualityGroups.map((label,i)=>{
      const rules=shown.filter(check=>check.group===i+1);
      if(!rules.length)return null;
      return <section key={label}><h2>{label}</h2><ul className="asset-list">{rules.map(check=><li key={check.number}><details open={rule===check.number||undefined}>
       <summary>{check.label} · {check.matches.length}건</summary>
       {check.matches.length>0?<ul>{check.matches.map(asset=><li key={asset.id}>{assetLink(asset)}</li>)}</ul>:<p>현재 페이지에서 발견되지 않았습니다.</p>}
      </details></li>)}</ul></section>;
    })}
   {assets.length>0&&(byAsset?visibleAssets.length===0:shown.length===0)&&<p>이 보기 조건에 맞는 결과가 없습니다.</p>}
   <nav className="patent-pagination" aria-label="특허 품질 점검 페이지">
    {page>1&&<Link href={href(1)}>첫 페이지</Link>}
    {page>2&&<Link href={href(page-1)}>이전 페이지</Link>}
    <span aria-current="page">{page}페이지</span>
    {(data?.length??0)>pageSize&&page<maxPage&&<Link href={href(page+1)}>다음 페이지</Link>}
   </nav>
   {page===maxPage&&(data?.length??0)>pageSize&&<p>표시 가능한 페이지 한도에 도달했습니다.</p>}
  </>}
 </div></main>;
}
