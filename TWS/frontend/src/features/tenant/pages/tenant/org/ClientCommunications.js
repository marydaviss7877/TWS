import React from 'react';
import FeatureUnavailable from '../../../../../shared/components/feedback/FeatureUnavailable';

const ClientCommunications = () => (
  <div className="p-6">
    <FeatureUnavailable
      title="Client communications unavailable"
      description="Client communications UI is temporarily unavailable until the live communications API is finalized."
    />
  </div>
);

export default ClientCommunications;
