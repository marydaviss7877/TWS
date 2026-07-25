import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';

const ClientCommunications = () => {
  const tenantSlug = useTenantSlug();
  return (
    <div className="p-6">
      <FeatureUnavailable
        title="Client communications unavailable"
        description="Client communications UI is temporarily unavailable until the live communications API is finalized."
        actionLabel="View clients"
        actionTo={`/${tenantSlug}/org/clients`}
      />
    </div>
  );
};

export default ClientCommunications;
