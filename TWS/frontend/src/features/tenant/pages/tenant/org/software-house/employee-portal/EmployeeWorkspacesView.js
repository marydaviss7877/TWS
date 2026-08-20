import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import toast from 'react-hot-toast';
import {
  FolderIcon,
  UserIcon,
  BuildingOfficeIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const EmployeeWorkspacesView = ({ tenantSlug }) => {
  const { user: authUser } = useAuth();
  const { user: tenantUser } = useTenantAuth();
  const user = tenantUser || authUser;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [personalWorkspace, setPersonalWorkspace] = useState(null);
  const [companyWorkspaces, setCompanyWorkspaces] = useState([]);
  const [companyProjects, setCompanyProjects] = useState([]);

  useEffect(() => {
    if (tenantSlug && user) {
      fetchWorkspacesAndProjects();
    }
  }, [tenantSlug, user]);

  const fetchWorkspacesAndProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch user's workspaces and projects
      const response = await fetch(`/api/tenant/${tenantSlug}/software-house/employee-portal/workspaces`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPersonalWorkspace(data.data.personalWorkspace);
          setCompanyWorkspaces(data.data.companyWorkspaces || []);
          setCompanyProjects(data.data.companyProjects || []);
        }
      } else {
        toast.error('Failed to load workspaces');
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersonalWorkspace = async () => {
    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/software-house/employee-portal/workspaces/personal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPersonalWorkspace(data.data.workspace);
          toast.success('Personal workspace created!');
        }
      } else {
        toast.error('Failed to create personal workspace');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      toast.error('Failed to create personal workspace');
    }
  };

  const handleOpenWorkspace = (workspace) => {
    // Navigate to workspace view (adjust path based on your routing)
    navigate(`/${tenantSlug}/org/workspaces/${workspace.slug || workspace._id}`);
  };

  const handleOpenProject = (project) => {
    // Navigate to project view
    navigate(`/${tenantSlug}/org/projects/${project.slug || project._id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Workspaces</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your personal tasks and access company projects
          </p>
        </div>
      </div>

      {/* Personal Workspace */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-6 w-6 text-accent-600" />
            <h3 className="text-lg font-semibold text-gray-900">Personal Workspace</h3>
          </div>
          {!personalWorkspace && (
            <button
              onClick={handleCreatePersonalWorkspace}
              className="flex items-center space-x-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Personal Workspace</span>
            </button>
          )}
        </div>

        {personalWorkspace ? (
          <div
            onClick={() => handleOpenWorkspace(personalWorkspace)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{personalWorkspace.name}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {personalWorkspace.description || 'Your personal workspace for managing tasks'}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FolderIcon className="h-4 w-4 mr-1" />
                    Personal
                  </span>
                  {personalWorkspace.usage?.boards && (
                    <span>{personalWorkspace.usage.boards} boards</span>
                  )}
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              You don't have a personal workspace yet. Create one to manage your personal tasks.
            </p>
            <button
              onClick={handleCreatePersonalWorkspace}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              Create Personal Workspace
            </button>
          </div>
        )}
      </div>

      {/* Company Workspaces */}
      {companyWorkspaces.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Company Workspaces</h3>
            <span className="text-sm text-gray-500">({companyWorkspaces.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyWorkspaces.map((workspace) => (
              <div
                key={workspace._id}
                onClick={() => handleOpenWorkspace(workspace)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{workspace.name}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {workspace.description || 'Company workspace'}
                    </p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      <span className="capitalize">{workspace.type}</span>
                      {workspace.members?.length > 0 && (
                        <span>{workspace.members.length} members</span>
                      )}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Projects */}
      {companyProjects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FolderIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Assigned Projects</h3>
            <span className="text-sm text-gray-500">({companyProjects.length})</span>
          </div>

          <div className="space-y-3">
            {companyProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => handleOpenProject(project)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      {project.status && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          project.status === 'active' ? 'bg-green-100 text-green-700' :
                          project.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {project.status}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {project.clientId?.name && (
                        <span>Client: {project.clientId.name}</span>
                      )}
                      {project.startDate && (
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(project.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {companyWorkspaces.length === 0 && companyProjects.length === 0 && personalWorkspace && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            You don't have access to any company workspaces or projects yet.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Contact your manager or admin to get access to company projects.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeWorkspacesView;
