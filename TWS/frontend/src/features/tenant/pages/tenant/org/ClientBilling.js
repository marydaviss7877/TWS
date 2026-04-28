import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';

const ClientBilling = () => (
  <div className="p-6">
    <FeatureUnavailable
      title="Client billing unavailable"
      description="Client billing UI is temporarily unavailable until the live billing API is finalized."
    />
  </div>
);

export default ClientBilling;
