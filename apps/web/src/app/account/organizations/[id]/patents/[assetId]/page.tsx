import Link from 'next/link';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { deleteAsset } from '../actions';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { AssetForm,statusLabels,type Asset,type Family } from '../form';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function PatentDetail({params,searchParams}:{params:Promise<{id:string;assetId:string}>;searchParams:Promise<{error?:string;saved?:string}>}) {
  const {id,assetId}=await params;
  if(!uuid.test(assetId)) notFound();
  const {supabase,organization,canWrite}=await patentAccess(id);
  const [{data:asset,error},{data:families,error:familyError}]=await Promise.all([supabase.from('patent_assets').select('id,family_id,title,jurisdiction,application_number,publication_number,registration_number,rights_holder,inventors,filing_date,priority_date,legal_status,source,verified_date').eq('organization_id',id).eq('id',assetId).maybeSingle(),supabase.from('patent_families').select('id,name').eq('organization_id',id).order('name').limit(200)]);
  if(error || !asset) notFound();
  const item=asset as Asset,flags=await searchParams;
  const familyList=(families || []) as Family[];
  let familyMissing=!!familyError;
  if(item.family_id && !familyList.some(f=>f.id===item.family_id)) {
    const {data:currentFamily,error:currentFamilyError}=await supabase.from('patent_families').select('id,name').eq('organization_id',id).eq('id',item.family_id).maybeSingle();
    if(currentFamilyError || !currentFamily) familyMissing=true; else familyList.push(currentFamily as Family);
  }
  return <main className="auth-page"><Link href={`/account/organizations/${id}/patents`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">PATENT DETAIL</p><h1>{item.title}</h1><p>{organization.name} · {item.jurisdiction} · {statusLabels[item.legal_status] || '미확인'}</p>{flags.saved && <p className="form-message" role="status">특허 정보를 저장했습니다.</p>}{flags.error && <p className="form-message" role="alert">{flags.error==='duplicate' ? '같은 국가에 동일한 출원번호가 이미 등록되어 있습니다.' : flags.error==='linked' ? '포트폴리오에 연결된 특허입니다. 모든 연결을 먼저 해제해 주세요.' : '작업을 완료하지 못했습니다. 입력 내용과 권한을 확인해 주세요.'}</p>}<p>출원번호: {item.application_number || '미입력'}<br/>공개번호: {item.publication_number || '미입력'} · 등록번호: {item.registration_number || '미입력'}<br/>권리자: {item.rights_holder || '미입력'} · 발명자: {item.inventors || '미입력'}<br/>우선일: {item.priority_date || '미입력'} · 출원일: {item.filing_date || '미입력'}<br/>출처: {item.source || '미입력'} · 확인일: {item.verified_date || '미입력'}</p><p>법적 상태는 입력된 정보이며 공식 확인 결과를 뜻하지 않습니다.</p>{familyMissing && <p className="form-message" role="alert">패밀리 목록을 불러오지 못했습니다.</p>}{canWrite && !familyMissing && <><h2>정보 수정</h2><AssetForm org={id} families={familyList} asset={item}/></>}{canWrite && <form action={deleteAsset}><input type="hidden" name="organization" value={id}/><input type="hidden" name="asset" value={item.id}/><ConfirmSubmit message="이 특허를 삭제할까요? 삭제 후 30일 동안 휴지통에서 복구할 수 있습니다. 포트폴리오에 연결되어 있으면 먼저 연결을 해제해야 합니다.">특허 삭제</ConfirmSubmit></form>}<Link href={`/account/organizations/${id}/patents`}>← 특허 목록으로</Link></div></main>;
}
