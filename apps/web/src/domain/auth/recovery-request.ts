export const recoveryRequestCookieName = 'pavis-recovery-email';
export const recoveryCodeSeconds = 180;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecoveryRequest(value: string | undefined, now = Date.now()): { email: string; expiresAt: number } | null {
  if (!value) return null;
  try {
    const request: unknown = JSON.parse(value);
    if (!request || typeof request !== 'object' || !('email' in request) || !('expiresAt' in request)) return null;
    const { email, expiresAt } = request;
    if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email) || typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt)) return null;
    if (expiresAt <= now || expiresAt > now + recoveryCodeSeconds * 1000) return null;
    return { email, expiresAt };
  } catch { return null; }
}
