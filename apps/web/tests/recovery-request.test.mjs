import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecoveryRequest } from '../src/domain/auth/recovery-request.ts';
test('recovery request expires at three minutes and rejects malformed values', () => {
 const now=1800000000000, value=JSON.stringify({email:'test@example.test',expiresAt:now+180000});
 assert.equal(parseRecoveryRequest(value,now)?.email,'test@example.test');
 assert.equal(parseRecoveryRequest(value,now+179999)?.email,'test@example.test');
 assert.equal(parseRecoveryRequest(value,now+180000),null);
 assert.equal(parseRecoveryRequest(JSON.stringify({email:'test@example.test',expiresAt:now+180001}),now),null);
 assert.equal(parseRecoveryRequest(JSON.stringify({email:'invalid',expiresAt:now+1000}),now),null);
 assert.equal(parseRecoveryRequest('invalid',now),null);
});
