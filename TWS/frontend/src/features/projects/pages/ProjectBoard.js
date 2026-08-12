import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PlusIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import projectApiService from '../services/projectApiService';
import { handleApiError } from '../utils/errorHandler';
import { PROJECT_STATUS, STATUS_COLORS } from '../constants/projectConstants';
import Board from '../../../features/projects/components/ProjectPortal/Board';
import ProjectSidebar from '../components/ProjectPortal/ProjectSidebar';
import ErrorBoundary from '../components/ErrorBoundary';

const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const response = await projectApiService.getProject(projectId);
      if (isMountedRef.current && response.success && response.data?.project) {
        setProject(response.data.project);
      }
    } catch (error) {
      if (isMountedRef.current) handleApiError(error, 'Failed to load project');
    }
  }, [projectId]);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApiService.getProjectBoards(projectId);
      if (isMountedRef.current && response.success && response.data?.boards) {
        setBoardData(response.data.boards[0]);
      }
    } catch (error) {
      if (isMountedRef.current) handleApiError(error, 'Failed to load board data');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchBoardData();
  }, [fetchProject, fetchBoardData]);

  const handleBoardUpdate = () => {
    fetchBoardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading project board...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Project not found</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const statusColors = STATUS_COLORS[status];
    if (statusColors) {
      return `${statusColors.bg} ${statusColors.text}`;
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">
                  {project.clientId?.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'board' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'overview' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'board' && boardData ? (
            <Board
              projectId={projectId}
              boardId={boardData._id}
              initialData={boardData}
              onUpdate={handleBoardUpdate}
            />
          ) : activeTab === 'overview' ? (
            <div className="h-full p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Overview</h2>
                
                {/* Project Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ChartBarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Total Cards</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {boardData?.lists?.reduce((total, list) => total + (list.cards?.length || 0), 0) || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <UsersIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Team Members</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {project.members?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Files</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {project.files?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ChartBarIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">Progress</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {Math.round(project.metrics?.completionRate || 0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Description:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {project.description || 'No description provided'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Budget:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {project.budget?.total 
                            ? `$${project.budget.total.toLocaleString()} ${project.budget.currency}`
                            : 'No budget set'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Timeline:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {project.timeline?.startDate && project.timeline?.endDate
                            ? `${new Date(project.timeline.startDate).toLocaleDateString()} - ${new Date(project.timeline.endDate).toLocaleDateString()}`
                            : 'No timeline set'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Client:</span>
                        <p className="text-sm text-gray-900 mt-1">{project.clientId?.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Contact:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {project.clientId?.contact?.primary?.email || 'No contact email'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Client Access:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {project.settings?.allowClientAccess ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">No board data available</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <ProjectSidebar
            project={project}
            onClose={() => setSidebarOpen(false)}
            onUpdate={fetchProject}
          />
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProjectBoard;
