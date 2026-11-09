import Link from 'next/link';
import { notFound } from 'next/navigation';
import { patentAccess } from '@/lib/patents/access';
import { ImportForm } from './import-form';
export default async function ImportPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params,{organization,canWrite}=await patentAccess(id);
 if(!canWrite) notFound();
 return <main className="auth-page"><Link href={`/account/organizations/${id}/patents`} className="logo">◈ <span>PAVIS</span></Link><div className="auth-card patent-card"><p className="eyebrow">CSV IMPORT</p><h1>특허 파일 가져오기</h1><p>{organization.name} · 파일을 검토한 다음 등록을 확정합니다.</p><p>UTF-8 CSV 또는 XLSX 파일을 지원하며 한 번에 최대 100건, 256KB까지 가능합니다. 발명의 명칭, 국가 코드, 출원번호는 필수입니다. 같은 조직·국가의 출원번호는 중복 등록할 수 없습니다.</p><p>날짜는 YYYY-MM-DD 형식으로 입력하세요. legal_status는 미확인, 출원 중, 등록, 거절, 취하, 만료, 소멸, 무효 또는 해당 영문 코드를 사용합니다. 권리자·발명자에 쉼표가 있으면 큰따옴표로 감싸 주세요.</p><p>XLSX는 시트 1개와 A~L 열만 지원하며 수식과 외부 연결을 사용할 수 없습니다. 출원번호 등 날짜 이외의 셀은 텍스트 서식으로 입력해 주세요. 엑셀 날짜 셀 또는 YYYY-MM-DD 텍스트 날짜를 사용할 수 있습니다.</p><p>예시 파일의 샘플 행은 실제 등록 전에 삭제하거나 수정해 주세요. 패밀리 연결은 가져온 후 특허 상세에서 설정합니다. 파일은 미리보기 후 별도로 보관하지 않습니다.</p><details><summary>CSV 열 이름 안내</summary><p>필수: title(발명의 명칭), jurisdiction(국가 코드), application_number(출원번호)</p><p>선택: publication_number(공개번호), registration_number(등록번호), rights_holder(권리자), inventors(발명자), priority_date(우선일), filing_date(출원일), legal_status(법적 상태), source(출처), verified_date(확인일)</p></details><a href={`/account/organizations/${id}/patents/import/template`} download>CSV 예시 파일 받기 </a><br/><a href={`/account/organizations/${id}/patents/import/template/xlsx`} download>XLSX 예시 파일 받기 </a><ImportForm org={id}/><Link href={`/account/organizations/${id}/patents`}> 특허 목록으로</Link></div></main>;
}
