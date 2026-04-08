import { useMemo } from 'react';
import { MENU_KEY_MODULES } from '../../../constants/navigationConstants';

/**
 * useMenuFiltering — filters menu items based on role, tenant modules, and department access.
 *
 * Extracted from TenantOrgLayout for testability and reuse.
 * Also handles UPR Phase 2: when userPermissions is provided, use it as the authoritative source.
 *
 * @param {Array}  menuItems       - All available menu items from industryMenuBuilder
 * @param {Object} user            - Current user { role }
 * @param {Object} tenant          - Current tenant { erpModules }
 * @param {Array}  userDepartments - User's assigned departments
 * @param {Object} userPermissions - UPR Phase 2 permission object { modules: { [key]: { read } } }
 */
export const useMenuFiltering = (menuItems, user, tenant, userDepartments, userPermissions = null) => {
  return useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) return [];

    const alwaysVisible = ['dashboard', 'settings'];
    const tenantModules = tenant?.erpModules || [];
    const deptModules = userDepartments
      .map(dept => dept.module || dept.department?.toLowerCase())
      .filter(Boolean);
    const allAvailableModules = [...new Set([...tenantModules, ...deptModules])];
    const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
    const permModules = userPermissions?.modules;

    return menuItems.filter(item => {
      if (!item?.key) return false;

      // Always-visible items
      if (alwaysVisible.includes(item.key)) return true;

      // Employee portal: only non-admin users
      if (item.key === 'employee-portal') return !isOwnerOrAdmin;

      // Owner/Admin: always see every module in their ERP category.
      // Plan/module restrictions only apply to non-admin roles.
      if (isOwnerOrAdmin) return true;

      // UPR Phase 2: when resolved permissions exist, use them as authoritative
      if (permModules && typeof permModules === 'object') {
        const permKey = item.key;
        if (permModules[permKey]?.read) return true;
        // Some menu keys map to a different permission module key
        const mapped = MENU_KEY_MODULES[permKey];
        if (mapped) {
          return mapped.some(m => permModules[m]?.read);
        }
        return false;
      }

      // Regular user: check department access
      if (userDepartments.length > 0) {
        return userDepartments.some(dept => {
          const deptModule = dept.module || dept.department?.toLowerCase();
          const deptName = dept.name?.toLowerCase() || dept.department?.toLowerCase();
          const menuKey = item.key.toLowerCase();
          return (
            deptModule === menuKey || deptName === menuKey ||
            deptModule?.includes(menuKey) || deptName?.includes(menuKey)
          );
        });
      }

      return false;
    }).filter(Boolean);
  }, [menuItems, tenant?.erpModules, userDepartments, user?.role, userPermissions]);
};
