/**
 * CreateSprintModal Component
 * Modal form to create a new sprint
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { handleApiError, handleSuccess } from '../utils/errorHandler';
import { SPRINT_STATUS } from '../constants/projectConstants';
import { showSuccess, showError } from '../utils/toastNotifications';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const CreateSprintModal = ({ isOpen, onClose, onSprintCreated, projectId }) => {
  const tenantSlug = useTenantSlug();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: projectId || '',
    startDate: '',
    endDate: '',
    goal: '',
    objectives: [],
    status: SPRINT_STATUS.PLANNING,
    team: []
  });
  const [newObjective, setNewObjective] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);

  useEffect(() => {
    if (isOpen && tenantSlug) {
      fetchProjects();
      fetchUsers();
      if (projectId) {
        setFormData(prev => ({ ...prev, projectId }));
      }
    }
  }, [isOpen, tenantSlug, projectId]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        name: '',
        description: '',
        projectId: projectId || '',
        startDate: '',
        endDate: '',
        goal: '',
        objectives: [],
        status: SPRINT_STATUS.PLANNING,
        team: []
      });
      setSelectedTeamMembers([]);
      setNewObjective('');
      setErrors({});
    }
  }, [isOpen, projectId]);

  const fetchProjects = async () => {
    try {
      const response = await tenantProjectApiService.getProjects(tenantSlug);
      let projectsList = [];
      
      if (Array.isArray(response)) {
        projectsList = response;
      } else if (response?.data) {
        projectsList = Array.isArray(response.data) ? response.data : (response.data.projects || []);
      } else if (response?.projects) {
        projectsList = response.projects;
      }
      
      setProjects(projectsList);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await tenantProjectApiService.getUsers(tenantSlug, { limit: 100 });
      const usersData = response?.data?.users || response?.users || response?.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const handleTeamMemberChange = (userId, field, value) => {
    setSelectedTeamMembers(prev => {
      const existing = prev.find(m => m.userId === userId);
      if (existing) {
        return prev.map(m => 
          m.userId === userId ? { ...m, [field]: value } : m
        );
      } else {
        return [...prev, { userId, role: '', capacity: 40, allocation: 100, [field]: value }];
      }
    });
  };

  const handleRemoveTeamMember = (userId) => {
    setSelectedTeamMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const calculateDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required';
    }
    
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const sprintData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        projectId: formData.projectId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        duration: calculateDuration(),
        goal: formData.goal.trim() || undefined,
        objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
        status: formData.status,
        team: selectedTeamMembers.length > 0 ? selectedTeamMembers.map(member => ({
          userId: member.userId,
          role: member.role || undefined,
          capacity: member.capacity ? parseInt(member.capacity, 10) : 40,
          allocation: member.allocation ? parseInt(member.allocation, 10) : 100
        })) : undefined
      };

      const response = await tenantProjectApiService.createSprint(tenantSlug, sprintData);
      
      showSuccess('Sprint created successfully!');
      
      if (onSprintCreated) {
        onSprintCreated(response);
      }
      
      onClose();
    } catch (err) {
      const errorMessage = handleApiError(err).message;
      showError(errorMessage || 'Failed to create sprint');
      setErrors({ submit: errorMessage || 'Failed to create sprint' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-card-premium max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white">Create New Sprint</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sprint Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="e.g., Sprint 1, Q1 Sprint 1"
                    required
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${errors.projectId ? 'border-red-500' : ''}`}
                    disabled={!!projectId}
                    required
                  >
                    <option value="">Select project</option>
                    {projects.map(project => (
                      <option key={project._id || project.id} value={project._id || project.id}>
                        {project.name || project.title}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2"
                    rows="3"
                    placeholder="Brief description of the sprint..."
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${errors.startDate ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || undefined}
                    className={`w-full glass-input rounded-xl px-4 py-2 ${errors.endDate ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
                  {duration > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Duration: {duration} day{duration !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Goals & Objectives */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goals & Objectives</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sprint Goal
                  </label>
                  <input
                    type="text"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2"
                    placeholder="What is the main goal of this sprint?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Objectives
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddObjective();
                        }
                      }}
                      className="flex-1 glass-input rounded-xl px-4 py-2"
                      placeholder="Add an objective..."
                    />
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  {formData.objectives.length > 0 && (
                    <div className="space-y-2">
                      {formData.objectives.map((objective, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-900 dark:text-white">{objective}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveObjective(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Members</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Add Team Member
                  </label>
                  <select
                    onChange={(e) => {
                      const userId = e.target.value;
                      if (userId && !selectedTeamMembers.find(m => m.userId === userId)) {
                        handleTeamMemberChange(userId, 'userId', userId);
                      }
                      e.target.value = '';
                    }}
                    className="w-full glass-input rounded-xl px-4 py-2"
                  >
                    <option value="">Select a team member...</option>
                    {users
                      .filter(user => !selectedTeamMembers.find(m => m.userId === (user._id || user.id)))
                      .map(user => (
                        <option key={user._id || user.id} value={user._id || user.id}>
                          {user.name || user.email || `User ${user._id || user.id}`}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedTeamMembers.length > 0 && (
                  <div className="space-y-3">
                    {selectedTeamMembers.map((member, index) => {
                      const user = users.find(u => (u._id || u.id) === member.userId);
                      return (
                        <div key={member.userId} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {user?.name || user?.email || `User ${member.userId}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(member.userId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Role
                              </label>
                              <input
                                type="text"
                                value={member.role || ''}
                                onChange={(e) => handleTeamMemberChange(member.userId, 'role', e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-1 text-sm"
                                placeholder="e.g., Developer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Capacity (hours)
                              </label>
                              <input
                                type="number"
                                value={member.capacity || 40}
                                onChange={(e) => handleTeamMemberChange(member.userId, 'capacity', e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-1 text-sm"
                                min="0"
                                max="200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Allocation (%)
                              </label>
                              <input
                                type="number"
                                value={member.allocation || 100}
                                onChange={(e) => handleTeamMemberChange(member.userId, 'allocation', e.target.value)}
                                className="w-full glass-input rounded-lg px-3 py-1 text-sm"
                                min="0"
                                max="100"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-300">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Sprint'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSprintModal;
