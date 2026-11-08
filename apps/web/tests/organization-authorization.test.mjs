import test from 'node:test';
import assert from 'node:assert/strict';
import { canPerformOrganizationAction as can } from '../src/domain/organizations/authorization.ts';

const roles = ['admin', 'ip_manager', 'analyst', 'licensing_manager', 'viewer'];
const adminActions = ['members.manage', 'invitations.manage', 'audit.read'];

test('active members can read their organization and only administrators can manage it', () => {
  for (const role of roles) {
    assert.equal(can(role, 'active', 'organization.read'), true, role);
    assert.equal(can(role, 'active', 'asset.read'), true, role);
    assert.equal(can(role, 'active', 'asset.write'), ['admin','ip_manager'].includes(role), role);
    for (const action of adminActions) assert.equal(can(role, 'active', action), role === 'admin', `${role}: ${action}`);
  }
});

test('inactive, missing, and unrecognized roles or actions fail closed', () => {
  for (const role of [...roles, 'unknown', 'constructor', null, undefined]) {
    for (const action of ['organization.read', ...adminActions, 'asset.read', 'asset.write', null]) {
      assert.equal(can(role, 'inactive', action), false);
      assert.equal(can(role, undefined, action), false);
    }
  }
  for (const role of ['unknown', 'constructor', null, undefined, {}]) assert.equal(can(role, 'active', 'organization.read'), false);
  for (const action of ['asset.delete', 'valuation.approve', 'constructor', '', null, undefined]) assert.equal(can('admin', 'active', action), false);
});
