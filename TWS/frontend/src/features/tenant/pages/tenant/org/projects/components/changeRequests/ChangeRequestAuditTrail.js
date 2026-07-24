/**
 * ChangeRequestAuditTrail Component
 * Display immutable audit trail for change requests
 * Nucleus Project OS - Change Request Workflow
 */

import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const ChangeRequestAuditTrail = ({ changeRequestId }) => {
  const tenantSlug = useTenantSlug();
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (changeRequestId && tenantSlug) {
      fetchAuditTrail();
    }
  }, [changeRequestId, tenantSlug]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getChangeRequestAudit(
        tenantSlug,
        changeRequestId
      );
      
      const auditData = response?.data || response || [];
      setAuditLog(Array.isArray(auditData) ? auditData : []);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'submitted':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'acknowledged':
        return <CheckCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'recommended':
        return <CheckCircleIcon className="w-5 h-5 text-purple-500" />;
      case 'decided':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (auditLog.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No audit trail available
        </p>
      </div>
    );
  }

  return (
    <div className="change-request-audit-trail">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Audit Trail
      </h3>

      <div className="space-y-4">
        {auditLog.map((entry, index) => (
          <div
            key={entry._id || entry.id || index}
            className="flex items-start space-x-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            {/* Timeline Line */}
            {index < auditLog.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
            )}

            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getActionIcon(entry.action)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {entry.action}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(entry.timestamp)}
                </span>
              </div>

              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                <UserIcon className="w-4 h-4 mr-1" />
                <span>Actor: {entry.actor}</span>
              </div>

              {entry.details && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {entry.details}
                </p>
              )}

              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <pre className="text-gray-600 dark:text-gray-400">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChangeRequestAuditTrail;
