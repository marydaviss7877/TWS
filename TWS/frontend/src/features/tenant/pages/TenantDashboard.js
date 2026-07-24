import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';
/**
 * Tenant Dashboard Component
 * Main dashboard for tenant-level overview
 * Redirects to organization home for now
 */
const TenantDashboard = () => {
  const tenantSlug = useTenantSlug();

  // Redirect to organization home as default landing page
  return <Navigate to={`/${tenantSlug}/org/home`} replace />;
};

export default TenantDashboard;

