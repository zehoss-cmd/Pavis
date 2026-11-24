'use client';
import {useActionState,useState} from 'react';
import {patentTestRecords} from '@/lib/patent-providers/test-records';
import {lookupPatent} from './actions';
import {AssetFormClient} from '../form-client';
import type { Family } from '../form-data';
import type { LookupState } from '@/lib/patent-providers/types';
export function ExternalLookup({org,families,configured,googleConfigured=false,lookup=lookupPatent}:{org:string;families:Family[];configured:boolean;googleConfigured?:boolean;lookup?:typeof lookupPatent}) {
 const [provider,setProvider]=useState<'kipris'|'google'>('kipris');
 const [sample,setSample]=useState(false);
 const [state,action,pending]=useActionState(lookup,{error:null,result:null} as LookupState);
 const errors={invalid:'입력한 특허번호 형식을 확인해 주세요.',unconfigured:'선택한 제공처의 서버 인증 설정이 필요합니다.',provider:'검색 결과가 없거나 제공기관이 요청을 처리하지 못했습니다. 번호와 API 이용 권한을 확인해 주세요.',network:'제공기관에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',unsupported:'Google Patents 공개 데이터는 BigQuery 프로젝트와 인증 설정이 필요하며, 이 연결은 아직 준비 중입니다.'};
 return <><form action={action} onSubmit={()=>setSample(false)} className="patent-form"><input type="hidden" name="organization" value={org}/><label>데이터 제공처<select name="provider" value={provider} onChange={e=>{setProvider(e.target.value==='google'?'google':'kipris');setSample(false);}}><option value="kipris">KIPRISPlus</option><option value="google">Google Patents 공개 데이터</option></select></label>{provider==='kipris'?<><p>{configured?'KIPRIS API 키 설정됨':'KIPRIS API 키 설정 필요'}</p><label>한국 출원번호<input name="number" inputMode="numeric" placeholder="예: 1020050050026" maxLength={20} required/></label><button disabled={pending}>{pending?'조회 중...':'특허 조회'}</button></>:<><p>{googleConfigured?'Google Cloud 인증 설정됨':'Google Cloud 프로젝트와 서비스 계정 설정 필요'}</p><p>BigQuery 사용량에 따라 비용이 발생할 수 있습니다. 조회당 처리량은 최대 1 GiB로 제한됩니다.</p><label>공개번호<input name="number" placeholder="예: US-7650331-B1" maxLength={30} required/></label><button disabled={pending}>{pending?'조회 중...':'특허 조회'}</button><p>출처: Google Patents Public Data, IFI CLAIMS Patent Services / Google, CC BY 4.0.</p></>}{!sample&&state.error&&<p role="alert" className="form-message">{errors[state.error]}</p>}</form>
 <button type="button" disabled={pending} onClick={()=>setSample(true)}>[TEST] 예시 레코드 열기</button>
 {sample&&<section><h2>[TEST] 등록 미리보기</h2><p>연습용 합성 데이터입니다. 특허 등록을 누르면 현재 조직에 저장됩니다.</p>
 <AssetFormClient key={provider} org={org} families={families} initial={patentTestRecords[provider]}/></section>}
 {!sample&&state.result&&((provider==='kipris'&&state.result.source==='KIPRISPlus')||(provider==='google'&&state.result.source.startsWith('Google Patents')))&&<section><h2>조회 결과 확인</h2><p>가져온 정보를 확인·수정한 뒤 특허 등록 버튼을 눌러주세요. 권리자와 법적 상태는 공식 원문에서 별도로 확인해 입력해 주세요.</p><AssetFormClient key={`${state.result.source}:${state.result.application_number}:${state.result.publication_number}`} org={org} families={families} initial={state.result}/></section>}</>;
}
