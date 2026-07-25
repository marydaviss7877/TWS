import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';

const ClientContracts = () => {
  const tenantSlug = useTenantSlug();
  return (
    <div className="p-6">
      <FeatureUnavailable
        title="Client contracts unavailable"
        description="Client contracts UI is temporarily unavailable until the live contract API is finalized."
        actionLabel="View clients"
        actionTo={`/${tenantSlug}/org/clients`}
      />
    </div>
  );
};

export default ClientContracts;
