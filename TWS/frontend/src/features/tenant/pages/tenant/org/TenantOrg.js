import React from 'react';
import { Outlet } from 'react-router-dom';
import TenantOrgLayout from '../../../components/TenantOrgLayout';
import { TenantAuthProvider } from '../../../../../app/providers/TenantAuthContext';
import { TenantThemeProvider } from '../../../providers/TenantThemeProvider';
import { ClientAccessGate } from '../../../guards/TenantOrgGuards';
import { useTenantSlug } from '../../../../../shared/hooks/useTenantSlug';

const TenantOrg = () => {
  const tenantSlug = useTenantSlug();

  return (
    <TenantAuthProvider>
      <TenantThemeProvider tenantSlug={tenantSlug}>
        <TenantOrgLayout>
          <ClientAccessGate>
            <Outlet />
          </ClientAccessGate>
        </TenantOrgLayout>
      </TenantThemeProvider>
    </TenantAuthProvider>
  );
};

export default TenantOrg;
