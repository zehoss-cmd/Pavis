'use client';

import { useState } from 'react';
import { ImportFormView } from '../../../../src/app/account/organizations/[id]/patents/import/import-form';
import { mockImport } from './actions';
import { ConfirmSubmit } from '../../../../src/components/confirm-submit';
import { DownloadButton } from '../../../../src/components/download-button';

export default function Fixture() {
 const [submitted,setSubmitted]=useState(0);
 return <main className="workspace"><div className="workspace-content"><div className="auth-page"><div className="auth-card">
  <h1>브라우저 테스트</h1>
  <section aria-label="가져오기"><ImportFormView org="test-only" handleAction={mockImport}/></section>
  <section aria-label="확인 팝업"><form onSubmit={event=>{event.preventDefault();setSubmitted(value=>value+1)}}><ConfirmSubmit message="특허 견본을 삭제할까요?">특허 삭제</ConfirmSubmit></form><output aria-label="제출 횟수">{submitted}</output></section>
  <section aria-label="다운로드"><DownloadButton href="/test-download" filename="example.csv" format="csv">CSV 다운로드</DownloadButton></section>
 </div></div></div></main>;
}
