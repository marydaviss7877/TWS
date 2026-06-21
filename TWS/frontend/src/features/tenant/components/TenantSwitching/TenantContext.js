import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [tenantContext, setTenantContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // SECURITY FIX: Removed localStorage token check - check authentication via API
    // Load tenant context from API using cookies
    const checkAuth = async () => {
      try {
        const authResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.data?.user?.tenantId) {
            await loadTenantContext(authData.data.user.tenantId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadTenantFromToken = async (token) => {
    try {
      // Decode token to get tenant info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.tenantId) {
        await loadTenantContext(payload.tenantId);
      }
    } catch (err) {
      console.error('Error loading tenant from token:', err);
      localStorage.removeItem('tenantToken');
      setLoading(false);
    }
  };

  const loadTenantContext = async (tenantId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenant-switching/context/${tenantId}`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tenant context');
      }
      
      const context = await response.json();
      setCurrentTenant(context.tenant);
      setTenantContext(context);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading tenant context:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = async (tenantId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenant-switching/switch/${tenantId}`, {
        method: 'POST',
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch tenant');
      }
      
      const result = await response.json();
      
      // SECURITY FIX: Tokens are now in HttpOnly cookies, don't store in localStorage
      
      // Update context
      setCurrentTenant(result.tenant);
      setTenantContext({
        tenant: result.tenant,
        user: result.user
      });
      setError(null);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearTenant = () => {
    setCurrentTenant(null);
    setTenantContext(null);
    localStorage.removeItem('tenantToken');
  };

  const hasPermission = (resource, action) => {
    if (!tenantContext?.user?.permissions) return false;
    return tenantContext.user.permissions.includes(`${resource}:${action}`);
  };

  const hasRole = (role) => {
    if (!tenantContext?.user?.role) return false;
    return tenantContext.user.role === role;
  };

  const isOwner = () => hasRole('owner');
  const isAdmin = () => hasRole('admin') || isOwner();
  const isManager = () => hasRole('manager') || isAdmin();
  const isEmployee = () => hasRole('employee') || isManager();

  const value = {
    currentTenant,
    tenantContext,
    loading,
    error,
    switchTenant,
    clearTenant,
    loadTenantContext,
    hasPermission,
    hasRole,
    isOwner,
    isAdmin,
    isManager,
    isEmployee
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
