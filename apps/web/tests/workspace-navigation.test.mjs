import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceOrganization,workspaceRoutes } from '../src/domain/workspace/navigation.ts';
const one={id:'3dbe1094-356b-44dd-9ab1-774bf3f995ff',name:'하나'},two={id:'b1d5a6e7-0000-4000-8000-000000000001',name:'둘'};
test('dashboard menus open the single accessible organization',()=>{
 assert.equal(resolveWorkspaceOrganization('/account',[one],null),one.id);
 assert.equal(workspaceRoutes(one.id).patents,`/account/organizations/${one.id}/patents`);
 assert.equal(workspaceRoutes(one.id).portfolios,`/account/organizations/${one.id}/portfolios`);
 assert.equal(workspaceRoutes(one.id).valuations,`/account/organizations/${one.id}/valuations`);
 assert.equal(workspaceRoutes(one.id).organization,`/account/organizations/${one.id}`);
});
test('multiple organizations require a valid selection and routes never override an organization URL',()=>{
 assert.equal(resolveWorkspaceOrganization('/account',[one,two],null),null);
 assert.equal(resolveWorkspaceOrganization('/account',[one,two],two.id),two.id);
 assert.equal(resolveWorkspaceOrganization(`/account/organizations/${one.id}/patents`,[one,two],two.id),one.id);
 assert.equal(resolveWorkspaceOrganization(`/account/organizations/${two.id}/patents`,[one],one.id),null);
 assert.equal(resolveWorkspaceOrganization('/account',[one,two],'invalid'),null);
 assert.equal(workspaceRoutes(null).patents,null);
});
