import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidPassword, passwordRequirements } from '../src/domain/auth/password-policy.ts';

test('password requires length, uppercase, lowercase and a digit', () => {
 assert.deepEqual(passwordRequirements('Abc1234'), {length:false,characters:true});
 for (const value of ['abcdefgh', 'ABCDEFG1', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh', 'Abcdef1'.repeat(11)]) assert.equal(isValidPassword(value),false);
 assert.equal(isValidPassword('Abcdefg1'),true);
 assert.equal(isValidPassword('Abcdef1!'),true);
});
