import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useParams } from 'react-router-dom';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { handleApiError } from '../utils/errorHandler';
import { PROJECT_PRIORITY, CARD_TYPE, CARD_STATUS } from '../constants/projectConstants';
import { showSuccess, showError } from '../utils/toastNotifications';

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, projectId, defaultStatus = CARD_STATUS.TODO, defaultAssigneeId = '', initialTask = null }) => {
  const isEdit = !!initialTask;
  const { tenantSlug } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: PROJECT_PRIORITY.MEDIUM,
    type: CARD_TYPE.TASK,
    projectId: projectId || '',
    departmentId: '',
    assigneeId: defaultAssigneeId || '',
    startDate: '',
    dueDate: '',
    storyPoints: '',
    labels: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);

  useEffect(() => {
    if (isOpen && tenantSlug) {
      fetchProjects();
      fetchDepartments();
      fetchUsers();
      if (initialTask) {
        const t = initialTask;
        const assigneeId = t.assignee?._id || t.assignee?.id || t.assigneeId || '';
        const departmentId = t.departmentId?._id || t.departmentId?.id || t.departmentId || '';
        const projectIdVal = t.projectId?._id || t.projectId?.id || t.projectId || '';
        setFormData({
          title: t.title || t.name || '',
          description: t.description || '',
          status: t.status || CARD_STATUS.TODO,
          priority: t.priority || PROJECT_PRIORITY.MEDIUM,
          type: t.type || CARD_TYPE.TASK,
          projectId: projectIdVal,
          departmentId,
          assigneeId,
          startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
          storyPoints: t.storyPoints != null ? String(t.storyPoints) : '',
          labels: Array.isArray(t.labels) ? t.labels.join(', ') : (t.labels || '')
        });
      } else if (projectId) {
        setFormData(prev => ({ ...prev, projectId }));
        fetchProjectDepartment(projectId);
      }
      if (!initialTask && defaultAssigneeId) {
        setFormData(prev => ({ ...prev, assigneeId: defaultAssigneeId }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenantSlug, projectId, defaultAssigneeId, initialTask]);

  const fetchProjectDepartment = async (projId) => {
    try {
      const projectData = await tenantProjectApiService.getProject(tenantSlug, projId);
      // processResponse returns data.data || data, so the project is at root
      const proj = projectData?.project || projectData;
      const firstDept = proj?.departments?.[0];
      const resolvedDeptId = proj?.primaryDepartmentId
        || (firstDept && (typeof firstDept === 'object' ? (firstDept._id || firstDept.id) : firstDept));
      if (resolvedDeptId) {
        const id = typeof resolvedDeptId === 'object' ? (resolvedDeptId._id || resolvedDeptId.toString()) : resolvedDeptId;
        setFormData(prev => ({ ...prev, departmentId: id }));
      }
    } catch (err) {
      console.error('Error fetching project department:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await tenantProjectApiService.getUsers(tenantSlug, { limit: 100 });
      const raw = Array.isArray(data) ? data : (data?.users || data?.data || data?.list || []);
      let list = Array.isArray(raw) ? raw : [];
      if (list.length === 0) {
        const res = await tenantProjectApiService.getProjectResources(tenantSlug).catch(() => ({}));
        const resources = res?.resources ?? res?.data?.resources ?? (Array.isArray(res) ? res : []);
        const seen = new Set();
        list = (resources || [])
          .map((r) => r.userId)
          .filter(Boolean)
          .filter((u) => {
            const id = u._id || u.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((u) => ({ ...u, name: u.name || u.fullName }));
      }
      setOrgUsers(list);
    } catch (err) {
      setOrgUsers([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await tenantProjectApiService.getProjects(tenantSlug);
      // Handle different response structures
      let projectsList = [];
      
      if (Array.isArray(response)) {
        projectsList = response;
      } else if (response && Array.isArray(response.projects)) {
        projectsList = response.projects;
      } else if (response && response.data && Array.isArray(response.data.projects)) {
        projectsList = response.data.projects;
      } else if (response && response.data && Array.isArray(response.data)) {
        projectsList = response.data;
      }
      
      console.log('📋 Fetched projects for task creation:', {
        responseType: typeof response,
        isArray: Array.isArray(response),
        hasProjects: !!(response?.projects),
        hasData: !!(response?.data),
        projectsCount: projectsList.length,
        projects: projectsList.map(p => ({ id: p._id || p.id, name: p.name || p.title }))
      });
      
      setProjects(projectsList);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setErrors({ title: 'Task title is required' });
      return;
    }

    setIsLoading(true);
    
    try {
      // Resolve departmentId: form selection → first loaded department → backend will auto-resolve
      let resolvedDeptId = formData.departmentId;
      if (!resolvedDeptId && departments.length > 0) {
        resolvedDeptId = departments[0]._id || departments[0].id;
        setFormData(prev => ({ ...prev, departmentId: resolvedDeptId }));
      }
      // If still missing, the backend will auto-resolve from the project — don't block the user

      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        status: formData.status || defaultStatus,
        priority: formData.priority || PROJECT_PRIORITY.MEDIUM,
        type: formData.type || CARD_TYPE.TASK,
        storyPoints: formData.storyPoints ? parseInt(formData.storyPoints, 10) : undefined,
        labels: formData.labels ? formData.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
        projectId: formData.projectId || undefined,
        departmentId: resolvedDeptId || undefined,
        assigneeId: formData.assigneeId || undefined,
        startDate: formData.startDate || undefined,
        dueDate: formData.dueDate || undefined
      };

      if (isEdit && initialTask) {
        const taskId = initialTask._id || initialTask.id;
        await tenantProjectApiService.updateTask(tenantSlug, taskId, taskData);
        showSuccess('Task updated successfully!');
        if (onTaskCreated) onTaskCreated();
        onClose();
        resetForm();
      } else {
        const response = await tenantProjectApiService.createTask(tenantSlug, taskData);
        if (response) {
          showSuccess('Task created successfully!');
          if (onTaskCreated) onTaskCreated();
          onClose();
          resetForm();
        }
      }
    } catch (error) {
      const errorMessage = handleApiError(error).message;
      showError(errorMessage || 'Failed to create task');
      if (error.data?.errors) {
        setErrors(error.data.errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: defaultStatus,
      priority: PROJECT_PRIORITY.MEDIUM,
      type: CARD_TYPE.TASK,
      projectId: projectId || '',
      departmentId: '',
      assigneeId: '',
      startDate: '',
      dueDate: '',
      storyPoints: '',
      labels: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const getCardTypeOptions = () => {
    return Object.entries(CARD_TYPE).map(([key, value]) => ({
      label: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      value: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-card-premium max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white">{isEdit ? 'Edit Task' : 'Create New Task'}</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full glass-input rounded-xl px-4 py-2 ${
                  errors.title ? 'border-red-300 dark:border-red-700' : ''
                }`}
                placeholder="Enter task title"
                required
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full glass-input rounded-xl px-4 py-2"
                placeholder="Describe the task..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department <span className="text-gray-400 text-xs">(auto-resolved if blank)</span>
                </label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  className={`w-full glass-input rounded-xl px-4 py-2 ${
                    errors.departmentId ? 'border-red-300 dark:border-red-700' : ''
                  }`}
                >
                  <option value="">Auto (from project)</option>
                  {departments.map(dept => (
                    <option key={dept._id || dept.id} value={dept._id || dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
                {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  name="projectId"
                  value={formData.projectId}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Auto-set department from selected project when not already chosen
                    const selectedProject = projects.find(p => (p._id || p.id) === e.target.value);
                    const firstDept = selectedProject?.departments?.[0];
                    const autoDeptId = selectedProject?.primaryDepartmentId
                      || (firstDept && (typeof firstDept === 'object' ? (firstDept._id || firstDept.id) : firstDept));
                    if (autoDeptId && !formData.departmentId) {
                      const id = typeof autoDeptId === 'object' ? (autoDeptId._id || autoDeptId.toString()) : autoDeptId;
                      setFormData(prev => ({ ...prev, projectId: e.target.value, departmentId: id }));
                    } else {
                      setFormData(prev => ({ ...prev, projectId: e.target.value }));
                    }
                  }}
                  className="w-full glass-input rounded-xl px-4 py-2"
                  disabled={!!projectId}
                >
                  <option value="">No project (assign later)</option>
                  {projects.map(project => (
                    <option key={project._id || project.id} value={project._id || project.id}>
                      {project.name || project.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can assign this task to a project later
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full glass-input rounded-xl px-4 py-2"
                >
                  <option value={CARD_STATUS.TODO}>To Do</option>
                  <option value={CARD_STATUS.IN_PROGRESS}>In Progress</option>
                  <option value={CARD_STATUS.UNDER_REVIEW}>Under Review</option>
                  <option value={CARD_STATUS.COMPLETED}>Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full glass-input rounded-xl px-4 py-2"
                >
                  {getCardTypeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full glass-input rounded-xl px-4 py-2"
                >
                  <option value={PROJECT_PRIORITY.LOW}>Low</option>
                  <option value={PROJECT_PRIORITY.MEDIUM}>Medium</option>
                  <option value={PROJECT_PRIORITY.HIGH}>High</option>
                  <option value={PROJECT_PRIORITY.URGENT}>Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Story Points
                </label>
                <input
                  type="number"
                  name="storyPoints"
                  value={formData.storyPoints}
                  onChange={handleInputChange}
                  className="w-full glass-input rounded-xl px-4 py-2"
                  placeholder="Optional"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date <span className="text-gray-400 text-xs">(for Gantt)</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  max={formData.dueDate || undefined}
                  className="w-full glass-input rounded-xl px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  min={formData.startDate || undefined}
                  className="w-full glass-input rounded-xl px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignee
                </label>
                <select
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleInputChange}
                  className="w-full glass-input rounded-xl px-4 py-2"
                >
                  <option value="">Unassigned</option>
                  {orgUsers.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.fullName || u.name || u.email || 'User'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Labels (comma-separated)
              </label>
              <input
                type="text"
                name="labels"
                value={formData.labels}
                onChange={handleInputChange}
                className="w-full glass-input rounded-xl px-4 py-2"
                placeholder="frontend, ui, urgent"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="glass-button px-4 py-2 rounded-xl hover-scale text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="glass-button px-4 py-2 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;

