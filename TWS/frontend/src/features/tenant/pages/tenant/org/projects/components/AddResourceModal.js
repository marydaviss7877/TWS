/**
 * AddResourceModal – add a resource (team member) to the org resource pool.
 * Used from Project Resources / Team tab.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';
import toast from 'react-hot-toast';

const AddResourceModal = ({ isOpen, onClose, onSaved }) => {
  const { tenantSlug } = useParams();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    department: '',
    jobTitle: '',
    skillsText: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && tenantSlug) {
      setLoadingUsers(true);
      tenantProjectApiService
        .getUsers(tenantSlug, { limit: 200 })
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.users || data?.data || [];
          setUsers(list);
        })
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, tenantSlug]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ userId: '', department: '', jobTitle: '', skillsText: '' });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!formData.userId?.trim()) next.userId = 'Select a user';
    if (!formData.department?.trim()) next.department = 'Department is required';
    if (!formData.jobTitle?.trim()) next.jobTitle = 'Job title is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const skills = formData.skillsText
        ? formData.skillsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await tenantProjectApiService.createResource(tenantSlug, {
        userId: formData.userId.trim(),
        department: formData.department.trim(),
        jobTitle: formData.jobTitle.trim(),
        skills
      });
      toast.success('Resource added successfully');
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      const msg = err?.message || err?.data?.message || 'Failed to add resource';
      toast.error(msg);
      if (err?.data?.errors && Array.isArray(err.data.errors)) {
        const errMap = {};
        err.data.errors.forEach((e) => {
          errMap[e.path || e.param] = e.msg || e.message;
        });
        setErrors(errMap);
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="glass-card-premium max-w-md w-full rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add resource</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User *</label>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              disabled={loadingUsers}
              className={`w-full glass-input rounded-lg px-3 py-2 ${errors.userId ? 'border-red-500' : ''}`}
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.fullName || u.name || u.email} {u.email ? `(${u.email})` : ''}
                </option>
              ))}
            </select>
            {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Engineering"
              className={`w-full glass-input rounded-lg px-3 py-2 ${errors.department ? 'border-red-500' : ''}`}
            />
            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job title *</label>
            <input
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="e.g. Developer"
              className={`w-full glass-input rounded-lg px-3 py-2 ${errors.jobTitle ? 'border-red-500' : ''}`}
            />
            {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              name="skillsText"
              value={formData.skillsText}
              onChange={handleChange}
              placeholder="e.g. React, Node.js"
              className="w-full glass-input rounded-lg px-3 py-2"
            />
          </div>
          {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:opacity-90 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddResourceModal;
