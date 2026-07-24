/**
 * Integration Status Component
 * Shows health check of cross-feature integrations
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const IntegrationStatus = ({ projectId }) => {
  const tenantSlug = useTenantSlug();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && tenantSlug) {
      fetchIntegrationStatus();
    }
  }, [projectId, tenantSlug]);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getIntegrationStatus(tenantSlug, projectId);
      if (response.success && response.data) {
        setHealth(response.data);
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">Checking integration status...</div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Integration Status</h3>
        {health.healthy ? (
          <CheckCircleIcon className="w-6 h-6 text-green-500" />
        ) : (
          <XCircleIcon className="w-6 h-6 text-red-500" />
        )}
      </div>

      {health.healthy ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✓ All integrations are healthy and synchronized
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Found {health.issues.length} integration issue(s):
          </p>
          {health.issues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{issue.message}</p>
                  {issue.type && (
                    <p className="text-xs mt-1 opacity-75">Type: {issue.type}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchIntegrationStatus}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Refresh Status
      </button>
    </div>
  );
};

export default IntegrationStatus;
