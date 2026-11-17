import Link from '@/components/navigation-link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { LoadError } from '@/components/load-error';
import { PatentMap, type GeographyRow } from './patent-map';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function Intelligence({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{family?:string | string[]}>}) {
 const {id}=await params, flags=await searchParams;
 const {supabase,organization}=await patentAccess(id);
 if (flags.family !== undefined && (typeof flags.family !== 'string' || !uuid.test(flags.family))) notFound();
 const familyId=typeof flags.family==='string' ? flags.family : '';
 let familyName='';
 if (familyId) {
  const {data,error}=await supabase.from('patent_families').select('name').eq('organization_id',id).eq('id',familyId).maybeSingle();
  if (error) return <main className="dashboard"><LoadError message="패밀리를 불러오지 못했습니다."/></main>;
  if (!data) notFound();
  familyName=data.name;
 }
 const {data,error}=await supabase.rpc('patent_geography_summary',{p_organization:id,p_family:familyId || null});
 return <main className="dashboard patent-map-page"><div className="dashboard-heading"><div><p className="workspace-kicker">BUSINESS INTELLIGENCE</p><h1>국가별 특허 포트폴리오 지도</h1><p>{organization.name}{familyName ? ` · ${familyName} 패밀리` : ' · 전체 특허'}</p></div></div>
 <p className="map-intro">국가를 선택해 출원·등록 정보와 법적 상태를 살펴보고 특허 목록으로 이동하세요.</p>
 <div className="map-context">{familyId ? <><span>패밀리 기준</span><Link href={`/account/organizations/${id}/intelligence`}>전체 특허 보기</Link><Link href={`/account/organizations/${id}/patents/families/${familyId}`}>패밀리로 돌아가기</Link></> : <Link href={`/account/organizations/${id}/patents/families`}>패밀리 선택하기</Link>}</div>
 {error || !data ? <LoadError message="국가별 특허 정보를 불러오지 못했습니다."/> : <PatentMap organizationId={id} familyId={familyId} countries={data as GeographyRow[]}/>}
 <p className="map-note">출원·등록 건수는 해당 번호가 입력된 특허 수이며, 권리 상태는 입력된 정보입니다. 공식 등록이나 권리 유효성을 보증하지 않습니다. 지도 표식은 국가의 대표 위치이며 권리 범위를 나타내지 않습니다. 지도에 표시되지 않는 관할 코드도 아래 목록에서 확인할 수 있습니다. 표식 위치 데이터: <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">World countries (ODbL)</a> · <a href="https://github.com/zehoss-cmd/Pavis/blob/main/apps/web/src/lib/patents/country-coordinates.json" target="_blank" rel="noreferrer">가공 좌표 데이터</a>.</p>
 </main>;
}
