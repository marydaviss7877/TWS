import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';

const ClientContracts = () => (
  <div className="p-6">
    <FeatureUnavailable
      title="Client contracts unavailable"
      description="Client contracts UI is temporarily unavailable until the live contract API is finalized."
    />
  </div>
);

export default ClientContracts;
