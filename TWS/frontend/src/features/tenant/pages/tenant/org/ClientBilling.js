import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';

const ClientBilling = () => {
  const tenantSlug = useTenantSlug();
  return (
    <div className="p-6">
      <FeatureUnavailable
        title="Client billing unavailable"
        description="Client billing UI is temporarily unavailable until the live billing API is finalized."
        actionLabel="Go to Accounts Receivable"
        actionTo={`/${tenantSlug}/org/finance/accounts-receivable`}
      />
    </div>
  );
};

export default ClientBilling;
