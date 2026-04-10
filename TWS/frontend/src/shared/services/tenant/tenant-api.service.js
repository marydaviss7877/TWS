// Tenant API service
// SECURITY FIX: Uses HttpOnly cookies instead of localStorage
// Import centralized token refresh service
import { refreshToken as refreshTokenService } from '../auth/token-refresh.service';

/**
 * SECURITY FIX: Don't read tokens from localStorage
 * Tokens are in HttpOnly cookies and sent automatically with credentials: 'include'
 * This function is kept for backward compatibility but returns null
 * (cookies are sent automatically by browser)
 */
const getTenantToken = () => {
  // SECURITY FIX: Tokens are in HttpOnly cookies, not accessible to JavaScript
  // Return null - cookies are sent automatically with fetch/axios
  return null;
};

const getApiUrl = () => {
  // Use empty string to leverage proxy configuration (setupProxy.js)
  // This ensures requests go through the proxy to backend
  return '';
};

// Refresh tenant token - now uses centralized service to prevent race conditions
const refreshTenantToken = async () => {
  try {
    return await refreshTokenService();
  } catch (error) {
    // Error is already logged in the service
    // Only clear tenant-specific data on critical errors
    if (error.message.includes('No refresh token') || error.message.includes('Invalid refresh')) {
      localStorage.removeItem('tenantData');
    }
    throw error;
  }
};

const makeRequest = async (endpoint, options = {}, retry = true) => {
  // SECURITY FIX: Tokens are in HttpOnly cookies - use credentials: 'include'
  // Don't require token from getTenantToken() - cookies are sent automatically
  const token = getTenantToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  // Add Authorization header only if token available (for API clients)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getApiUrl()}${endpoint}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // SECURITY FIX: Include cookies (HttpOnly tokens)
    });
  } catch (networkError) {
    // Network errors - return null gracefully
    console.error('Network error:', networkError);
    return null;
  }

  // Handle token expiration
  if (response.status === 401 && retry) {
    const errorData = await response.json().catch(() => ({}));
    
    // Check if it's a token expiration error
    if (errorData.error === 'TokenExpiredError' || errorData.message?.includes('expired') || errorData.message?.includes('Token expired')) {
      try {
        // SECURITY FIX: Attempt to refresh token using cookies
        await refreshTenantToken();
        // Retry the request - cookies will be sent automatically
        return makeRequest(endpoint, options, false);
      } catch (refreshError) {
        // Refresh failed - return null gracefully instead of throwing
        // Don't log - errors are handled gracefully
        return null;
      }
    }
    
    // Other 401 errors - return null gracefully
    // Don't log - errors are handled gracefully
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // For 401 errors, return null silently (handled above)
    // For other errors, only log non-401 errors in development
    if (response.status !== 401 && process.env.NODE_ENV === 'development') {
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorData);
    }
    return null;
  }

  const data = await response.json();
  return data.data || data;
};

const tenantApiService = {
  // Get dashboard overview
  getDashboardOverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/dashboard`);
  },

  /** Create sample data for the current tenant (projects, clients, tasks, employees, departments, users). Uses cookie auth. Pass tenantSlug (e.g. from useParams). */
  createSampleData: async (tenantSlug) => {
    if (!tenantSlug) throw new Error('Tenant slug is required');
    const url = `${getApiUrl()}/api/tenant/${tenantSlug}/dashboard/create-sample-data`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Failed to create sample data');
    return json.data || json;
  },


  // Get dashboard analytics
  getDashboardAnalytics: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/dashboard/analytics`);
  },

  // Get analytics overview
  getAnalyticsOverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/analytics`);
  },

  // Get analytics reports
  getAnalyticsReports: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/analytics/reports?${queryParams}`);
  },

  // Get users
  getUsers: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/users?${queryParams}`);
  },

  // Create user
  createUser: async (tenantSlug, userData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/users`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Get user by ID
  getUserById: async (tenantSlug, userId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/users/${userId}`);
  },

  // Update user
  updateUser: async (tenantSlug, userId, userData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  // Delete user
  deleteUser: async (tenantSlug, userId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // Get HR overview
  getHROverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr`);
  },

  // Get employees
  getEmployees: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/employees?${queryParams}`);
  },

  // Send a portal invite to a new team member by email
  inviteEmployee: async (tenantSlug, { email, fullName, erpRole, hrSubRole }) => {
    const url = `/api/tenant/${tenantSlug}/organization/hr/employees/invite`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, fullName, erpRole, hrSubRole })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || `Server error ${response.status}`);
    return json.data || json;
  },

  // Create employee — uses direct fetch to surface server-side errors instead of returning null
  createEmployee: async (tenantSlug, employeeData) => {
    const url = `/api/tenant/${tenantSlug}/organization/hr/employees`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(employeeData)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Surface the actual Mongoose / server error message to the UI
      throw new Error(json.message || json.error || `Server error ${response.status}`);
    }
    return json.data || json;
  },

  // Get payroll data
  getPayrollData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/payroll?${queryParams}`);
  },

  // Get attendance data
  getAttendanceData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/attendance?${queryParams}`);
  },

  getAttendanceConfig: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/attendance/config`);
  },

  // Get finance overview (Software House specific)
  getFinanceOverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance`);
  },

  // Get accounts payable (Software House specific)
  getAccountsPayable: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/accounts-payable?${queryParams}`);
  },

  // Get accounts receivable (Software House specific)
  getAccountsReceivable: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/accounts-receivable?${queryParams}`);
  },

  // ===== Finance Additional APIs =====
  
  // Get recent transactions (Software House specific)
  getRecentTransactions: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/transactions/recent?${queryParams}`);
  },

  // Get overdue invoices (Software House specific)
  getOverdueInvoices: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices/overdue?${queryParams}`);
  },

  // Get upcoming bills (Software House specific)
  getUpcomingBills: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/bills/upcoming?${queryParams}`);
  },

  // Get project profitability (Software House specific)
  getSHProjectProfitability: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/projects/profitability?${queryParams}`);
  },

  // Get cash flow data (Software House specific)
  getCashFlowData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow?${queryParams}`);
  },

  // Get cash flow (transactions) (Software House specific)
  getCashFlow: async (tenantSlug, period = 'month') => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow?period=${period}`);
  },

  // Get cash flow forecasts (Software House specific)
  getCashFlowForecasts: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow/forecasts?${queryParams}`);
  },

  // Create cash flow forecast (Software House specific)
  createCashFlowForecast: async (tenantSlug, forecastData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow/forecasts`, {
      method: 'POST',
      body: JSON.stringify(forecastData)
    });
  },

  // Update cash flow forecast (Software House specific)
  updateCashFlowForecast: async (tenantSlug, forecastId, forecastData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow/forecasts/${forecastId}`, {
      method: 'PUT',
      body: JSON.stringify(forecastData)
    });
  },

  // Delete cash flow forecast (Software House specific)
  deleteCashFlowForecast: async (tenantSlug, forecastId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/cash-flow/forecasts/${forecastId}`, {
      method: 'DELETE'
    });
  },

  // Create invoice (Accounts Receivable) (Software House specific)
  createInvoice: async (tenantSlug, invoiceData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices`, {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  },

  // Update invoice (Software House specific)
  updateInvoice: async (tenantSlug, invoiceId, invoiceData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData)
    });
  },

  // Delete invoice (Software House specific)
  deleteInvoice: async (tenantSlug, invoiceId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices/${invoiceId}`, {
      method: 'DELETE'
    });
  },

  // Record invoice payment (Software House specific)
  recordSHInvoicePayment: async (tenantSlug, invoiceId, paymentData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  // Record payment (alias for recordSHInvoicePayment) (Software House specific)
  recordPayment: async (tenantSlug, invoiceId, paymentData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  // Create bill (Accounts Payable) (Software House specific)
  createBill: async (tenantSlug, billData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/bills`, {
      method: 'POST',
      body: JSON.stringify(billData)
    });
  },

  // Update bill (Software House specific)
  updateBill: async (tenantSlug, billId, billData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/bills/${billId}`, {
      method: 'PUT',
      body: JSON.stringify(billData)
    });
  },

  // Delete bill (Software House specific)
  deleteBill: async (tenantSlug, billId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/bills/${billId}`, {
      method: 'DELETE'
    });
  },

  // Record bill payment (Software House specific)
  recordSHBillPayment: async (tenantSlug, billId, paymentData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/bills/${billId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  // Get vendors (for Accounts Payable) (Software House specific)
  getVendors: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/vendors?${queryParams}`);
  },

  // Create vendor (Software House specific)
  createVendor: async (tenantSlug, vendorData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/vendors`, {
      method: 'POST',
      body: JSON.stringify(vendorData)
    });
  },

  // Get clients (for Accounts Receivable) (Software House specific)
  getClients: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/clients?${queryParams}`);
  },

  // Create client (Software House specific)
  createClient: async (tenantSlug, clientData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/clients`, {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  },

  // Update client (Software House specific)
  updateClient: async (tenantSlug, clientId, clientData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  },

  // Delete client (Software House specific)
  deleteClient: async (tenantSlug, clientId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/clients/${clientId}`, {
      method: 'DELETE'
    });
  },

  // Get chart of accounts (Software House specific)
  getChartOfAccounts: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/chart-of-accounts?${queryParams}`);
  },

  // Create account (Software House specific)
  createAccount: async (tenantSlug, accountData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/chart-of-accounts`, {
      method: 'POST',
      body: JSON.stringify(accountData)
    });
  },

  // Update account (Software House specific)
  updateAccount: async (tenantSlug, accountId, accountData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/chart-of-accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData)
    });
  },

  // Delete account (Software House specific)
  deleteAccount: async (tenantSlug, accountId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/chart-of-accounts/${accountId}`, {
      method: 'DELETE'
    });
  },

  // Load chart of accounts template (Software House specific)
  loadChartOfAccountsTemplate: async (tenantSlug, templateName) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/chart-of-accounts/templates/${templateName}`, {
      method: 'POST'
    });
  },

  // Get departments for the organization
  getDepartments: async (tenantSlug) => {
    const response = await makeRequest(`/api/tenant/${tenantSlug}/departments`);
    if (Array.isArray(response)) return response;
    if (response?.departments && Array.isArray(response.departments)) return response.departments;
    if (response?.data && Array.isArray(response.data)) return response.data;
    return response || [];
  },

  // Get projects overview
  getProjectsOverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects`);
  },

  // Get projects (for project costing)
  getProjects: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects?${queryParams}`);
  },

  // Create project
  createProject: async (tenantSlug, projectData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  // Update project
  updateProject: async (tenantSlug, projectId, projectData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },

  // Get project tasks
  getProjectTasks: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/tasks?${queryParams}`);
  },

  // Get project milestones
  getProjectMilestones: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/milestones?${queryParams}`);
  },

  // Get reports overview
  getReportsOverview: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/reports`);
  },

  // Generate report
  generateReport: async (tenantSlug, type, parameters = {}) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/reports/generate`, {
      method: 'POST',
      body: JSON.stringify({ type, parameters })
    });
  },

  // Generate finance report (Software House specific)
  generateFinanceReport: async (tenantSlug, reportId, startDate, endDate) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/reports/generate`, {
      method: 'POST',
      body: JSON.stringify({ reportId, startDate, endDate })
    });
  },

  // Export finance report (Software House specific)
  exportFinanceReport: async (tenantSlug, reportId, format, startDate, endDate) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/reports/export`, {
      method: 'POST',
      body: JSON.stringify({ reportId, format, startDate, endDate })
    });
  },

  // Get settings
  getSettings: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/settings`);
  },

  // Update settings
  updateSettings: async (tenantSlug, settingsData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/settings`, {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
  },

  // ===== HR Recruitment APIs =====
  
  // Get recruitment overview
  getRecruitmentData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment?${queryParams}`);
  },

  // Get job postings
  getJobPostings: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/jobs?${queryParams}`);
  },

  // Create job posting
  createJobPosting: async (tenantSlug, jobData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/jobs`, {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  },

  // Update job posting
  updateJobPosting: async (tenantSlug, jobId, jobData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  },

  // Delete job posting
  deleteJobPosting: async (tenantSlug, jobId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/jobs/${jobId}`, {
      method: 'DELETE'
    });
  },

  // Get job applications/responses
  getJobApplications: async (tenantSlug, jobId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/jobs/${jobId}/applications?${queryParams}`);
  },

  // Get interview schedules
  getInterviews: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/interviews?${queryParams}`);
  },

  // Create interview
  createInterview: async (tenantSlug, interviewData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/interviews`, {
      method: 'POST',
      body: JSON.stringify(interviewData)
    });
  },

  // Update interview
  updateInterview: async (tenantSlug, interviewId, interviewData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/recruitment/interviews/${interviewId}`, {
      method: 'PUT',
      body: JSON.stringify(interviewData)
    });
  },

  // ===== HR Performance APIs =====
  
  // Get performance data
  getPerformanceData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/performance?${queryParams}`);
  },

  // ===== HR Leave APIs =====
  
  // Get leave requests
  getLeaveRequests: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/leave-requests?${queryParams}`);
  },

  // Approve leave request
  approveLeaveRequest: async (tenantSlug, requestId, approvalData = {}) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/leave-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvalData)
    });
  },

  // Reject leave request
  rejectLeaveRequest: async (tenantSlug, requestId, rejectionData = {}) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/leave-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify(rejectionData)
    });
  },

  // ===== HR Training APIs =====
  
  // Get training data
  getTrainingData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/training?${queryParams}`);
  },

  // ===== HR Onboarding APIs =====
  
  // Get onboarding data
  getOnboardingData: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/onboarding?${queryParams}`);
  },

  // ===== Time & Expenses APIs =====

  // ===== Time Tracking APIs (Software House) =====
  
  // Start time tracking timer
  startTimeTracking: async (tenantSlug, { projectId, taskId, description }) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/start`, {
      method: 'POST',
      body: JSON.stringify({ projectId, taskId, description })
    });
  },

  // Stop time tracking timer
  stopTimeTracking: async (tenantSlug, timeEntryId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/stop/${timeEntryId}`, {
      method: 'POST'
    });
  },

  // Get active timer
  getActiveTimer: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/active`);
  },

  // Get time entries (new consolidated endpoint)
  getTimeEntries: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries?${queryParams}`);
  },

  // Create manual time entry
  createTimeEntry: async (tenantSlug, timeEntryData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries`, {
      method: 'POST',
      body: JSON.stringify(timeEntryData)
    });
  },

  // Update time entry
  updateTimeEntry: async (tenantSlug, timeEntryId, updates) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries/${timeEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  // Delete time entry
  deleteTimeEntry: async (tenantSlug, timeEntryId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries/${timeEntryId}`, {
      method: 'DELETE'
    });
  },

  // Approve time entry
  approveTimeEntry: async (tenantSlug, timeEntryId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries/${timeEntryId}/approve`, {
      method: 'POST'
    });
  },

  // Reject time entry
  rejectTimeEntry: async (tenantSlug, timeEntryId, rejectionReason) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/entries/${timeEntryId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason })
    });
  },

  // Get time entry statistics
  getTimeEntryStats: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/stats?${queryParams}`);
  },

  // Get today's time tracking summary
  getTodayTimeTracking: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/time-tracking/today`);
  },

  // Get expenses (Software House specific)
  getExpenses: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/expenses?${queryParams}`);
  },

  // Create expense (Software House specific)
  createExpense: async (tenantSlug, expenseData) => {
    // Handle FormData for file uploads
    if (expenseData instanceof FormData) {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      const response = await fetch(`/api/tenant/${tenantSlug}/software-house/finance/expenses`, {
        method: 'POST',
        credentials: 'include', // SECURITY FIX: Include cookies
        body: expenseData
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
      }
      const data = await response.json();
      return data.data || data;
    }
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
  },

  // Update expense (Software House specific)
  updateExpense: async (tenantSlug, expenseId, expenseData) => {
    // Handle FormData for file uploads
    if (expenseData instanceof FormData) {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      const response = await fetch(`/api/tenant/${tenantSlug}/software-house/finance/expenses/${expenseId}`, {
        method: 'PUT',
        credentials: 'include', // SECURITY FIX: Include cookies
        body: expenseData
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
      }
      const data = await response.json();
      return data.data || data;
    }
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData)
    });
  },

  // Delete expense (Software House specific)
  deleteExpense: async (tenantSlug, expenseId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/software-house/finance/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  },

  // Get team members (for time/expenses)
  getTeamMembers: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/employees?${queryParams}`);
  },

  // ==================== FINANCE MODULE - NEW APIs ====================
  
  // Chart of Accounts (Organization routes)
  getChartOfAccountsOrg: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/chart-of-accounts?${queryParams}`);
  },

  createAccountOrg: async (tenantSlug, accountData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/chart-of-accounts`, {
      method: 'POST',
      body: JSON.stringify(accountData)
    });
  },

  updateAccountOrg: async (tenantSlug, accountId, accountData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/chart-of-accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData)
    });
  },

  deleteAccountOrg: async (tenantSlug, accountId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/chart-of-accounts/${accountId}`, {
      method: 'DELETE'
    });
  },

  loadChartOfAccountsTemplateOrg: async (tenantSlug, templateName) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/chart-of-accounts/templates/${templateName}`, {
      method: 'POST'
    });
  },

  // Billing Engine
  generateInvoiceFromProject: async (tenantSlug, projectId, options = {}) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/billing/generate-invoice`, {
      method: 'POST',
      body: JSON.stringify({ projectId, options })
    });
  },

  createRecurringInvoice: async (tenantSlug, invoiceData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/billing/recurring`, {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  },

  processRecurringInvoices: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/billing/process-recurring`, {
      method: 'POST'
    });
  },

  sendInvoice: async (tenantSlug, invoiceId, recipientEmail) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/billing/send-invoice/${invoiceId}`, {
      method: 'POST',
      body: JSON.stringify({ recipientEmail })
    });
  },

  createPaymentLink: async (tenantSlug, invoiceId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/billing/payment-link/${invoiceId}`, {
      method: 'POST'
    });
  },

  // Project Costing
  getProjectCosts: async (tenantSlug, projectId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/projects/${projectId}/costs`);
  },

  getProjectProfitability: async (tenantSlug, projectId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/projects/${projectId}/profitability`);
  },

  getBudgetVsActual: async (tenantSlug, projectId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/projects/${projectId}/budget-vs-actual`);
  },

  getProjectForecast: async (tenantSlug, projectId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/projects/${projectId}/forecast`);
  },

  getResourceAllocation: async (tenantSlug, projectId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/projects/${projectId}/resource-allocation`);
  },

  // Accounts Receivable
  getAgingReportAR: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-receivable/aging?${queryParams}`);
  },

  sendPaymentReminder: async (tenantSlug, invoiceId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-receivable/${invoiceId}/reminder`, {
      method: 'POST'
    });
  },

  recordInvoicePayment: async (tenantSlug, invoiceId, paymentData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-receivable/${invoiceId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  getClientPaymentHistory: async (tenantSlug, clientId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-receivable/clients/${clientId}/history`);
  },

  // Accounts Payable
  getAgingReportAP: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-payable/aging?${queryParams}`);
  },

  recordBillPayment: async (tenantSlug, billId, paymentData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-payable/${billId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  scheduleBillPayment: async (tenantSlug, billId, scheduleData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-payable/${billId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    });
  },

  approveBill: async (tenantSlug, billId, approvedBy) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-payable/${billId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy })
    });
  },

  getVendorPaymentHistory: async (tenantSlug, vendorId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/accounts-payable/vendors/${vendorId}/history`);
  },

  // Cash Flow
  getCashFlowForecast: async (tenantSlug, months = 12) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/cash-flow/forecast?months=${months}`);
  },

  getCashFlowStatement: async (tenantSlug, startDate, endDate) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/finance/cash-flow/statement?startDate=${startDate}&endDate=${endDate}`);
  },

  // ==================== PROJECTS MODULE - NEW APIs ====================

  // Milestones
  createMilestone: async (tenantSlug, milestoneData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/milestones`, {
      method: 'POST',
      body: JSON.stringify(milestoneData)
    });
  },

  updateMilestone: async (tenantSlug, milestoneId, milestoneData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(milestoneData)
    });
  },

  deleteMilestone: async (tenantSlug, milestoneId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/milestones/${milestoneId}`, {
      method: 'DELETE'
    });
  },

  // Resources
  allocateResource: async (tenantSlug, resourceId, allocationData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/resources/${resourceId}/allocate`, {
      method: 'POST',
      body: JSON.stringify(allocationData)
    });
  },

  // Sprints
  calculateSprintVelocity: async (tenantSlug, sprintId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/projects/sprints/${sprintId}/velocity`, {
      method: 'PATCH'
    });
  },

  // ==================== HRM MODULE - NEW APIs ====================

  // Employee Management
  getEmployeeById: async (tenantSlug, employeeId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/employees/${employeeId}`);
  },

  updateEmployee: async (tenantSlug, employeeId, employeeData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(employeeData)
    });
  },

  deleteEmployee: async (tenantSlug, employeeId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/employees/${employeeId}`, {
      method: 'DELETE'
    });
  },

  // Payroll
  processPayroll: async (tenantSlug, payrollData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/payroll/process`, {
      method: 'POST',
      body: JSON.stringify(payrollData)
    });
  },

  getPayrollRecord: async (tenantSlug, payrollId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/payroll/${payrollId}`);
  },

  approvePayroll: async (tenantSlug, payrollId, approvedBy) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/payroll/${payrollId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy })
    });
  },

  // Attendance
  checkIn: async (tenantSlug, employeeId, checkInData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/attendance/check-in`, {
      method: 'POST',
      body: JSON.stringify({ employeeId, ...checkInData })
    });
  },

  checkOut: async (tenantSlug, employeeId, checkOutData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/attendance/check-out`, {
      method: 'POST',
      body: JSON.stringify({ employeeId, ...checkOutData })
    });
  },

  getAttendanceReports: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/attendance/reports?${queryParams}`);
  },

  // Performance
  getPerformanceMetrics: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/performance?${queryParams}`);
  },

  // Onboarding
  getOnboardingChecklist: async (tenantSlug) => {
    return makeRequest(`/api/tenant/${tenantSlug}/organization/hr/onboarding/checklist`);
  },

  // Roles
  getRoles: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/roles?${queryParams}`);
  },

  createRole: async (tenantSlug, roleData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/roles`, {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
  },

  updateRole: async (tenantSlug, roleId, roleData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    });
  },

  deleteRole: async (tenantSlug, roleId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/roles/${roleId}`, {
      method: 'DELETE'
    });
  },

  // Permissions
  getPermissions: async (tenantSlug, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return makeRequest(`/api/tenant/${tenantSlug}/permissions?${queryParams}`);
  },

  createPermission: async (tenantSlug, permissionData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/permissions`, {
      method: 'POST',
      body: JSON.stringify(permissionData)
    });
  },

  updatePermission: async (tenantSlug, permissionId, permissionData) => {
    return makeRequest(`/api/tenant/${tenantSlug}/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(permissionData)
    });
  },

  deletePermission: async (tenantSlug, permissionId) => {
    return makeRequest(`/api/tenant/${tenantSlug}/permissions/${permissionId}`, {
      method: 'DELETE'
    });
  },

};

// Named export for backward compatibility
export { tenantApiService };

export default tenantApiService;