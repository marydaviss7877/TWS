/**
 * AtRiskDeliverables Component
 * Display at-risk deliverables
 * Nucleus Project OS - Date Confidence Tracking
 */

import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from '../../services/tenantProjectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { useTenantSlug } from '../../../../../../../../shared/hooks/useTenantSlug';

const AtRiskDeliverables = ({ projectId }) => {
  const tenantSlug = useTenantSlug();
  const [atRiskDeliverables, setAtRiskDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantSlug) {
      fetchAtRiskDeliverables();
    }
  }, [tenantSlug, projectId]);

  const fetchAtRiskDeliverables = async () => {
    try {
      setLoading(true);
      // Get all deliverables and filter for at-risk ones
      // This would ideally be a dedicated endpoint, but we can calculate client-side
      const response = await tenantProjectApiService.getDeliverablesNeedingValidation(tenantSlug, 14);
      const deliverables = response?.data || response || [];
      
      // Filter and calculate at-risk
      const atRisk = deliverables.filter(deliverable => {
        const targetDate = deliverable.target_date || deliverable.dueDate;
        if (!targetDate) return false;

        const now = new Date();
        const daysRemaining = Math.ceil((new Date(targetDate) - now) / (1000 * 60 * 60 * 24));
        const progress = deliverable.progress_percentage || deliverable.progress || 0;
        const workRemaining = progress < 100 ? (100 - progress) / 10 : 0; // Rough estimate: 10% = 1 day

        return workRemaining > daysRemaining && daysRemaining > 0;
      });

      setAtRiskDeliverables(atRisk);
    } catch (err) {
      console.error('Error fetching at-risk deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskMetrics = (deliverable) => {
    const targetDate = deliverable.target_date || deliverable.dueDate;
    if (!targetDate) return null;

    const now = new Date();
    const daysRemaining = Math.ceil((new Date(targetDate) - now) / (1000 * 60 * 60 * 24));
    const progress = deliverable.progress_percentage || deliverable.progress || 0;
    const workRemaining = progress < 100 ? (100 - progress) / 10 : 0;
    const riskGap = workRemaining - daysRemaining;

    return {
      daysRemaining,
      workRemaining,
      riskGap,
      progress
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="tws-loading-pulse rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (atRiskDeliverables.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-green-800 dark:text-green-300">
          ✓ No at-risk deliverables found
        </p>
      </div>
    );
  }

  return (
    <div className="at-risk-deliverables">
      <div className="mb-4 flex items-center">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          At-Risk Deliverables ({atRiskDeliverables.length})
        </h3>
      </div>

      <div className="space-y-4">
        {atRiskDeliverables.map((deliverable) => {
          const metrics = calculateRiskMetrics(deliverable);
          if (!metrics) return null;

          const deliverableName = deliverable.name || deliverable.title || 'Unnamed Deliverable';
          const targetDate = deliverable.target_date || deliverable.dueDate;

          return (
            <div
              key={deliverable._id || deliverable.id}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                    {deliverableName}
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Work remaining exceeds runway by {Math.ceil(metrics.riskGap)} days
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400">Days Remaining</p>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                      {metrics.daysRemaining} days
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400">Work Remaining</p>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                      {Math.ceil(metrics.workRemaining)} days
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700 dark:text-red-400">
                  Target: {targetDate ? new Date(targetDate).toLocaleDateString() : 'N/A'}
                </span>
                <span className="text-red-700 dark:text-red-400">
                  Progress: {metrics.progress}%
                </span>
              </div>

              <div className="mt-3 flex space-x-2">
                <button className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md">
                  Extend Timeline
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">
                  Review Scope
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtRiskDeliverables;
