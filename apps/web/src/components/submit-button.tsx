'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingLabel = '처리 중...', disabled = false }: { children: React.ReactNode; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} aria-busy={pending}>{pending ? pendingLabel : children}</button>;
}
