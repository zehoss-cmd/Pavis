/** UI/server presentation policy for the currently implemented organization operations.
 * PostgreSQL RLS and database functions independently enforce all data access.
 * Asset, valuation and licensing permissions are deliberately not decided here.
 */
const roles = ['admin', 'ip_manager', 'analyst', 'licensing_manager', 'viewer'] as const;
export type OrganizationRole = (typeof roles)[number];
export type OrganizationAction = 'organization.read' | 'members.manage' | 'invitations.manage' | 'audit.read';

export function canPerformOrganizationAction(role: unknown, status: unknown, action: unknown): boolean {
  if (status !== 'active' || typeof role !== 'string' || !roles.some(value => value === role)) return false;
  switch (action) {
    case 'organization.read': return true;
    case 'members.manage':
    case 'invitations.manage':
    case 'audit.read': return role === 'admin';
    default: return false;
  }
}
