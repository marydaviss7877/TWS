import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminPageTemplate from '../../../../../../features/admin/components/admin/AdminPageTemplate';
import {
  ChartPieIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import FeatureUnavailable from '../../../../../../shared/components/feedback/FeatureUnavailable';

const FinanceBudgeting = () => {
  const { tenantSlug } = useParams();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    period: 'monthly',
    startDate: '',
    endDate: '',
    totalAmount: '',
    description: '',
    categories: [{ name: '', amount: '' }]
  });

  const stats = [
    { label: 'Total Budget', value: '$2.4M', icon: CurrencyDollarIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { label: 'Allocated', value: '$1.8M', icon: ChartPieIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Available', value: '$600K', icon: ArrowTrendingUpIcon, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' },
    { label: 'Departments', value: '8', icon: CheckCircleIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' }
  ];

  const budgetByDepartment = [
    { department: 'Engineering', allocated: 850000, spent: 680000, percentage: 80 },
    { department: 'Sales & Marketing', allocated: 450000, spent: 380000, percentage: 84 },
    { department: 'Operations', allocated: 320000, spent: 290000, percentage: 91 },
    { department: 'HR', allocated: 180000, spent: 145000, percentage: 81 }
  ];

  const addCategory = () => setFormData(prev => ({ ...prev, categories: [...prev.categories, { name: '', amount: '' }] }));
  const removeCategory = (i) => setFormData(prev => ({ ...prev, categories: prev.categories.filter((_, idx) => idx !== i) }));
  const updateCategory = (i, field, val) => setFormData(prev => {
    const cats = [...prev.categories];
    cats[i] = { ...cats[i], [field]: val };
    return { ...prev, categories: cats };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await tenantApiService.makeRequest(`/api/tenant/${tenantSlug}/organization/finance/budgets`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ name: '', department: '', period: 'monthly', startDate: '', endDate: '', totalAmount: '', description: '', categories: [{ name: '', amount: '' }] });
    } catch (err) {
      console.error('Error creating budget:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Full-page Budget Form ─────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button type="button" onClick={() => setShowForm(false)} className="glass-button p-2 rounded-xl hover-scale" title="Back">←</button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">Create Budget</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Define a new departmental or project budget</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Budget Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Budget Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="glass-input w-full" placeholder="e.g., Q2 Engineering Budget" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Department *</label>
                <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Period *</label>
                <select value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} className="glass-input w-full" required>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Total Amount *</label>
                <input type="number" value={formData.totalAmount} onChange={(e) => setFormData({...formData, totalAmount: e.target.value})} className="glass-input w-full" placeholder="0.00" min="0" step="0.01" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Start Date *</label>
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">End Date *</label>
                <input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="glass-input w-full" required />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="glass-input w-full" rows="3" placeholder="Budget purpose and notes..." />
            </div>
          </div>

          {/* Budget Categories */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Budget Categories</h3>
              <button type="button" onClick={addCategory} className="glass-button px-3 py-2 rounded-xl hover-scale flex items-center gap-2 text-sm">
                <PlusIcon className="h-4 w-4" /> Add Category
              </button>
            </div>
            <div className="space-y-3">
              {formData.categories.map((cat, i) => (
                <div key={i} className="glass-card p-4 rounded-xl">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category Name</label>
                      <input type="text" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} className="glass-input w-full text-sm" placeholder="e.g., Salaries, Software, Travel" />
                    </div>
                    <div className="col-span-5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">Allocated Amount</label>
                      <input type="number" value={cat.amount} onChange={(e) => updateCategory(i, 'amount', e.target.value)} className="glass-input w-full text-sm" placeholder="0.00" min="0" step="0.01" />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeCategory(i)} disabled={formData.categories.length === 1} className="w-full p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-30">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card-premium p-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="glass-button px-5 py-2.5 rounded-xl hover-scale">Cancel</button>
            <button type="submit" disabled={saving} className="glass-button px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const actions = (
    <button onClick={() => setShowForm(true)} className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
      <PlusIcon className="w-5 h-5" />
      <span className="font-medium">Create Budget</span>
    </button>
  );

  return (
    <AdminPageTemplate
      title="Budgeting"
      description="Manage departmental budgets and allocations"
      stats={stats}
      actions={actions}
    >
      <div className="glass-card-premium p-6 hover-glow">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Budget by Department
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Department</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Allocated</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Spent</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Remaining</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Usage</th>
              </tr>
            </thead>
            <tbody>
              {budgetByDepartment.map((dept, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">{dept.department}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700 dark:text-gray-300">${(dept.allocated / 1000).toFixed(0)}K</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700 dark:text-gray-300">${(dept.spent / 1000).toFixed(0)}K</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700 dark:text-gray-300">${((dept.allocated - dept.spent) / 1000).toFixed(0)}K</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${dept.percentage > 90 ? 'bg-red-500' : dept.percentage > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${dept.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white w-12">{dept.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Monthly Spending Trend
          </h3>
          <FeatureUnavailable
            title="Budget trend chart unavailable"
            description="Chart visualization is not available in this release yet."
          />
        </div>

        <div className="glass-card-premium p-6 hover-glow">
          <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
            Budget Alerts
          </h3>
          <div className="space-y-3">
            {[
              { department: 'Operations', message: 'Exceeding 90% of budget', severity: 'high' },
              { department: 'Sales', message: 'On track, 84% utilized', severity: 'normal' }
            ].map((alert, index) => (
              <div key={index} className={`glass-card p-4 border-l-4 ${alert.severity === 'high' ? 'border-red-500' : 'border-green-500'}`}>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{alert.department}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPageTemplate>
  );
};

export default FinanceBudgeting;
