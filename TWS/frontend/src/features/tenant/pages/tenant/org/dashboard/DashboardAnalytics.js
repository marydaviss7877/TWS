import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import FeatureUnavailable from '../../../../../../shared/components/feedback/FeatureUnavailable';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';

const DashboardAnalytics = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [tenantSlug]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantApiService.getDashboardAnalytics(tenantSlug);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Analytics error" message={error} onRetry={fetchAnalytics} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h1>
        <p className="text-gray-600">
          Detailed analytics and insights for your organization
        </p>
      </div>

      <FeatureUnavailable
        title="Analytics unavailable"
        description="Advanced analytics and reporting are not available in this release yet."
      />
    </div>
  );
};

export default DashboardAnalytics;
