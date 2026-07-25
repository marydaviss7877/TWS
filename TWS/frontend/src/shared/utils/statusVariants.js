/**
 * Canonical status/role → Badge variant mapping.
 *
 * Before this existed, "active" was green in one file, a different green in
 * another, and role colors were reinvented per page. This is the one place
 * that decides what a status or role looks like — pages should import from
 * here instead of writing their own color map.
 */

const LIFECYCLE_STATUS_VARIANTS = {
  active: 'success',
  paid: 'success',
  trial: 'warning',
  trialing: 'warning',
  pending: 'warning',
  sent: 'default',
  suspended: 'destructive',
  cancelled: 'destructive',
  canceled: 'destructive',
  overdue: 'destructive',
  expired: 'destructive',
  inactive: 'secondary',
};

export const getStatusVariant = (status) =>
  LIFECYCLE_STATUS_VARIANTS[(status || '').toLowerCase()] || 'secondary';

const ROLE_VARIANTS = {
  // Platform (Supra Admin) roles
  platform_super_admin: 'destructive',
  platform_admin: 'default',
  platform_support: 'secondary',
  platform_billing: 'warning',
  // Tenant-organization roles
  owner: 'destructive',
  admin: 'default',
  manager: 'success',
  employee: 'secondary',
  client: 'warning',
  contractor: 'outline',
};

export const getRoleVariant = (role) =>
  ROLE_VARIANTS[(role || '').toLowerCase()] || 'secondary';

const PLAN_VARIANTS = {
  trial: 'warning',
  basic: 'secondary',
  professional: 'success',
  enterprise: 'default',
};

export const getPlanVariant = (plan) =>
  PLAN_VARIANTS[(plan || '').toLowerCase()] || 'secondary';
