'use client';

import { useRef, useState } from 'react';

type DownloadState = 'idle' | 'pending' | 'started' | 'error' | 'session' | 'incomplete';
const contentTypes = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function DownloadButton({ href, filename, format, children }: {
  href: string;
  filename: string;
  format: keyof typeof contentTypes;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DownloadState>('idle');
  const inFlight = useRef(false);

  async function download() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState('pending');
    try {
      const response = await fetch(href, { credentials: 'same-origin', cache: 'no-store' });
      const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (response.redirected || response.status === 401 || response.status === 403) { setState('session'); return; }
      if (response.status === 409) { setState('incomplete'); return; }
      if (!response.ok || contentType !== contentTypes[format]) { setState('error'); return; }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setState('started');
    } catch {
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }

  return <span className="download-control">
    <button type="button" onClick={download} disabled={state === 'pending'} aria-busy={state === 'pending'}>{state === 'pending' ? '파일 준비 중...' : children}</button>
    {state === 'started' && <span role="status">다운로드가 시작되었습니다. 브라우저의 다운로드 목록을 확인해 주세요.</span>}
    {state === 'session' && <span role="alert">로그인 상태와 접근 권한을 확인한 뒤 다시 시도해 주세요.</span>}
    {state === 'incomplete' && <span role="alert">평가 자료가 완전하지 않아 다운로드할 수 없습니다. 평가 내용을 확인해 주세요.</span>}
    {state === 'error' && <span role="alert">파일을 준비하지 못했습니다. 연결 상태와 접근 권한을 확인한 뒤 다시 시도해 주세요.</span>}
  </span>;
}
