import 'server-only';
import { cookies } from 'next/headers';
import { parseRecoveryRequest, recoveryRequestCookieName } from '@/domain/auth/recovery-request';

export async function recoveryRequestTiming() {
  const now = Date.now();
  const request = parseRecoveryRequest((await cookies()).get(recoveryRequestCookieName)?.value, now);
  return { expiresAt: request?.expiresAt || 0, remainingSeconds: request ? Math.ceil((request.expiresAt - now) / 1000) : 0 };
}
