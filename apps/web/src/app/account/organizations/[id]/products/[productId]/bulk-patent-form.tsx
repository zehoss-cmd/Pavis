'use client';
import { useActionState,useState } from 'react';
import type { BulkPatentState } from '@/domain/products/bulk-patents';
import type { ProductPatentSearchField } from '@/domain/products/patent-search';
import { bulkConnectPatents } from '../actions';
type Choice={id:string;title:string;jurisdiction:string;application_number:string|null};
type Action=(state:BulkPatentState,form:FormData)=>Promise<BulkPatentState>;
export function BulkPatentForm({org,product,choices,query,field='title',choicePage,linkedPage,action=bulkConnectPatents}:{org:string;product:string;choices:Choice[];query:string;field?:ProductPatentSearchField;choicePage:number;linkedPage:number;action?:Action}) {
 const [state,formAction,pending]=useActionState(action,{error:null} as BulkPatentState),[selected,setSelected]=useState<string[]>([]);
 const all=selected.length===choices.length;
 const messages={invalid:'연결할 특허를 1건 이상, 최대 25건까지 선택해 주세요.',duplicate:'이미 연결된 특허가 포함되어 아무 항목도 추가되지 않았습니다. 다른 탭에서 연결 상태를 확인한 뒤 목록을 새로고침해 주세요.',session:'로그인 상태를 확인할 수 없습니다. 선택을 유지한 채 다른 탭에서 로그인해 주세요.',network:'연결이 끊겼습니다. 등록되었을 수 있으니 다른 탭에서 연결 상태를 확인해 주세요.',save:'연결하지 못했습니다. 선택을 유지한 채 다른 탭에서 접근 권한과 특허 상태를 확인해 주세요.'};
 return <form action={formAction} className="bulk-patent-form" aria-busy={pending} onReset={event=>event.preventDefault()}><input type="hidden" name="organization" value={org}/><input type="hidden" name="product" value={product}/><input type="hidden" name="asset_query" value={query}/><input type="hidden" name="asset_field" value={field}/><input type="hidden" name="choice_page" value={choicePage}/><input type="hidden" name="linked_page" value={linkedPage}/>
 {state.error&&<p className="form-message" role="alert">{messages[state.error]}</p>}
 <fieldset disabled={pending}><legend>연결할 특허 선택</legend><p>현재 페이지에서 최대 25건을 선택할 수 있습니다. 검색하거나 페이지를 바꾸면 선택이 초기화됩니다.</p><button type="button" className="bulk-patent-select" onClick={()=>setSelected(all?[]:choices.map(choice=>choice.id))}>{all?'선택 해제':'이 페이지 전체 선택'}</button><div className="bulk-patent-choices">{choices.map(choice=><label className="bulk-patent-choice" key={choice.id}><input type="checkbox" name="patent" value={choice.id} checked={selected.includes(choice.id)} onChange={event=>{const checked=event.currentTarget.checked;setSelected(current=>checked?[...current,choice.id]:current.filter(id=>id!==choice.id));}}/><span><strong>{choice.title}</strong><small>{choice.jurisdiction} · {choice.application_number||'번호 미입력'}</small></span></label>)}</div><p role="status">{selected.length}건 선택</p><button type="submit" disabled={!selected.length}>{pending?'연결 중...':'선택한 특허 연결'}</button></fieldset></form>;
}
