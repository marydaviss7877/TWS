/**
 * Custom Hook for Project Data Management
 * Provides reusable logic for fetching and managing project data
 */

import { useState, useEffect, useCallback } from 'react';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { handleApiError } from '../utils/errorHandler';

export const useProjects = (tenantSlug, filters = {}) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!tenantSlug) return;

    setLoading(true);
    setError(null);

    try {
      const data = await tenantProjectApiService.getProjects(tenantSlug, filters);
      setProjects(Array.isArray(data) ? data : (data.projects || []));
    } catch (err) {
      setError(err);
      handleApiError(err, 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, JSON.stringify(filters)]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refresh = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refresh };
};

export const useProjectMetrics = (tenantSlug) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tenantProjectApiService.getProjectMetrics(tenantSlug);
        setMetrics(data);
      } catch (err) {
        setError(err);
        handleApiError(err, 'Failed to load project metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [tenantSlug]);

  return { metrics, loading, error };
};

export const useTasks = (tenantSlug, filters = {}) => {
  const [tasks, setTasks] = useState([]);
  const [groupedTasks, setGroupedTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!tenantSlug) return;

    setLoading(true);
    setError(null);

    try {
      const data = await tenantProjectApiService.getProjectTasks(tenantSlug, {
        ...filters,
        groupBy: 'status'
      });
      
      if (data.tasks) {
        setGroupedTasks(data.tasks);
        // Flatten for list view
        const allTasks = Object.values(data.tasks).flat();
        setTasks(allTasks);
      } else {
        const allTasks = Array.isArray(data) ? data : (data.tasks || []);
        setTasks(allTasks);
      }
    } catch (err) {
      setError(err);
      handleApiError(err, 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, JSON.stringify(filters)]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refresh = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, groupedTasks, loading, error, refresh };
};

export const useMilestones = (tenantSlug, filters = {}) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const fetchMilestones = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tenantProjectApiService.getProjectMilestones(tenantSlug, filters);
        setMilestones(Array.isArray(data) ? data : (data.milestones || []));
      } catch (err) {
        setError(err);
        handleApiError(err, 'Failed to load milestones');
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [tenantSlug, JSON.stringify(filters)]);

  return { milestones, loading, error };
};

export const useResources = (tenantSlug, filters = {}) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const fetchResources = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tenantProjectApiService.getProjectResources(tenantSlug, filters);
        setResources(Array.isArray(data) ? data : (data.resources || []));
      } catch (err) {
        setError(err);
        handleApiError(err, 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [tenantSlug, JSON.stringify(filters)]);

  return { resources, loading, error };
};

export const useTimesheets = (tenantSlug, filters = {}) => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const fetchTimesheets = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tenantProjectApiService.getProjectTimesheets(tenantSlug, filters);
        setTimesheets(Array.isArray(data) ? data : (data.timesheets || []));
      } catch (err) {
        setError(err);
        handleApiError(err, 'Failed to load timesheets');
      } finally {
        setLoading(false);
      }
    };

    fetchTimesheets();
  }, [tenantSlug, JSON.stringify(filters)]);

  return { timesheets, loading, error };
};

export const useSprints = (tenantSlug, filters = {}) => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantSlug) return;

    const fetchSprints = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tenantProjectApiService.getProjectSprints(tenantSlug, filters);
        setSprints(Array.isArray(data) ? data : (data.sprints || []));
      } catch (err) {
        setError(err);
        handleApiError(err, 'Failed to load sprints');
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [tenantSlug, JSON.stringify(filters)]);

  return { sprints, loading, error };
};

