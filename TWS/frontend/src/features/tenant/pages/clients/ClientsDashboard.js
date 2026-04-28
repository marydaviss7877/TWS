import React from 'react';
import FeatureUnavailable from '../../../../shared/components/feedback/FeatureUnavailable';

const ClientsDashboard = () => (
  <div className="p-6">
    <FeatureUnavailable
      title="Clients dashboard unavailable"
      description="The clients dashboard module is currently unavailable while backend client analytics endpoints are stabilized."
    />
  </div>
);

export default ClientsDashboard;
