import React from 'react';
import FeatureUnavailable from '../../../../../../shared/components/feedback/FeatureUnavailable';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const OperationsOverview = () => {
  const tenantSlug = useTenantSlug();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage business operations and processes
        </p>
      </div>

      <FeatureUnavailable
        title="Operations management unavailable"
        description="Operations management is not available in this release yet."
        actionLabel="Go to dashboard"
        actionTo={`/${tenantSlug}/org/dashboard`}
      />
    </div>
  );
};

export default OperationsOverview;