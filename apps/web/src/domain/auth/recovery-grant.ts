import { createHmac, timingSafeEqual } from 'node:crypto';

export const recoveryCookieName = 'pavis-recovery-grant';
export const recoveryLifetimeSeconds = 600;

export function createRecoveryGrant(accessToken: string, userId: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + recoveryLifetimeSeconds;
  const payload = `${userId}.${expires}`;
  const signature = createHmac('sha256', accessToken).update(`pavis-password-recovery:${payload}`).digest('hex');
  return `${payload}.${signature}`;
}

export function validateRecoveryGrant(grant: string | undefined, accessToken: string, userId: string, now = Date.now()) {
  if (!grant || !accessToken || !userId) return false;
  const parts = grant.split('.');
  if (parts.length !== 3 || parts[0] !== userId || !/^\d{10}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[1]);
  const nowSeconds = Math.floor(now / 1000);
  if (expires <= nowSeconds || expires > nowSeconds + recoveryLifetimeSeconds) return false;
  const expected = createHmac('sha256', accessToken).update(`pavis-password-recovery:${parts[0]}.${parts[1]}`).digest();
  return timingSafeEqual(Buffer.from(parts[2], 'hex'), expected);
}
