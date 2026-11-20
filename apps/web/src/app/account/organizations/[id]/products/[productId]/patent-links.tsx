import Link from '@/components/navigation-link';
import { LoadError } from '@/components/load-error';
import { patentAccess } from '@/lib/patents/access';
import { literalSearchPattern } from '@/lib/patents/search';
import { parsePortfolioPage, parsePortfolioAssetQuery, portfolioPageSize, portfolioMaxPage } from '@/lib/portfolios/pagination';
import { changeProductPatent } from '../actions';
import { ContributionForm } from './contribution-form';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { BulkPatentForm } from './bulk-patent-form';
import { parseProductPatentSearchField } from '@/domain/products/patent-search';
import { PatentChoiceSearch } from './patent-choice-search';
import { patentChoiceEmpty } from '@/domain/products/patent-choice-empty';
type Flags={asset_field?:string|string[];asset_query?:string|string[];choice_page?:string|string[];linked_page?:string|string[];linked?:string;unlinked?:string;link_error?:string};
export async function ProductPatentLinks({org,product,canWrite,supabase,flags,returnSearch}:{org:string;product:string;canWrite:boolean;supabase:Awaited<ReturnType<typeof patentAccess>>['supabase'];flags:Flags;returnSearch:string}) {
 const page=parsePortfolioPage(flags.linked_page),choicePage=parsePortfolioPage(flags.choice_page),q=parsePortfolioAssetQuery(flags.asset_query),field=parseProductPatentSearchField(flags.asset_field),size=portfolioPageSize;
 let candidates=supabase.from('patent_assets').select('id,title,jurisdiction,application_number').eq('organization_id',org);
 if(q)candidates=candidates.ilike(field,literalSearchPattern(q));
 const [linkResult,choiceResult]=await Promise.all([
  supabase.from('product_patent_links').select('patent_id,contribution_rate,patent_assets(id,title,jurisdiction,application_number)',{count:'exact'}).eq('organization_id',org).eq('product_id',product).order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*size,page*size),
  canWrite?candidates.order('created_at',{ascending:false}).order('id',{ascending:false}).range((choicePage-1)*size,choicePage*size):Promise.resolve({data:[],error:null}),
 ]);
 const choices=(choiceResult.data||[]).slice(0,size),choiceIds=choices.map(a=>a.id);
 const linkedChoices=canWrite&&choiceIds.length?await supabase.from('product_patent_links').select('patent_id').eq('organization_id',org).eq('product_id',product).in('patent_id',choiceIds):{data:[],error:null};
 const existing=new Set((linkedChoices.data||[]).map(a=>a.patent_id));
 const available=choices.filter(a=>!existing.has(a.id));
 const pageLink=(nextPage:number,nextChoice:number)=>{const p=new URLSearchParams(returnSearch);if(q){p.set('asset_query',q);if(field!=='title')p.set('asset_field',field);}if(nextPage>1)p.set('linked_page',String(nextPage));if(nextChoice>1)p.set('choice_page',String(nextChoice));return `?${p.toString()}#product-patents`;};
 const empty=patentChoiceEmpty({page:choicePage,query:q,rows:choices.length,hasNext:(choiceResult.data?.length||0)>size,maxPage:portfolioMaxPage});
 const emptyHref=empty.action==='next'?pageLink(page,choicePage+1):empty.action==='previous'?pageLink(page,choicePage-1):empty.action==='reset'?`?${returnSearch}#product-patents`:empty.action==='register'?`/account/organizations/${org}/patents#register-patent`:undefined;
 return <section id="product-patents"><h2>관련 특허</h2><p>제품과 관련된 특허를 연결해 관리하세요. 기여율은 해당 제품에 대한 각 특허의 기여 정도를 사용자가 입력한 참고 정보입니다. 가치평가에 자동 반영되지 않습니다. 비워 두면 미입력이며 0%와 다릅니다. 특허별 기여율은 각각 관리하며 합계를 제한하지 않습니다.</p>
 {(flags.linked||flags.unlinked)&&<p className="form-message" role="status">{flags.linked?(Number(flags.linked)>1?`${Number(flags.linked)}건의 특허를 연결했습니다.`:'특허를 연결했습니다.'):'특허 연결을 해제했습니다.'}</p>}{flags.link_error&&<p className="form-message" role="alert">{flags.link_error==='duplicate'?'이미 연결된 특허입니다.':'연결을 변경하지 못했습니다. 권한과 대상을 확인해 주세요.'}</p>}
 {linkResult.error?<LoadError message="연결된 특허를 불러오지 못했습니다."/>:<><p>연결된 특허 {linkResult.count??0}건</p>{linkResult.data?.length?<ul className="asset-list">{linkResult.data.slice(0,size).map(row=>{const asset=Array.isArray(row.patent_assets)?row.patent_assets[0]:row.patent_assets;return asset?<li key={row.patent_id}><Link href={`/account/organizations/${org}/patents/${row.patent_id}`}><strong>{asset.title}</strong><span>{asset.jurisdiction} · {asset.application_number||'출원번호 미입력'}</span></Link>{canWrite?<ContributionForm org={org} product={product} patent={row.patent_id} title={asset.title} initial={row.contribution_rate}/>:<p>기여율: {row.contribution_rate===null?'미입력':`${row.contribution_rate}%`}</p>}{canWrite&&<form action={changeProductPatent}><input type="hidden" name="return_context" value={returnSearch}/><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product}/><input type="hidden" name="patent" value={row.patent_id}/><input type="hidden" name="operation" value="remove"/><ConfirmSubmit message={`“${asset.title}” 연결을 해제할까요? 저장된 기여율도 삭제됩니다. 제품과 특허는 삭제되지 않습니다.`}>연결 해제</ConfirmSubmit></form>}</li>:null;})}</ul>:<p>{page>1?'이 페이지에 연결된 특허가 없습니다.':'아직 연결된 특허가 없습니다.'}</p>}{(page>1||(linkResult.data?.length||0)>size)&&<nav className="patent-pagination" aria-label="연결된 특허 페이지">{page>1&&<Link href={pageLink(page-1,choicePage)}>이전</Link>}<span>{page}페이지</span>{(linkResult.data?.length||0)>size&&page<portfolioMaxPage&&<Link href={pageLink(page+1,choicePage)}>다음</Link>}</nav>}</>}
 {canWrite&&<><h3>특허 연결</h3><PatentChoiceSearch key={`${field}:${q}`} field={field} query={q} linkedPage={page} returnSearch={returnSearch}/><BulkPatentForm key={`${org}:${product}`} org={org} product={product} choices={available} loadError={!!(choiceResult.error||linkedChoices.error)} empty={{...empty,href:emptyHref}}/>{!choiceResult.error&&(choicePage>1||(choiceResult.data?.length||0)>size)&&<nav className="patent-pagination" aria-label="연결할 특허 페이지">{choicePage>1&&<Link href={pageLink(page,choicePage-1)}>이전</Link>}<span>{choicePage}페이지</span>{(choiceResult.data?.length||0)>size&&choicePage<portfolioMaxPage&&<Link href={pageLink(page,choicePage+1)}>다음</Link>}</nav>}<p>제품 또는 특허를 삭제하려면 먼저 이 연결을 해제해 주세요. 연결 해제는 제품이나 특허를 삭제하지 않습니다.</p></>}
 </section>;
}
