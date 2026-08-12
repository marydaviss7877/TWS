import React, { useState } from 'react';
import { 
  XMarkIcon,
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../../../shared/utils/axiosInstance';
import { handleApiError } from '../../utils/errorHandler';

const ProjectSidebar = ({ project, onClose, onUpdate }) => {
  const [activeSection, setActiveSection] = useState('members');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (activeSection !== 'members') return;
    let cancelled = false;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/api/projects/${project._id}/members`);
        if (!cancelled && response.data?.success && response.data?.data?.members) {
          setMembers(response.data.data.members);
        }
      } catch (error) {
        if (!cancelled) handleApiError(error, 'Failed to load members', { showToast: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMembers();
    return () => { cancelled = true; };
  }, [activeSection, project._id]);

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'contributor': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-yellow-100 text-yellow-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Project Settings</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-gray-200">
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('members')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'members'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <UsersIcon className="h-4 w-4 mr-3" />
            Members
          </button>
          <button
            onClick={() => setActiveSection('files')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'files'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4 mr-3" />
            Files
          </button>
          <button
            onClick={() => setActiveSection('time')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'time'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ClockIcon className="h-4 w-4 mr-3" />
            Time Tracking
          </button>
          <button
            onClick={() => setActiveSection('budget')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'budget'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <CurrencyDollarIcon className="h-4 w-4 mr-3" />
            Budget
          </button>
          <button
            onClick={() => setActiveSection('tags')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'tags'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <TagIcon className="h-4 w-4 mr-3" />
            Tags
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
              activeSection === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4 mr-3" />
            Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Team Members</h4>
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                Invite
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading members...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {member.userId?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.userId?.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.userId?.email}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'files' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Project Files</h4>
            {project.files && project.files.length > 0 ? (
              <div className="space-y-2">
                {project.files.map((file, index) => (
                  <div key={file.fileId || index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.fileSize / 1024)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No files uploaded yet</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'time' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Time Tracking</h4>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estimated Hours</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.timeline?.estimatedHours || 0}h
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Actual Hours</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.timeline?.actualHours || 0}h
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.max(0, (project.timeline?.estimatedHours || 0) - (project.timeline?.actualHours || 0))}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'budget' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Budget Overview</h4>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Budget</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(project.budget?.total || 0, project.budget?.currency)}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Spent</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(project.budget?.spent || 0, project.budget?.currency)}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(project.budget?.remaining || 0, project.budget?.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tags' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Project Tags</h4>
            {project.tags && project.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <TagIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No tags added yet</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'settings' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Project Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Access
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={project.settings?.allowClientAccess || false}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      readOnly
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow client access</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={project.settings?.clientCanComment || false}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      readOnly
                    />
                    <span className="ml-2 text-sm text-gray-700">Client can comment</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={project.settings?.clientCanApprove || false}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      readOnly
                    />
                    <span className="ml-2 text-sm text-gray-700">Client can approve</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSidebar;
