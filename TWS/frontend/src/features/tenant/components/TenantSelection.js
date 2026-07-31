import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { useTenant } from '../../../app/providers/TenantContext';
import tenantApiService from '../../../shared/services/tenant/tenant-api.service';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const TenantSelection = () => {
  const { user } = useAuth();
  const { switchTenant } = useTenant();
  const navigate = useNavigate();
  
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Load user's tenants
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      // If user is SupraAdmin, load all tenants
      if (user.role === 'supra_admin') {
        const response = await tenantApiService.get('/supra-admin/tenants');
        setTenants(response.tenants || []);
      } else {
        // Load user's accessible tenants
        const response = await tenantApiService.get('/user/tenants');
        setTenants(response.tenants || []);
      }
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenant) => {
    try {
      setSelectedTenant(tenant);
      await switchTenant(tenant.tenantId);
      
      // Navigate to tenant dashboard
      navigate(`/${tenant.tenantId}/dashboard`);
    } catch (err) {
      console.error('Error switching tenant:', err);
      setError(err.message || 'Failed to switch tenant');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      case 'pending_setup':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'suspended':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'pending_setup':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <BuildingOfficeIcon className="w-4 h-4" />;
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Organizations</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTenants}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/login')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Select Your Organization
          </h1>
          <p className="text-gray-600">
            Choose the organization you want to access
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tenants Grid */}
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {searchTerm ? 'No organizations found' : 'No organizations available'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'You don\'t have access to any organizations yet'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredTenants.map((tenant) => (
              <div
                key={tenant.tenantId}
                className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 ${
                  selectedTenant?.tenantId === tenant.tenantId
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleTenantSelect(tenant)}
              >
                <div className="p-6">
                  {/* Tenant Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {tenant.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {tenant.tenantId}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                      {getStatusIcon(tenant.status)}
                      <span className="ml-1 capitalize">{tenant.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  {/* Tenant Info */}
                  <div className="space-y-2 mb-4">
                    {tenant.contactInfo?.email && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> {tenant.contactInfo.email}
                      </p>
                    )}
                    {tenant.businessInfo?.industry && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Industry:</span> {tenant.businessInfo.industry}
                      </p>
                    )}
                    {tenant.businessInfo?.companySize && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Size:</span> {tenant.businessInfo.companySize}
                      </p>
                    )}
                  </div>

                  {/* Subscription Info */}
                  {tenant.subscription && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {tenant.subscription.plan}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tenant.subscription.status}
                        </span>
                      </div>
                      {tenant.subscription.trialEndDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Trial ends: {new Date(tenant.subscription.trialEndDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Usage Stats */}
                  {tenant.usage && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {tenant.usage.totalUsers || 0}
                        </p>
                        <p className="text-xs text-gray-500">Users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {tenant.usage.totalProjects || 0}
                        </p>
                        <p className="text-xs text-gray-500">Projects</p>
                      </div>
                    </div>
                  )}

                  {/* Onboarding Progress */}
                  {tenant.onboarding && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                        <span className="text-sm text-gray-500">
                          {Math.round((tenant.onboarding.steps?.filter(step => step.completed).length / tenant.onboarding.steps?.length) * 100) || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round((tenant.onboarding.steps?.filter(step => step.completed).length / tenant.onboarding.steps?.length) * 100) || 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Select Button */}
                  <button
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
                    disabled={tenant.status !== 'active'}
                  >
                    <span>Select Organization</span>
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>

                  {tenant.status !== 'active' && (
                    <p className="text-xs text-red-500 mt-2 text-center">
                      Organization is {tenant.status.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SupraAdmin Actions */}
        {user.role === 'supra_admin' && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/supra-admin')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              SupraAdmin Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantSelection;
