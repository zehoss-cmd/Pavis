'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function LoadError({ message }: { message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="load-error" role="alert">
    <p>{message} 연결 상태를 확인하고 다시 시도해 주세요.</p>
    <button type="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => router.refresh())}>
      {pending ? '다시 불러오는 중...' : '다시 시도'}
    </button>
  </div>;
}
