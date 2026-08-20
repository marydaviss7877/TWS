/**
 * DeliverablesPage Component
 * Main deliverables list and management page
 * Nucleus Project OS - Deliverable Management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FlagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { handleApiError } from './utils/errorHandler';
import { DeliverableForm } from './components/deliverables';
import { ApprovalProgress } from './components/approvals';
import DeliverableCardSkeleton from './components/deliverables/DeliverableCardSkeleton';
import { showSuccess, showError } from './utils/toastNotifications';
import ProjectSelector from './components/ProjectSelector';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const DELIVERABLE_STATUSES = {
  created: { label: 'Created', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  in_dev: { label: 'In Development', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  ready_approval: { label: 'Ready for Approval', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  shipped: { label: 'Shipped', color: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300' },
  in_rework: { label: 'In Rework', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
};

const DeliverablesPage = () => {
  const tenantSlug = useTenantSlug();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [showApprovalProgress, setShowApprovalProgress] = useState(null);

  useEffect(() => {
    if (tenantSlug) {
      fetchDeliverables();
    }
  }, [tenantSlug, projectId]);

  const fetchDeliverables = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (projectId) {
        filters.projectId = projectId;
      }
      
      const response = await tenantProjectApiService.getDeliverables(tenantSlug, filters);
      const deliverablesData = response?.data || response || [];
      setDeliverables(Array.isArray(deliverablesData) ? deliverablesData : []);
    } catch (err) {
      console.error('Error fetching deliverables:', err);
      setDeliverables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDeliverable(null);
    setIsFormOpen(true);
  };

  const handleEdit = (deliverable) => {
    setEditingDeliverable(deliverable);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingDeliverable(null);
    fetchDeliverables();
  };

  const getStatusBadge = (status) => {
    const statusInfo = DELIVERABLE_STATUSES[status] || DELIVERABLE_STATUSES.created;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getDaysUntilTarget = (targetDate) => {
    if (!targetDate) return null;
    const now = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredDeliverables = deliverables.filter(deliverable => {
    const matchesSearch = !searchTerm || 
      (deliverable.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deliverable.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || deliverable.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
        </div>
        <DeliverableCardSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Deliverables
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage project deliverables and track progress
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Create Deliverable</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card-premium p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {Object.entries(DELIVERABLE_STATUSES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <ProjectSelector 
          currentProjectId={projectId}
          onProjectChange={(projectId) => {
            fetchDeliverables();
          }}
        />
      </div>

      {/* Deliverables List */}
      <div className="space-y-4">
        {filteredDeliverables.length === 0 ? (
          <div className="glass-card-premium p-12 text-center">
            <FlagIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No deliverables found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first deliverable to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Deliverable
              </button>
            )}
          </div>
        ) : (
          filteredDeliverables.map((deliverable) => {
            const daysUntil = getDaysUntilTarget(deliverable.target_date);
            const isAtRisk = daysUntil !== null && daysUntil > 0 && daysUntil < 7 && (deliverable.progress_percentage || 0) < 80;

            return (
              <div
                key={deliverable._id || deliverable.id}
                className="glass-card p-6 hover-glow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {deliverable.name || 'Unnamed Deliverable'}
                      </h3>
                      {getStatusBadge(deliverable.status)}
                      {isAtRisk && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-semibold flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          At Risk
                        </span>
                      )}
                    </div>
                    {deliverable.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {deliverable.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(deliverable)}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setSelectedDeliverable(deliverable)}
                      className="px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {deliverable.progress_percentage || 0}%
                    </span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        deliverable.status === 'approved' ? 'bg-green-500' :
                        deliverable.status === 'in_dev' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${deliverable.progress_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Target Date</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {deliverable.target_date 
                          ? new Date(deliverable.target_date).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                  {daysUntil !== null && (
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Days Remaining</p>
                        <p className={`text-sm font-semibold ${daysUntil < 0 ? 'text-red-600' : daysUntil < 7 ? 'text-yellow-600' : 'text-gray-900 dark:text-white'}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                  )}
                  {deliverable.date_confidence !== null && (
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Confidence</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {deliverable.date_confidence}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval Progress */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowApprovalProgress(
                      showApprovalProgress === (deliverable._id || deliverable.id) 
                        ? null 
                        : (deliverable._id || deliverable.id)
                    )}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showApprovalProgress === (deliverable._id || deliverable.id) 
                      ? 'Hide Approval Progress' 
                      : 'View Approval Progress'}
                  </button>
                  {showApprovalProgress === (deliverable._id || deliverable.id) && (
                    <div className="mt-4">
                      <ApprovalProgress
                        deliverableId={deliverable._id || deliverable.id}
                        onApprovalChange={fetchDeliverables}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <DeliverableForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDeliverable(null);
          }}
          deliverable={editingDeliverable}
          projectId={projectId}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default DeliverablesPage;
