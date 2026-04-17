import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

/**
 * Tenant Dashboard Component
 * Main dashboard for tenant-level overview
 * Redirects to organization home for now
 */
const TenantDashboard = () => {
  const { tenantSlug } = useParams();

  // Redirect to organization home as default landing page
  return <Navigate to={`/${tenantSlug}/org/home`} replace />;
};

export default TenantDashboard;

