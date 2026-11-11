'use client';

import Link from 'next/link';

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="workspace-loading workspace-error" role="alert">
    <h1>화면을 불러오지 못했습니다</h1>
    <p>연결 상태를 확인하고 다시 시도해 주세요.</p>
    <div className="workspace-error-actions"><button type="button" onClick={reset}>다시 시도</button><Link href="/account">대시보드로 이동</Link></div>
  </main>;
}
