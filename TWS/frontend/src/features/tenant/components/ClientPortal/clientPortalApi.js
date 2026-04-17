const baseUrl = process.env.REACT_APP_API_URL || '';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload?.data ?? payload;
};

export const clientPortalApi = {
  getProjects: () => request('/api/client-portal/projects'),
  getProjectById: (projectId) => request(`/api/client-portal/projects/${projectId}`),
  getProjectDeliverables: (projectId) => request(`/api/client-portal/projects/${projectId}/deliverables`),
  getTimesheetSummary: (projectId, range = '30d') => request(`/api/client-portal/projects/${projectId}/timesheets/summary?range=${encodeURIComponent(range)}`),
  approveDeliverable: (cardId, approved, comment) => request(`/api/client-portal/cards/${cardId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved, comment })
  }),
  addDeliverableComment: (cardId, text) => request(`/api/client-portal/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
};
