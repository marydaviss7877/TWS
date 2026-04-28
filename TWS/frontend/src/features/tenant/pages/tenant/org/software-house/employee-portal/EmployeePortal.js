import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../../../../../../app/providers/AuthContext';
import { useTenantAuth } from '../../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../../contexts/TenantPermissionsContext';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import {
  UserIcon,
  ClockIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as ClockIconSolid,
  FolderIcon
} from '@heroicons/react/24/outline';
import EmployeeProfileView from './EmployeeProfileView';
import EmployeeAttendanceView from './EmployeeAttendanceView';
import EmployeeLeaveRequests from './EmployeeLeaveRequests';
import EmployeePerformanceView from './EmployeePerformanceView';
import EmployeePayrollView from './EmployeePayrollView';
import EmployeeDocumentsView from './EmployeeDocumentsView';
import EmployeeWorkspacesView from './EmployeeWorkspacesView';
import { getAccessLevel, PORTAL_SECTIONS } from './employeePortalAccessLevels';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';

// Protects a portal section by role; redirects to portal dashboard if no access
const ProtectedPortalRoute = ({ section, canAccessSection, tenantSlug, children }) => {
  if (!canAccessSection(section)) {
    return <Navigate to={`/${tenantSlug}/org/software-house/employee-portal`} replace />;
  }
  return children;
};

const EmployeePortal = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { user: tenantUser, loading: tenantAuthLoading } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const user = tenantUser || authUser;
  const toastShown = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    attendance: { present: 0, absent: 0, late: 0 },
    leaveBalance: { annual: 0, sick: 0, personal: 0 },
    upcomingReviews: 0,
    pendingTasks: 0,
    recentAnnouncements: []
  });

  const isOwnerOrAdmin =
    hasModulePermission?.('users', 'admin') ||
    hasModulePermission?.('projects', 'admin') ||
    hasModulePermission?.('payroll', 'admin');
  const accessLevel = getAccessLevel(user?.role);
  const userRoleLabel = accessLevel.label;
  const canAccessPortalSection = (section) => {
    if (!hasModulePermission) return true;
    switch (section) {
      case PORTAL_SECTIONS.DASHBOARD:
      case PORTAL_SECTIONS.WORKSPACES:
      case PORTAL_SECTIONS.PROFILE:
        return true;
      case PORTAL_SECTIONS.ATTENDANCE:
        return hasModulePermission('attendance', 'read') || hasModulePermission('attendance', 'read_own');
      case PORTAL_SECTIONS.LEAVE:
        return hasModulePermission('leave', 'read') || hasModulePermission('leave', 'read_own');
      case PORTAL_SECTIONS.PERFORMANCE:
        return hasModulePermission('employees', 'read') || hasModulePermission('employees', 'read_own');
      case PORTAL_SECTIONS.PAYROLL:
        return hasModulePermission('payroll', 'read') || hasModulePermission('payroll', 'read_own');
      case PORTAL_SECTIONS.DOCUMENTS:
        return hasModulePermission('documents', 'read') || hasModulePermission('projects', 'read');
      default:
        return true;
    }
  };

  useEffect(() => {
    if (tenantAuthLoading) return;
    if (isOwnerOrAdmin && tenantSlug && !toastShown.current) {
      toastShown.current = true;
      toast.error('Employee Portal is not available in the admin panel. Use HR and other admin sections instead.');
    }
  }, [isOwnerOrAdmin, tenantSlug, tenantAuthLoading]);

  useEffect(() => {
    if (user && tenantSlug && !isOwnerOrAdmin) {
      fetchEmployeeData();
    }
  }, [user, tenantSlug, isOwnerOrAdmin]);

  if (tenantAuthLoading) {
    return <LoadingSpinner message="Loading employee portal..." className="min-h-[30vh] bg-transparent" />;
  }

  if (isOwnerOrAdmin) {
    return <Navigate to={`/${tenantSlug}/org/dashboard`} replace />;
  }

  const fetchEmployeeData = async () => {
    try {
      setLoadError('');
      // Find employee by user ID
      const response = await tenantApiService.getEmployees(tenantSlug, {
        userId: user.id
      });

      const employees = response?.employees || response?.data?.employees || [];
      if (employees.length > 0) {
        const employee = employees[0];
        setEmployeeData(employee);
        fetchDashboardStats(employee);
      } else {
        // Try direct employee endpoint
        const empResponse = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees?userId=${user.id}`, {
          credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
        });
        const empData = await empResponse.json();
        if (empData.data?.employees?.length > 0) {
          const employee = empData.data.employees[0];
          setEmployeeData(employee);
          fetchDashboardStats(employee);
        }
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
      setLoadError(error?.message || 'Failed to load employee information');
      toast.error('Failed to load employee information');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (employee = null) => {
    try {
      // Fetch attendance stats
      const attendanceRes = await fetch(`/api/tenant/${tenantSlug}/organization/hr/attendance?employeeId=${user.id}&stats=true`, {
        credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
      });
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        if (attendanceData.data) {
          const attendanceSummary = attendanceData.data.summary || {};
          setDashboardStats(prev => ({
            ...prev,
            attendance: {
              present: attendanceSummary.present || 0,
              absent: attendanceSummary.absent || 0,
              late: attendanceSummary.late || 0
            }
          }));
        }
      }

      // Fetch leave balance
      const employeeId = employee?._id || employeeData?._id;
      if (employeeId) {
        const leaveRes = await fetch(`/api/tenant/${tenantSlug}/organization/hr/employees/${employeeId}`, {
          credentials: 'include' // SECURITY FIX: Use cookies instead of localStorage token
        });
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          if (leaveData.data?.employee?.leaveBalance) {
            setDashboardStats(prev => ({
              ...prev,
              leaveBalance: leaveData.data.employee.leaveBalance
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const allMenuItems = [
    { id: PORTAL_SECTIONS.DASHBOARD, label: 'Dashboard', icon: BriefcaseIcon, path: '' },
    { id: PORTAL_SECTIONS.WORKSPACES, label: 'My Workspaces', icon: FolderIcon, path: 'workspaces' },
    { id: PORTAL_SECTIONS.PROFILE, label: 'My Profile', icon: UserIcon, path: 'profile' },
    { id: PORTAL_SECTIONS.ATTENDANCE, label: 'Attendance', icon: ClockIcon, path: 'attendance' },
    { id: PORTAL_SECTIONS.LEAVE, label: 'Leave Requests', icon: CalendarIcon, path: 'leave' },
    { id: PORTAL_SECTIONS.PERFORMANCE, label: 'Performance', icon: ChartBarIcon, path: 'performance' },
    { id: PORTAL_SECTIONS.PAYROLL, label: 'Payroll', icon: CurrencyDollarIcon, path: 'payroll' },
    { id: PORTAL_SECTIONS.DOCUMENTS, label: 'Documents', icon: DocumentTextIcon, path: 'documents' }
  ];
  const menuItems = allMenuItems.filter((item) => canAccessPortalSection(item.id));

  if (loading) {
    return <LoadingSpinner message="Loading employee portal..." className="min-h-[60vh] bg-transparent" />;
  }

  if (loadError) {
    return <ErrorState title="Employee portal unavailable" message={loadError} onRetry={fetchEmployeeData} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Portal</h1>
              <p className="text-sm text-gray-500 mt-1">
                Welcome back, {user?.fullName || 'Employee'}
                {userRoleLabel && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">
                    {userRoleLabel}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 bg-white rounded-lg shadow-sm p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = window.location.pathname.endsWith(item.path) || 
                  (item.path === '' && window.location.pathname.endsWith('employee-portal'));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/${tenantSlug}/org/software-house/employee-portal/${item.path}`)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content - routes protected by access level */}
          <div className="flex-1">
            <Routes>
              <Route index element={<ProtectedPortalRoute section={PORTAL_SECTIONS.DASHBOARD} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeDashboardContent stats={dashboardStats} employee={employeeData} /></ProtectedPortalRoute>} />
              <Route path="workspaces" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.WORKSPACES} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeWorkspacesView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="profile" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.PROFILE} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeProfileView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="attendance" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.ATTENDANCE} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeAttendanceView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="leave" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.LEAVE} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeLeaveRequests tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="performance" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.PERFORMANCE} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeePerformanceView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="payroll" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.PAYROLL} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeePayrollView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="documents" element={<ProtectedPortalRoute section={PORTAL_SECTIONS.DOCUMENTS} canAccessSection={canAccessPortalSection} tenantSlug={tenantSlug}><EmployeeDocumentsView tenantSlug={tenantSlug} /></ProtectedPortalRoute>} />
              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Content Component
const EmployeeDashboardContent = ({ stats, employee }) => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Attendance This Month',
      value: `${stats.attendance.present} days`,
      subtitle: `${stats.attendance.absent} absences`,
      icon: CheckCircleIcon,
      color: 'green',
      path: 'attendance'
    },
    {
      title: 'Leave Balance',
      value: `${stats.leaveBalance.annual} days`,
      subtitle: 'Annual leave remaining',
      icon: CalendarIcon,
      color: 'blue',
      path: 'leave'
    },
    {
      title: 'Upcoming Reviews',
      value: stats.upcomingReviews,
      subtitle: 'Performance reviews scheduled',
      icon: ChartBarIcon,
      color: 'purple',
      path: 'performance'
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      subtitle: 'Tasks requiring attention',
      icon: BriefcaseIcon,
      color: 'orange',
      path: 'workspaces'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to Your Portal</h2>
        <p className="text-purple-100">
          Access your information, manage your requests, and stay updated with your work.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = {
            green: 'bg-green-50 text-green-600 border-green-200',
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
            orange: 'bg-orange-50 text-orange-600 border-orange-200'
          };

          return (
            <div
              key={index}
              onClick={() => card.path !== '#' && navigate(`/${tenantSlug}/org/software-house/employee-portal/${card.path}`)}
              className={`bg-white rounded-lg shadow-sm border-2 ${colorClasses[card.color]} p-6 cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 text-${card.color}-600`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/software-house/employee-portal/workspaces`)}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FolderIcon className="h-6 w-6 text-purple-600" />
            <span className="font-medium text-gray-700">My Workspaces</span>
          </button>
          <button
            onClick={() => navigate(`/${tenantSlug}/org/software-house/employee-portal/leave`)}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CalendarIcon className="h-6 w-6 text-purple-600" />
            <span className="font-medium text-gray-700">Request Leave</span>
          </button>
          <button
            onClick={() => navigate(`/${tenantSlug}/org/software-house/employee-portal/attendance`)}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClockIconSolid className="h-6 w-6 text-purple-600" />
            <span className="font-medium text-gray-700">View Attendance</span>
          </button>
          <button
            onClick={() => navigate(`/${tenantSlug}/org/software-house/employee-portal/profile`)}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserIcon className="h-6 w-6 text-purple-600" />
            <span className="font-medium text-gray-700">Update Profile</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {stats.recentAnnouncements.length > 0 ? (
            stats.recentAnnouncements.map((announcement, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <BellIcon className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{announcement.title}</p>
                  <p className="text-xs text-gray-500">{announcement.date}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;
