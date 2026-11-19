'use client';
import { useActionState, useRef, useState } from 'react';
import { handleCsv } from './actions';
import { initialImportState, type ImportState } from './state';
type LocalImportState = ImportState & { reviewVersion?: string };
export function ImportForm({org}:{org:string}) { return <ImportFormView org={org} handleAction={handleCsv}/>; }
export function ImportFormView({org,handleAction}:{org:string;handleAction:typeof handleCsv}) {
 const fileInput=useRef<HTMLInputElement>(null);
 const [onlyErrors,setOnlyErrors]=useState(false);
 const [fileVersion,setFileVersion]=useState(0);
 const [state,action,pending]=useActionState(async (previous:LocalImportState,form:FormData):Promise<LocalImportState> => {
  const result=await handleAction(previous,form);
  return {...result,reviewVersion:String(form.get('review_version'))};
 },initialImportState as LocalImportState);
 const [operation,setOperation]=useState<'preview'|'commit'>('preview');
 const errorRows=new Set(state.errors.flatMap(error=>{
  const match=error.match(/^데이터 (\d+)번/);
  return match?[Number(match[1])-1]:[];
 }));
 const showOnlyErrors=onlyErrors&&errorRows.size>0;
 const chooseFile=()=>fileInput.current?.click();
 return <><form action={action} onSubmit={()=>setOperation('preview')}><input type="hidden" name="organization" value={org}/><input type="hidden" name="operation" value="preview"/><input type="hidden" name="review_version" value={fileVersion}/><label>CSV 또는 XLSX 파일<input ref={fileInput} name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required disabled={pending} onChange={()=>{setFileVersion(version=>version+1);setOnlyErrors(false);}}/></label><button type="submit" disabled={pending}>{pending&&operation==='preview'?'파일 검토 중...':'파일 검토'}</button></form>
 {state.stage==='preview' && state.reviewVersion!==String(fileVersion) && <p role="status">파일이 변경되었습니다. 등록하려면 선택한 파일을 다시 검토해 주세요.</p>}
 {state.stage==='preview' && state.reviewVersion===String(fileVersion) && !(pending&&operation==='preview') && <section><h2>검토 결과</h2><p>{state.count ?? state.rows.length}건 · 오류 {state.errors.length}건</p>{state.errors.length>0 && <ImportErrors key={fileVersion} errors={state.errors} chooseFile={chooseFile} pending={pending}/>}{state.rows.length>0 && <>{errorRows.size>0&&<label><input type="checkbox" checked={showOnlyErrors} onChange={event=>setOnlyErrors(event.target.checked)}/> 오류 행만 보기 ({errorRows.size}건)</label>}<p className="table-scroll-hint">표를 옆으로 스크롤해 모든 항목을 확인하세요.</p><div className="import-table-wrap" role="region" aria-label="특허 가져오기 미리보기 표" tabIndex={0}><table className="import-table"><thead><tr><th scope="col">데이터 순번</th><th scope="col">발명의 명칭</th><th scope="col">국가</th><th scope="col">출원번호</th><th scope="col">공개번호</th><th scope="col">등록번호</th><th scope="col">권리자</th><th scope="col">발명자</th><th scope="col">우선일</th><th scope="col">출원일</th><th scope="col">법적 상태</th><th scope="col">출처</th><th scope="col">확인일</th></tr></thead><tbody>{state.rows.map((row,i)=>(!showOnlyErrors||errorRows.has(i))&&<tr key={i}><td>{i+1}{errorRows.has(i)&&' · 오류'}</td><td>{row.title}</td><td>{row.jurisdiction}</td><td>{row.application_number}</td><td>{row.publication_number}</td><td>{row.registration_number}</td><td>{row.rights_holder}</td><td>{row.inventors}</td><td>{row.priority_date}</td><td>{row.filing_date}</td><td>{row.legal_status}</td><td>{row.source}</td><td>{row.verified_date}</td></tr>)}</tbody></table></div></>}{state.errors.length===0 && <form action={action} onSubmit={()=>setOperation('commit')}><input type="hidden" name="organization" value={org}/><input type="hidden" name="operation" value="commit"/><input type="hidden" name="review_version" value={fileVersion}/><input type="hidden" name="rows" value={JSON.stringify(state.rows)}/><p>등록을 누르면 검토한 {state.rows.length}건이 한 번에 저장됩니다.</p><button type="submit" disabled={pending}>{pending&&operation==='commit'?'등록 중...':'확인 후 등록'}</button></form>}</section>}
 {pending && <p role="status">{operation==='preview'?'파일을 검토하고 있습니다.':'특허를 등록하고 있습니다.'} 잠시만 기다려 주세요.</p>}
 {state.stage==='error' && state.reviewVersion===String(fileVersion) && <ImportErrors key={fileVersion} errors={state.errors} chooseFile={chooseFile} pending={pending}/>}{state.stage==='success' && state.reviewVersion===String(fileVersion) && <p className="form-message" role="status">{state.count}건의 특허를 등록했습니다. 다른 파일을 선택해 계속 가져올 수 있습니다.</p>}</>;
}

function ImportErrors({errors,chooseFile,pending}:{errors:string[];chooseFile:()=>void;pending:boolean}) {
 const [copyStatus,setCopyStatus]=useState('');
 async function copyErrors() {
  try {
   await navigator.clipboard.writeText(errors.join('\n'));
   setCopyStatus('오류 목록을 복사했습니다.');
  } catch {
   setCopyStatus('자동 복사를 사용할 수 없습니다. 오류 메시지를 선택해 복사해 주세요.');
  }
 }
 return <div>
  <ul className="import-errors" role="alert">{errors.map((error,index)=><li key={index}>{error}</li>)}</ul>
  <div className="patent-actions">
   <button type="button" onClick={copyErrors}>오류 목록 복사</button>
   <button type="button" onClick={chooseFile} disabled={pending}>수정한 파일 선택</button>
  </div>
  <p role="status">{copyStatus}</p>
  <p>원본을 수정한 뒤 파일을 다시 선택하고 검토해 주세요. 데이터 순번은 제목 행과 빈 행을 제외한 순서입니다.</p>
 </div>;
}
