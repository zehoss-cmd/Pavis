import test from "node:test";
import assert from "node:assert/strict";
import { canPerformOrganizationAction } from "../src/domain/organizations/authorization.ts";

test('valuation access is provisionally limited to active administrators and IP managers', () => {
  for (const action of ['valuation.read', 'valuation.write']) {
    for (const role of ['admin', 'ip_manager']) assert.equal(canPerformOrganizationAction(role, 'active', action), true);
    for (const role of ['analyst', 'licensing_manager', 'viewer']) assert.equal(canPerformOrganizationAction(role, 'active', action), false);
    assert.equal(canPerformOrganizationAction('admin', 'inactive', action), false);
  }
});
