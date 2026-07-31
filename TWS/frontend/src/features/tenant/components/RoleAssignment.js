import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, CogIcon } from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';

/**
 * RoleAssignment Component
 * Shows current user roles. Role management is done in Settings > Roles.
 */
const RoleAssignment = ({ userId, currentRoles = [], onUpdate }) => {
  const tenantSlug = useTenantSlug();
  const [tenantRoles, setTenantRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await tenantApiService.getRoles(tenantSlug);
        const data = res?.data?.data ?? res?.data ?? [];
        setTenantRoles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('Could not load tenant roles:', e);
      } finally {
        setLoading(false);
      }
    };
    if (tenantSlug) fetchRoles();
  }, [tenantSlug]);

  const getRoleLabel = (roleKey) => {
    const r = tenantRoles.find(x => (x.slug || x.name || x.key) === roleKey || x._id === roleKey);
    return r?.name || r?.slug || roleKey;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="tws-loading-pulse rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
      <p className="text-xs text-gray-500 mb-4">
        Current roles for this user. To change roles, use Settings &gt; Roles or update the user.
      </p>
      {currentRoles && currentRoles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {currentRoles
            .filter(r => r.status === 'active')
            .map((r, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {getRoleLabel(r.role)}
              </span>
            ))}
          {currentRoles
            .filter(r => r.status === 'pending_approval')
            .map((r, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
              >
                <ClockIcon className="h-4 w-4" />
                {getRoleLabel(r.role)} (Pending)
              </span>
            ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No roles assigned.</p>
      )}
      <Link
        to={`/${tenantSlug}/org/roles`}
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
      >
        <CogIcon className="h-4 w-4" />
        Manage roles in Settings
      </Link>
    </div>
  );
};

export default RoleAssignment;
