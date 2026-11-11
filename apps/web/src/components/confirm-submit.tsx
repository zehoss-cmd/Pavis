'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

export function ConfirmSubmit({ message, children, variant = 'danger' }: { message: string; children: React.ReactNode; variant?: 'danger' | 'primary' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousOverflow = useRef<string | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const { pending } = useFormStatus();
  const actionLabel = typeof children === 'string' ? children : '확인';

  function restoreScroll() {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }

  function finishClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    dialog.current?.close();
    restoreScroll();
    closingRef.current = false;
    setClosing(false);
  }

  function cancel() {
    if (closingRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishClose(); return; }
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = setTimeout(finishClose, 300);
  }

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    restoreScroll();
  }, []);

  return <>
    <button ref={trigger} type="submit" className={variant === 'danger' ? 'danger-button' : undefined} disabled={pending} aria-busy={pending} onClick={event => {
      event.preventDefault();
      if (!event.currentTarget.form?.reportValidity() || dialog.current?.open) return;
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.current?.showModal();
    }}>{pending ? '처리 중...' : children}</button>
    <dialog ref={dialog} className={`pavis-dialog${closing ? ' is-closing' : ''}`} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); cancel(); }}
      onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === 'pavis-dialog-out') finishClose(); }}>
      <h2 id={titleId}>{actionLabel} 확인</h2>
      <p id={descriptionId}>{message}</p>
      <div className="pavis-dialog-actions">
        <button type="button" className="dialog-cancel" autoFocus disabled={closing} onClick={cancel}>취소</button>
        <button type="button" className={`dialog-confirm${variant === 'danger' ? ' dialog-confirm-danger' : ''}`} disabled={closing || pending} onClick={() => {
          const button = trigger.current;
          finishClose();
          button?.form?.requestSubmit(button);
        }}>{actionLabel}</button>
      </div>
    </dialog>
  </>;
}
