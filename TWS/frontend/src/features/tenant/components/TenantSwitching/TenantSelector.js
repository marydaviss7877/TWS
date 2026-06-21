import { API_BASE_URL } from '../../../../constants/apiEndpoints';
import React, { useState, useEffect } from 'react';
import { 
  BuildingOffice2Icon, 
  ChevronDownIcon, 
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const TenantSelector = ({ currentTenant, onTenantSwitch, onTenantCreate }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserTenants();
  }, []);

  const fetchUserTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenant-switching/tenants', {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      
      const data = await response.json();
      setTenants(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSwitch = async (tenantId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenant-switching/switch/${tenantId}`, {
        method: 'POST',
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch tenant');
      }
      
      const result = await response.json();
      
      // SECURITY FIX: Tokens are now in HttpOnly cookies, don't store in localStorage
      
      // Call parent callback
      onTenantSwitch(result);
      
      setIsOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPlanBadge = (plan) => {
    const planConfig = {
      trial: { color: 'bg-gray-100 text-gray-800', label: 'Trial' },
      basic: { color: 'bg-blue-100 text-blue-800', label: 'Basic' },
      professional: { color: 'bg-purple-100 text-purple-800', label: 'Pro' },
      enterprise: { color: 'bg-indigo-100 text-indigo-800', label: 'Enterprise' }
    };
    
    const config = planConfig[plan] || planConfig.trial;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">Loading tenants...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Current Tenant Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <BuildingOffice2Icon className="h-4 w-4" />
        <span className="truncate max-w-32">
          {currentTenant ? currentTenant.name : 'Select Tenant'}
        </span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Switch Tenant</h3>
            <p className="text-xs text-gray-500 mt-1">Select a tenant to switch context</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {tenants.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <BuildingOffice2Icon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No tenants available</p>
                <p className="text-xs">Contact your administrator for access</p>
              </div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => handleTenantSwitch(tenant.tenantId)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    currentTenant && currentTenant.id === tenant.tenantId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {tenant.tenantName}
                          </span>
                          {getStatusIcon(tenant.userStatus)}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {tenant.userRole}
                          </span>
                          {getPlanBadge(tenant.plan)}
                        </div>
                      </div>
                    </div>
                    {currentTenant && currentTenant.id === tenant.tenantId && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                onTenantCreate();
              }}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Request Access to New Tenant</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TenantSelector;
