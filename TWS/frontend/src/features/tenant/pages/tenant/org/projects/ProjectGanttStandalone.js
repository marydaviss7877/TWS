/**
 * Standalone Gantt Chart Page
 * Works without requiring a specific project ID - shows all projects or selected project
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import GanttChart from './components/gantt/GanttChart';
import ErrorBoundary from './components/ErrorBoundary';
import ProjectSelector from './components/ProjectSelector';
import tenantProjectApiService from './services/tenantProjectApiService';
import { showError } from './utils/toastNotifications';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const ProjectGanttStandalone = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantSlug) {
      fetchProjects();
    }
  }, [tenantSlug]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await tenantProjectApiService.getProjects(tenantSlug);
      const projectsData = response?.data || response || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (selectedProjectId) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedProjectId) {
      newSearchParams.set('projectId', selectedProjectId);
    } else {
      newSearchParams.delete('projectId');
    }
    setSearchParams(newSearchParams);
  };

  const selectedProject = projects.find(p => (p._id || p.id) === projectId);

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gantt Chart</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {projectId && selectedProject
                  ? `Visualizing timeline for: ${selectedProject.name || selectedProject.title}`
                  : 'Visualize project timelines and task dependencies. Select a project below to view its timeline.'}
              </p>
            </div>
            {projectId && selectedProject && (
              <button
                onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/overview`)}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View Project Dashboard →
              </button>
            )}
          </div>
          
          {/* Project Selector */}
          <div className="mt-4">
            <ProjectSelector 
              currentProjectId={projectId}
              onProjectChange={handleProjectChange}
            />
          </div>

          {/* Info Message */}
          {!projectId && projects.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Select a project above to view its Gantt chart timeline. You can also navigate to a specific project's dashboard and click "Gantt Chart" for a project-specific view.
              </p>
            </div>
          )}

          {!projectId && projects.length === 0 && !loading && (
            <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ <strong>No projects found.</strong> Create a project first to view its Gantt chart timeline.
              </p>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {projectId ? (
            <GanttChart projectId={projectId} />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {loading ? 'Loading projects...' : 'Select a project to view its Gantt chart'}
                </p>
                {projects.length > 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {projects.length} project{projects.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProjectGanttStandalone;
