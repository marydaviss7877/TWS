/**
 * ProjectSelector Component
 * Dropdown to select a project for filtering
 * Used in DeliverablesPage and ChangeRequestDashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { useTenantSlug } from '../../../../../../../shared/hooks/useTenantSlug';

const ProjectSelector = ({ onProjectChange, currentProjectId = null }) => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || searchParams.get('projectId') || '');

  useEffect(() => {
    if (tenantSlug) {
      fetchProjects();
    }
  }, [tenantSlug]);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl && projectIdFromUrl !== selectedProjectId) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [searchParams]);

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

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    const newSearchParams = new URLSearchParams(searchParams);
    if (projectId) {
      newSearchParams.set('projectId', projectId);
    } else {
      newSearchParams.delete('projectId');
    }
    setSearchParams(newSearchParams);
    
    if (onProjectChange) {
      onProjectChange(projectId);
    }
  };

  const selectedProject = projects.find(p => (p._id || p.id) === selectedProjectId);

  if (loading) {
    return (
      <div className="w-64 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
    );
  }

  return (
    <div className="project-selector">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Filter by Project
      </label>
      <div className="relative">
        <select
          value={selectedProjectId || ''}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project._id || project.id} value={project._id || project.id}>
              {project.name || project.title || 'Unnamed Project'}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {selectedProject && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Showing deliverables for: <strong>{selectedProject.name || selectedProject.title}</strong>
        </p>
      )}
    </div>
  );
};

export default ProjectSelector;
