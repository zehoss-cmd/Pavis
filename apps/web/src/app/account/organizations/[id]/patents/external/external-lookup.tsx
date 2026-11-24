'use client';
import {useActionState,useState} from 'react';
import {patentTestRecords} from '@/lib/patent-providers/test-records';
import {lookupPatent} from './actions';
import {AssetFormClient} from '../form-client';
import type {Family} from '../form-data';
import type {LookupState,PatentLookup} from '@/lib/patent-providers/types';

type Provider='kipris'|'google';
type Props={org:string;families:Family[];configured:boolean;googleConfigured?:boolean;lookup?:typeof lookupPatent};
const errors={
 invalid:'입력한 특허번호 형식을 확인해 주세요.',
 unconfigured:'선택한 제공처의 서버 인증 설정이 필요합니다.',
 provider:'검색 결과를 불러오지 못했습니다. 번호를 확인하거나 직접 등록해 주세요.',
 network:'제공기관에 연결하지 못했습니다. 잠시 후 다시 시도하거나 직접 등록해 주세요.',
 unsupported:'선택한 제공처를 사용할 수 없습니다.',
};

export function ExternalLookup({configured,googleConfigured=false,...props}:Props) {
 const [provider,setProvider]=useState<Provider>('kipris');
 return <><label htmlFor="patent-provider">데이터 제공처</label>
  <select id="patent-provider" value={provider} onChange={e=>setProvider(e.target.value==='google'?'google':'kipris')}>
   <option value="kipris">KIPRISPlus</option><option value="google">Google Patents 공개 데이터</option>
  </select>
  <ProviderLookup key={provider} {...props} provider={provider} configured={provider==='kipris'?configured:googleConfigured}/>
 </>;
}

function ProviderLookup({org,families,provider,configured,lookup=lookupPatent}:Props&{provider:Provider}) {
 const korean=provider==='kipris';
 const [number,setNumber]=useState('');
 const [mode,setMode]=useState<'lookup'|'sample'|'manual'|null>(null);
 const [state,action,pending]=useActionState(lookup,{error:null,result:null} as LookupState);
 const normalized=korean?number.replace(/[\s-]/g,''):number.trim().toUpperCase();
 const valid=korean?/^\d{13}$/.test(normalized):/^[A-Z]{2}-[A-Z0-9]{1,20}-[A-Z0-9]{1,3}$/.test(normalized);
 const manual:PatentLookup={title:'',jurisdiction:korean?'KR':normalized.slice(0,2),
  application_number:korean?normalized:'',publication_number:korean?'':normalized,registration_number:'',
  rights_holder:'',filing_date:'',source:''};
 const initial=mode==='manual'?manual:mode==='sample'?patentTestRecords[provider]:mode==='lookup'&&!pending?state.result:null;
 return <><form action={action} onSubmit={()=>setMode('lookup')} className="patent-form">
  <input type="hidden" name="organization" value={org}/><input type="hidden" name="provider" value={provider}/>
  <p>{korean?(configured?'KIPRIS API 키 설정됨':'KIPRIS API 키 설정 필요'):(configured?'Google Cloud 인증 설정됨':'Google Cloud 프로젝트와 서비스 계정 설정 필요')}</p>
  {!korean&&<p>BigQuery 조회당 처리량은 최대 1 GiB이며 사용량에 따라 비용이 발생할 수 있습니다.</p>}
  <label>{korean?'한국 출원번호':'공개번호'}<input name="number" value={number} readOnly={pending}
   onChange={e=>{setNumber(e.target.value);setMode(null);}} inputMode={korean?'numeric':'text'}
   placeholder={korean?'예: 1020050050026':'예: US-7650331-B1'} maxLength={korean?20:30} required/></label>
  <button disabled={pending||!configured}>{pending?'조회 중...':'특허 조회'}</button>
  {mode==='lookup'&&!pending&&state.error&&<p role="alert">{errors[state.error]}</p>}
  {!korean&&<p>출처: Google Patents Public Data, IFI CLAIMS Patent Services / Google, CC BY 4.0.</p>}
 </form>
 <p>출처를 직접 확인한 특허는 번호를 입력해 등록할 수 있습니다.</p>
 <button type="button" disabled={pending||!valid} onClick={()=>setMode('manual')}>입력한 번호로 직접 등록</button>
 <button type="button" disabled={pending} onClick={()=>setMode('sample')}>[TEST] 예시 레코드 열기</button>
 {initial&&<section><h2>{mode==='manual'?'특허 정보 직접 입력':mode==='sample'?'[TEST] 등록 미리보기':'조회 결과 확인'}</h2>
 <p>{mode==='sample'?'연습용 합성 데이터입니다. 특허 등록을 누르면 현재 조직에 저장됩니다.':'명칭과 정보 출처를 확인하고 등록해 주세요.'}</p>
 <AssetFormClient key={mode+initial.application_number+initial.publication_number} org={org} families={families} initial={initial}/></section>}
 </>;
}
