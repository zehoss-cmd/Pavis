/** UI/server presentation policy for the currently implemented organization operations.
 * PostgreSQL RLS and database functions independently enforce all data access.
 * Asset permissions are provisional; valuation access is provisionally restricted to administrators and IP managers; licensing permissions remain undecided.
 */
const roles = ['admin', 'ip_manager', 'analyst', 'licensing_manager', 'viewer'] as const;
export type OrganizationRole = (typeof roles)[number];
export type OrganizationAction = 'organization.read' | 'members.manage' | 'invitations.manage' | 'audit.read' | 'asset.read' | 'asset.write' | 'valuation.read' | 'valuation.write';

export function canPerformOrganizationAction(role: unknown, status: unknown, action: unknown): boolean {
  if (status !== 'active' || typeof role !== 'string' || !roles.some(value => value === role)) return false;
  switch (action) {
    case 'organization.read':
    case 'asset.read': return true;
    case 'valuation.read':
    case 'valuation.write':
    case 'asset.write': return role === 'admin' || role === 'ip_manager';
    case 'members.manage':
    case 'invitations.manage':
    case 'audit.read': return role === 'admin';
    default: return false;
  }
}
