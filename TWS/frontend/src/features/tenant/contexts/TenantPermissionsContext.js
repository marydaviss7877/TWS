/**
 * UPR Phase 2.4: Provides resolved permissions to tenant pages for sub-action gating.
 * e.g. "Run Payroll" visible only when modules.payroll.write === true
 */
import React, { createContext, useContext } from 'react';

const TenantPermissionsContext = createContext({ userPermissions: null });

export function useTenantPermissions() {
  const ctx = useContext(TenantPermissionsContext);
  const { userPermissions } = ctx || {};
  const hasModulePermission = (module, action = 'read') => {
    if (!userPermissions?.modules?.[module]) return false;
    const mod = userPermissions.modules[module];
    if (action === 'read') return !!mod.read;
    if (action === 'read_own') return !!mod.read_own || !!mod.read;
    if (action === 'write') return !!mod.write;
    if (action === 'delete') return !!mod.delete;
    if (action === 'admin') return !!mod.admin;
    return !!mod.read;
  };
  return { userPermissions, hasModulePermission };
}

export const TenantPermissionsProvider = TenantPermissionsContext.Provider;
export default TenantPermissionsContext;
