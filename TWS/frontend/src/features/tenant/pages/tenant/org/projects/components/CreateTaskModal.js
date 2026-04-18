import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useParams } from 'react-router-dom';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { handleApiError } from '../utils/errorHandler';
import { toMongoIdString } from '../utils/validation';
import { PROJECT_PRIORITY, CARD_TYPE, CARD_STATUS } from '../constants/projectConstants';
import { showSuccess, showError } from '../utils/toastNotifications';

/** Create / edit task — full-viewport right drawer (portaled to document.body so it is not clipped by workspace scroll areas). */
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

      const pid = toMongoIdString(formData.projectId || projectId);
      if (!pid) {
        showError('Select a project');
        setErrors({ projectId: 'Project is required' });
        return;
      }
      const deptId = toMongoIdString(resolvedDeptId);
      const assignee = toMongoIdString(formData.assigneeId);

      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        status: formData.status || defaultStatus,
        priority: formData.priority || PROJECT_PRIORITY.MEDIUM,
        type: formData.type || CARD_TYPE.TASK,
        storyPoints: formData.storyPoints ? parseInt(formData.storyPoints, 10) : undefined,
        labels: formData.labels ? formData.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
        projectId: pid,
        ...(deptId ? { departmentId: deptId } : {}),
        ...(assignee ? { assigneeId: assignee } : {}),
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
        await tenantProjectApiService.createTask(tenantSlug, taskData);
        showSuccess('Task created successfully!');
        if (onTaskCreated) onTaskCreated();
        onClose();
        resetForm();
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
  if (typeof document === 'undefined' || !document.body) return null;

  const getCardTypeOptions = () => {
    return Object.entries(CARD_TYPE).map(([key, value]) => ({
      label: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      value: value
    }));
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/30"
        aria-hidden
        onClick={handleClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-panel-title"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 id="create-task-panel-title" className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {isEdit ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Scrollable fields */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 glass-scrollbar">
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
                  Project
                </label>
                {projectId ? (
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-200">
                    {(() => {
                      const p = projects.find((x) => String(x._id || x.id) === String(projectId));
                      return p?.name || p?.title || 'Current project (from board)';
                    })()}
                  </div>
                ) : (
                  <>
                    <select
                      name="projectId"
                      value={formData.projectId}
                      onChange={(e) => {
                        handleInputChange(e);
                        const selectedProject = projects.find((p) => (p._id || p.id) === e.target.value);
                        const firstDept = selectedProject?.departments?.[0];
                        const autoDeptId = selectedProject?.primaryDepartmentId
                          || (firstDept && (typeof firstDept === 'object' ? (firstDept._id || firstDept.id) : firstDept));
                        if (autoDeptId && !formData.departmentId) {
                          const id = typeof autoDeptId === 'object' ? (autoDeptId._id || autoDeptId.toString()) : autoDeptId;
                          setFormData((prev) => ({ ...prev, projectId: e.target.value, departmentId: id }));
                        } else {
                          setFormData((prev) => ({ ...prev, projectId: e.target.value }));
                        }
                      }}
                      className="w-full glass-input rounded-xl px-4 py-2"
                    >
                      <option value="">No project (assign later)</option>
                      {projects.map((proj) => (
                        <option key={proj._id || proj.id} value={proj._id || proj.id}>
                          {proj.name || proj.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You can assign this task to a project later
                    </p>
                  </>
                )}
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

          {/* Footer — inside form for proper submit */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/80 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50 sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create task')}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
};

export default CreateTaskModal;

