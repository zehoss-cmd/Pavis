'use client';

import { useEffect, useState } from 'react';
import { confirmRecovery } from './actions';

export function RecoveryConfirm({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const deadline = Date.now() + initialSeconds * 1000;
    const tick = () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [initialSeconds]);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <form action={confirmRecovery}>
    <label>Verification code<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required disabled={seconds === 0} /></label>
    <p className="recovery-timer" aria-live={seconds === 0 ? "polite" : "off"}>{seconds > 0 ? <>Code expires in <strong>{time}</strong></> : 'Request a verification code to continue.'}</p>
    <button type="submit" disabled={seconds === 0}>Confirm</button>
  </form>;
}
