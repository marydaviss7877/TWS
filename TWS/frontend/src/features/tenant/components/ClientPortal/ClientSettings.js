import React from 'react';
import { useTenantAuth } from '../../../../app/providers/TenantAuthContext';

const ClientSettings = () => {
  const { user, tenant } = useTenantAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Your settings are limited to your client account and do not include organization administration.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Organization</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant?.name || '-'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.role || 'client'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSettings;
