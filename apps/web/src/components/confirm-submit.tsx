'use client';

import { useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';

export function ConfirmSubmit({ message, children }: { message: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const { pending } = useFormStatus();

  return <>
    <button ref={trigger} type="submit" className="danger-button" disabled={pending} onClick={event => {
      if (confirmed.current) { confirmed.current = false; return; }
      event.preventDefault();
      if (event.currentTarget.form?.reportValidity()) dialog.current?.showModal();
    }}>{pending ? '처리 중...' : children}</button>
    <dialog ref={dialog} className="pavis-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <h2 id={titleId}>작업을 확인해 주세요</h2>
      <p id={descriptionId}>{message}</p>
      <div className="pavis-dialog-actions">
        <button type="button" className="dialog-cancel" autoFocus onClick={() => dialog.current?.close()}>취소</button>
        <button type="button" className="dialog-confirm" onClick={() => {
          const button = trigger.current;
          dialog.current?.close();
          if (!button?.form) return;
          confirmed.current = true;
          button.form.requestSubmit(button);
          confirmed.current = false;
        }}>확인</button>
      </div>
    </dialog>
  </>;
}
