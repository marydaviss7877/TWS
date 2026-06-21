import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SupraAdminLayout from '../../../../layouts/SupraAdminLayout';
import { setupMockAuth } from '../../../../shared/utils/setupMockAuth';

const SupraAdmin = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          });
          if (!response.ok) {
            setupMockAuth();
          }
        } catch {
          setupMockAuth();
        }
      };
      checkAuth();
    }
  }, []);

  return (
    <SupraAdminLayout>
      <Outlet />
    </SupraAdminLayout>
  );
};

export default SupraAdmin;
