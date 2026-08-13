import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';
import { getTenantWorkspaceUrl, navigateTo } from '../../../../../shared/utils/subdomain';
import { useTenantAuth } from '../../../../../app/providers/TenantAuthContext';

const sections = [
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'departments', label: 'Departments' }
];

const AccessControlPills = () => {
  const { user } = useTenantAuth();
  const tenantSlug = useTenantSlug();
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const normalizedRole = String(user?.role || '').toLowerCase();
  const canManageAccess = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner'].includes(normalizedRole);
  const visibleSections = canManageAccess
    ? sections
    : sections.filter((section) => section.id === 'departments');

  const handleSelect = (sectionId) => {
    const destination = getTenantWorkspaceUrl(tenantSlug, 'org', sectionId);
    navigateTo(destination, navigate);
  };

  return (
    <nav aria-label="Workspace access management" className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 p-1 dark:border-gray-700 dark:bg-gray-800">
        {visibleSections.map((section) => {
          const isActive = pathSegments.includes(section.id);

          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleSelect(section.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AccessControlPills;
