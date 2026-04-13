import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SupraAdminLayout from '../../../../layouts/SupraAdminLayout';
import { setupMockAuth } from '../../../../shared/utils/setupMockAuth';
import SupraAdminDashboard from './dashboard/SupraAdminDashboard';
import TenantManagement from './tenants/TenantManagement';
import BillingManagement from './billing/BillingManagement';
import Analytics from './analytics/Analytics';
import Users from './users/Users';
import SessionManagement from './sessions/SessionManagement';
import DepartmentAccess from './departments/DepartmentAccess';
import Departments from './departments/Departments';
import SessionAnalytics from './analytics/SessionAnalytics';
import SystemMonitoring from './monitoring/SystemMonitoring';
import SystemHealth from './monitoring/SystemHealth';
import Infrastructure from './infrastructure/Infrastructure';
import Settings from './settings/Settings';
import DepartmentManagement from './departments/DepartmentManagement';
import ERPManagement from './erp/ERPManagement';
import RealTimeMonitoring from './monitoring/RealTimeMonitoring';

const SupraAdmin = () => {
  useEffect(() => {
    // SECURITY FIX: Check authentication via API instead of localStorage token
    // Setup mock authentication for development only if not authenticated
    if (process.env.NODE_ENV === 'development') {
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include' // SECURITY FIX: Include cookies
          });
          if (!response.ok) {
            // Not authenticated, setup mock auth for dev
            setupMockAuth();
          }
        } catch (error) {
          // Network error, setup mock auth for dev
          setupMockAuth();
        }
      };
      checkAuth();
    }
  }, []);

  return (
    <SupraAdminLayout>
      <Routes>
        <Route index element={<SupraAdminDashboard />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="billing" element={<BillingManagement />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={<Users />} />
        <Route path="session-management" element={<SessionManagement />} />
        <Route path="department-access" element={<DepartmentAccess />} />
        <Route path="departments" element={<Departments />} />
        <Route path="session-analytics" element={<SessionAnalytics />} />
        <Route path="department-management" element={<DepartmentManagement />} />
        <Route path="erp-management" element={<ERPManagement />} />
        <Route path="erp-management/:category" element={<ERPManagement />} />
        <Route path="system-monitoring" element={<SystemMonitoring />} />
        <Route path="system-health" element={<SystemHealth />} />
        <Route path="real-time-monitoring" element={<RealTimeMonitoring />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </SupraAdminLayout>
  );
};

export default SupraAdmin;
