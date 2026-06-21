import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // SECURITY FIX: Include cookies for authentication
});

// SECURITY FIX: Removed localStorage token access - tokens are in HttpOnly cookies
// Cookies are sent automatically with withCredentials: true
api.interceptors.request.use((config) => {
  // SECURITY FIX: No Authorization header needed - cookies are sent automatically
  return config;
});

// Task API service
export const taskService = {
  // Get all tasks with filtering
  getTasks: async (params = {}) => {
    try {
      const response = await api.get('/tasks', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // Get tasks grouped by status (for Kanban board)
  getKanbanTasks: async (params = {}) => {
    try {
      const response = await api.get('/tasks/kanban', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching kanban tasks:', error);
      throw error;
    }
  },

  // Get single task
  getTask: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  },

  // Create new task
  createTask: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Update task
  updateTask: async (taskId, updates) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Update task status (for drag and drop)
  updateTaskStatus: async (taskId, status, listId, order) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, {
        status,
        listId,
        order
      });
      return response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  },

  // Delete task
  deleteTask: async (taskId) => {
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  // Add comment to task
  addComment: async (taskId, content) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { content });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  // Add time entry to task
  addTimeEntry: async (taskId, hours, description, date) => {
    try {
      const response = await api.post(`/tasks/${taskId}/time-entries`, {
        hours,
        description,
        date
      });
      return response.data;
    } catch (error) {
      console.error('Error adding time entry:', error);
      throw error;
    }
  },

  // Get task statistics
  getTaskStats: async (params = {}) => {
    try {
      const response = await api.get('/tasks/stats/overview', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw error;
    }
  }
};

export default taskService;
