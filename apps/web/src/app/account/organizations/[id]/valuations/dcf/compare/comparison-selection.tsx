'use client';

import {useState,type ReactNode} from 'react';
import {SubmitButton} from '@/components/submit-button';
import type {ComparisonFilter} from '@/domain/valuations/scenario-comparison';

export function ComparisonSelection({options,first,second,invalidRequest,filter,assetQuery,assetPage,children}:{
  options:{id:string;label:string}[];first:string;second:string;invalidRequest:boolean;
  filter:ComparisonFilter;assetQuery:string;assetPage:number;children:ReactNode;
}) {
  const [pair,setPair]=useState({first,second});
  const [search,setSearch]=useState('');
  const terms=search.toLocaleLowerCase('ko-KR').trim().split(/\s+/).filter(Boolean);
  const matches=options.filter(option=>{
    const text=(option.label+' '+option.id).toLocaleLowerCase('ko-KR');
    return terms.every(term=>text.includes(term));
  });
  const valid=Boolean(pair.first&&pair.second&&pair.first!==pair.second);
  const applied=pair.first===first&&pair.second===second;
  let message='';
  if (invalidRequest&&applied) message='조회할 수 없는 기록이 있습니다. 현재 목록에서 선택해 주세요.';
  else if (pair.first&&pair.first===pair.second) message='서로 다른 두 기록을 선택해 주세요.';
  else if (!pair.first) message='기준 기록을 선택해 주세요.';
  else if (!pair.second) message='비교할 두 번째 기록을 선택해 주세요.';
  else if (!applied) message='차이 확인을 누르면 새 선택의 결과를 볼 수 있습니다.';
  function choices(selected:string) {
    const pinned=options.find(option=>option.id===selected&&!matches.includes(option));
    return <>
      {pinned&&<optgroup label="현재 선택"><option value={pinned.id}>{pinned.label}</option></optgroup>}
      {matches.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
    </>;
  }
  return <>
    <label htmlFor="record-search">비교 후보 검색</label>
    <input id="record-search" type="search" value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="시나리오, 초안·확정, 금액 또는 기록 ID"/>
    {search&&<button type="button" onClick={()=>setSearch('')}>후보 검색 초기화</button>}
    <p role="status">검색 결과 {matches.length} / {options.length}건 · 작성 시각은 한국 시간입니다.</p>
    <form method="get" action="#record-difference">
      {Object.entries(filter).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
      {assetQuery&&<input type="hidden" name="asset_query" value={assetQuery}/>}
      {assetPage>1&&<input type="hidden" name="asset_page" value={assetPage}/>}
      <label htmlFor="first-record">기준 기록</label>
      <select id="first-record" name="first" required value={pair.first} onChange={e=>setPair({...pair,first:e.target.value})}>
        <option value="">기록 선택</option>{choices(pair.first)}
      </select>
      <label htmlFor="second-record">비교 기록</label>
      <select id="second-record" name="second" required value={pair.second} onChange={e=>setPair({...pair,second:e.target.value})}>
        <option value="">기록 선택</option>{choices(pair.second)}
      </select>
      <button type="button" disabled={!valid} onClick={()=>setPair({first:pair.second,second:pair.first})}>기준·비교 바꾸기</button>
      <SubmitButton disabled={!valid}>차이 확인</SubmitButton>
    </form>
    <p role="status">{message}</p>
    {valid&&applied&&children}
  </>;
}
