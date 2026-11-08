import Link from 'next/link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { changeAssignment, managePortfolio } from '../actions';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Asset={id:string;title:string;jurisdiction:string;application_number:string|null};
export default async function PortfolioDetail({params,searchParams}:{params:Promise<{id:string;portfolioId:string}>;searchParams:Promise<{error?:string;created?:string;added?:string;removed?:string;updated?:string}>}) {
  const {id,portfolioId}=await params,flags=await searchParams;
  if(!uuid.test(portfolioId)) notFound();
  const {supabase,organization,canWrite}=await patentAccess(id);
  const [{data:portfolio,error:portfolioError},{data:links,error:linksError},{data:choices,error:choicesError}]=await Promise.all([
    supabase.from('patent_portfolios').select('id,name,description').eq('organization_id',id).eq('id',portfolioId).maybeSingle(),
    supabase.from('patent_portfolio_assets').select('asset_id').eq('organization_id',id).eq('portfolio_id',portfolioId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),
    canWrite ? supabase.from('patent_assets').select('id,title,jurisdiction,application_number').eq('organization_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200) : Promise.resolve({data:[],error:null}),
  ]);
  if(portfolioError) throw new Error('포트폴리오를 불러오지 못했습니다.');
  if(!portfolio) notFound();
  const ids=(links || []).map(link=>link.asset_id);
  const {data:assets,error:assetsError}=ids.length ? await supabase.from('patent_assets').select('id,title,jurisdiction,application_number').eq('organization_id',id).in('id',ids) : {data:[],error:null};
  const byId=new Map(((assets || []) as Asset[]).map(a=>[a.id,a]));
  const available=((choices || []) as Asset[]).filter(a=>!ids.includes(a.id));
  const hasError=linksError || assetsError;
  return <main className="auth-page"><Link href={`/account/organizations/${id}/portfolios`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">PATENT PORTFOLIO</p><h1>{portfolio.name}</h1><p>{organization.name} · {portfolio.description || '설명 없음'}</p>{(flags.created||flags.added||flags.removed||flags.updated) && <p className="form-message" role="status">{flags.created?'포트폴리오를 만들었습니다.':flags.added?'특허를 연결했습니다.':flags.updated?'포트폴리오를 수정했습니다.':'포트폴리오에서 연결을 해제했습니다.'}</p>}{flags.error && <p className="form-message" role="alert">{flags.error==='duplicate'?'이미 연결된 특허입니다.':flags.error==='linked'?'연결된 특허가 있습니다. 모든 연결을 먼저 해제해 주세요.':'작업을 완료하지 못했습니다. 권한과 정보를 확인해 주세요.'}</p>}<h2>연결된 특허</h2><p>최근 연결순 · 최대 100건 표시</p>{hasError ? <p className="form-message" role="alert">연결된 특허를 불러오지 못했습니다.</p> : ids.length ? <ul className="asset-list">{ids.map(assetId=>{const asset=byId.get(assetId);return asset ? <li key={assetId}><Link href={`/account/organizations/${id}/patents/${asset.id}`}><strong>{asset.title}</strong><span>{asset.jurisdiction} · {asset.application_number || '출원번호 미입력'}</span></Link>{canWrite && <form action={changeAssignment}><input type="hidden" name="organization" value={id}/><input type="hidden" name="portfolio" value={portfolioId}/><input type="hidden" name="asset" value={asset.id}/><input type="hidden" name="operation" value="remove"/><button type="submit">연결 해제</button></form>}</li> : null})}</ul> : <p>연결된 특허가 없습니다.</p>}
  {canWrite && <><h2>특허 연결</h2><p>최근 등록된 특허 200건에서 선택할 수 있습니다. 연결 해제는 특허 자체를 삭제하지 않습니다.</p>{choicesError || linksError ? <p className="form-message" role="alert">특허 선택 목록을 불러오지 못했습니다.</p> : available.length ? <form action={changeAssignment}><input type="hidden" name="organization" value={id}/><input type="hidden" name="portfolio" value={portfolioId}/><input type="hidden" name="operation" value="add"/><label>연결할 특허<select name="asset" required defaultValue=""><option value="" disabled>특허를 선택하세요</option>{available.map(a=><option key={a.id} value={a.id}>{a.title} · {a.jurisdiction} · {a.application_number || '번호 미입력'}</option>)}</select></label><button type="submit">특허 연결</button></form> : <p>연결할 수 있는 최근 특허가 없습니다.</p>}</>}
  {canWrite && <><h2>포트폴리오 수정</h2><form action={managePortfolio}><input type="hidden" name="organization" value={id}/><input type="hidden" name="portfolio" value={portfolioId}/><input type="hidden" name="operation" value="update"/><label>이름<input name="name" maxLength={200} defaultValue={portfolio.name} required/></label><label>설명<input name="description" maxLength={500} defaultValue={portfolio.description || ''}/></label><button type="submit">변경 저장</button></form><form action={managePortfolio}><input type="hidden" name="organization" value={id}/><input type="hidden" name="portfolio" value={portfolioId}/><input type="hidden" name="operation" value="delete"/><ConfirmSubmit message="이 포트폴리오를 삭제할까요? 30일 내에 복구할 수 있으며 연결된 특허가 있으면 먼저 연결을 해제해야 합니다.">포트폴리오 삭제</ConfirmSubmit></form></>}<Link href={`/account/organizations/${id}/portfolios`}>← 포트폴리오 목록으로</Link></div></main>;
}
