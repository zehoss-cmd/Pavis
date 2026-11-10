import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryGrant, validateRecoveryGrant } from '../src/domain/auth/recovery-grant.ts';

test('recovery grant is tied to the verified session and expires', () => {
 const now=1_800_000_000_000, grant=createRecoveryGrant('token-one','user-one',now);
 assert.equal(validateRecoveryGrant(grant,'token-one','user-one',now),true);
 assert.equal(validateRecoveryGrant(grant,'token-two','user-one',now),false);
 assert.equal(validateRecoveryGrant(grant,'token-one','user-two',now),false);
 assert.equal(validateRecoveryGrant(grant,'token-one','user-one',now+600_000),false);
 assert.equal(validateRecoveryGrant(grant+'x','token-one','user-one',now),false);
 assert.equal(validateRecoveryGrant(undefined,'token-one','user-one',now),false);
});
