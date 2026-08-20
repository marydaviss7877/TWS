import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  EyeIcon,
  UserIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  StopCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../../../components/ui/Card/Card';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Button } from '../../../../../components/ui/Button/Button';
import { Input, Textarea } from '../../../../../components/ui/Input';
import { DataTable } from '../../../../../components/ui/DataTable/DataTable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../components/ui/Select/Select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../../../components/ui/Tooltip/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../../../../components/ui/Dialog/Dialog';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../components/ui/Tabs/Tabs';
import { RadioGroup, RadioGroupItem } from '../../../../../components/ui/RadioGroup/RadioGroup';
import { Checkbox } from '../../../../../components/ui/Checkbox/Checkbox';
import { DatePicker } from '../../../../../components/ui/DatePicker/DatePicker';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../../../components/ui/Form/Form';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import moment from 'moment';
import { get, post, del } from '../../../../../shared/utils/apiClient';
import { createLogger } from '../../../../../shared/utils/logger';
import { TableSkeleton } from '../../../../../shared/components/ui/SkeletonLoader';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const logger = createLogger('SessionManagement');

const STATUS_BADGE_VARIANT = (status) => {
  const s = (status || '').toLowerCase();
  if (['active', 'healthy', 'valid'].includes(s)) return 'success';
  if (['suspended', 'warning'].includes(s)) return 'warning';
  if (['terminated', 'expired', 'error'].includes(s)) return 'destructive';
  return 'secondary';
};

const ACCESS_LEVEL_BADGE = {
  viewer: 'border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  contributor: 'border-transparent bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  editor: 'border-transparent bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  admin: 'border-transparent bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  owner: 'border-transparent bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
};

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin' },
  { value: 'delete', label: 'Delete' },
  { value: 'manage_users', label: 'Manage Users' },
  { value: 'view_analytics', label: 'View Analytics' },
  { value: 'export_data', label: 'Export Data' },
];

const accessFormSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  department: z.string().min(1, 'Please select a department'),
  accessLevel: z.string().min(1, 'Please select access level'),
  permissions: z.array(z.string()).min(1, 'Please select permissions'),
  expiresAt: z.date().optional(),
});

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Please enter department name'),
  code: z.string().min(1, 'Please enter department code'),
  description: z.string().optional(),
  departmentHead: z.string().optional(),
});

const SessionManagement = () => {
  const [loading, setLoading] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailsModalVisible, setSessionDetailsModalVisible] = useState(false);

  // Department Access state
  const [departmentAccess, setDepartmentAccess] = useState([]);
  const [filteredDepartmentAccess, setFilteredDepartmentAccess] = useState([]);
  const [accessModalVisible, setAccessModalVisible] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);

  // Tenants state
  const [tenants, setTenants] = useState([]);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Confirm dialogs (Popconfirm replacements)
  const [terminateConfirm, setTerminateConfirm] = useState(null); // sessionId | null
  const [revokeConfirm, setRevokeConfirm] = useState(null); // accessId | null

  // Performance optimizations - debounce search text
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText || '');
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Forms
  const accessForm = useForm({
    resolver: zodResolver(accessFormSchema),
    defaultValues: { userId: '', department: '', accessLevel: '', permissions: [], expiresAt: undefined },
  });
  const departmentForm = useForm({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: '', code: '', description: '', departmentHead: '' },
  });

  // Analytics
  const [sessionAnalytics, setSessionAnalytics] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTenants(),
        fetchSessions(),
        fetchDepartmentAccess(),
        fetchDepartments(),
        fetchAnalytics()
      ]);
    } catch (error) {
      toast.error('Failed to fetch initial data');
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await get('/api/supra-admin/tenants');
      if (response.success && response.tenants) {
        setTenants(response.tenants);
        if (response.tenants.length > 0 && !selectedTenant) {
          setSelectedTenant(response.tenants[0]._id);
        }
      }
    } catch (error) {
      logger.error('Error fetching tenants', error);
      toast.error('Failed to fetch tenants');
    }
  };

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (tenantFilter !== 'all') params.append('tenantId', tenantFilter);

      const response = await get(`/api/supra-admin/sessions/sessions?${params.toString()}`);
      if (response.success && response.sessions) {
        // Transform sessions to match frontend expectations
        const transformedSessions = response.sessions.map(session => ({
          ...session,
          // Ensure userId is an object with expected structure
          userId: session.userId || {
            _id: session.userId?._id || session.userId,
            fullName: session.userId?.fullName || session.userName || 'Unknown',
            email: session.userId?.email || session.email || '',
            role: session.userId?.role || session.role || '',
            department: session.userId?.department || ''
          },
          // Ensure tenantId is an object
          tenantId: session.tenantId || {
            _id: session.tenantId?._id || session.tenantId,
            name: session.tenantId?.name || session.tenantName || 'Unknown',
            slug: session.tenantId?.slug || ''
          }
        }));
        setSessions(transformedSessions);
      }
    } catch (error) {
      logger.error('Error fetching sessions', error);
      toast.error('Failed to fetch sessions');
      setSessions([]);
    }
  };

  const fetchDepartmentAccess = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (tenantFilter !== 'all') params.append('tenantId', tenantFilter);

      const response = await get(`/api/supra-admin/sessions/department-access?${params.toString()}`);
      if (response.success && response.departmentAccess) {
        // Transform to match frontend expectations
        const transformed = response.departmentAccess.map(access => ({
          ...access,
          userId: access.userId || {
            _id: access.userId?._id || access.userId,
            fullName: access.userId?.fullName || access.userName || 'Unknown',
            email: access.userId?.email || access.email || '',
            role: access.userId?.role || access.role || ''
          }
        }));
        setDepartmentAccess(transformed);
      }
    } catch (error) {
      logger.error('Error fetching department access', error);
      toast.error('Failed to fetch department access records');
      setDepartmentAccess([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      if (selectedTenant) {
        const response = await get(`/api/supra-admin/sessions/departments?tenantId=${selectedTenant}`);
        if (response.success && response.departments) {
          setDepartments(response.departments);
        } else if (response.success) {
          setDepartments(response);
        }
      }
    } catch (error) {
      logger.error('Error fetching departments', error);
      toast.error('Failed to fetch departments');
      setDepartments([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (tenantFilter !== 'all') params.append('tenantId', tenantFilter);
      params.append('timeRange', '7d');

      const [sessionResponse] = await Promise.all([
        get(`/api/supra-admin/sessions/analytics/sessions?${params.toString()}`),
        get(`/api/supra-admin/sessions/analytics/department-access?${params.toString()}`)
      ]);

      if (sessionResponse.success && sessionResponse.analytics) {
        setSessionAnalytics(sessionResponse.analytics);
      }
    } catch (error) {
      logger.error('Error fetching analytics', error);
      toast.error('Failed to fetch analytics data');
      setSessionAnalytics({});
    }
  };

  // Memoized filter function to prevent unnecessary recalculations
  const filterData = useCallback(() => {
    let filteredSessionsData = [...sessions];
    let filteredAccessData = [...departmentAccess];

    // Search filter with debounced text
    if (debouncedSearchText && typeof debouncedSearchText === 'string') {
      const searchLower = debouncedSearchText.toLowerCase();
      filteredSessionsData = filteredSessionsData.filter(session =>
        session.userId?.fullName?.toLowerCase().includes(searchLower) ||
        session.userId?.email?.toLowerCase().includes(searchLower) ||
        session.ipAddress?.toLowerCase().includes(searchLower)
      );

      filteredAccessData = filteredAccessData.filter(access =>
        access.userId?.fullName?.toLowerCase().includes(searchLower) ||
        access.userId?.email?.toLowerCase().includes(searchLower) ||
        access.department?.toLowerCase().includes(searchLower)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filteredSessionsData = filteredSessionsData.filter(session =>
        session.departmentAccess?.some(da => da.department === departmentFilter && da.isActive)
      );
      filteredAccessData = filteredAccessData.filter(access => access.department === departmentFilter);
    }

    setFilteredSessions(filteredSessionsData);
    setFilteredDepartmentAccess(filteredAccessData);
  }, [sessions, departmentAccess, debouncedSearchText, departmentFilter]);

  // Apply filters when data or filters change
  useEffect(() => {
    filterData();
  }, [filterData]);

  const handleTerminateSession = async (sessionId) => {
    try {
      const response = await del(`/api/supra-admin/sessions/sessions/${sessionId}`, {
        reason: 'Terminated by SupraAdmin'
      });

      if (response.success) {
        toast.success('Session terminated successfully');
        fetchSessions();
      } else {
        throw new Error(response.message || 'Failed to terminate session');
      }
    } catch (error) {
      logger.error('Failed to terminate session', error);
      toast.error(error.message || 'Failed to terminate session');
    }
  };

  const handleGrantDepartmentAccess = async (values) => {
    try {
      const response = await post('/api/supra-admin/sessions/department-access', {
        ...values,
        tenantId: selectedTenant
      });

      if (response.success) {
        toast.success('Department access granted successfully');
        setAccessModalVisible(false);
        accessForm.reset();
        fetchDepartmentAccess();
      } else {
        throw new Error(response.message || 'Failed to grant department access');
      }
    } catch (error) {
      logger.error('Failed to grant department access', error);
      toast.error(error.message || 'Failed to grant department access');
    }
  };

  const handleRevokeDepartmentAccess = async (accessId) => {
    try {
      const response = await post(`/api/supra-admin/sessions/department-access/${accessId}/revoke`, {
        reason: 'Revoked by SupraAdmin'
      });

      if (response.success) {
        toast.success('Department access revoked successfully');
        fetchDepartmentAccess();
      } else {
        throw new Error(response.message || 'Failed to revoke department access');
      }
    } catch (error) {
      logger.error('Failed to revoke department access', error);
      toast.error(error.message || 'Failed to revoke department access');
    }
  };

  const handleCreateDepartment = async (values) => {
    try {
      const response = await post('/api/supra-admin/sessions/departments', {
        ...values,
        tenantId: selectedTenant
      });

      if (response.success) {
        toast.success('Department created successfully');
        setDepartmentModalVisible(false);
        departmentForm.reset();
        fetchDepartments();
      } else {
        throw new Error(response.message || 'Failed to create department');
      }
    } catch (error) {
      logger.error('Failed to create department', error);
      toast.error(error.message || 'Failed to create department');
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (userAgent?.includes('Mobile')) return <DevicePhoneMobileIcon className="h-4 w-4" />;
    if (userAgent?.includes('Tablet')) return <DeviceTabletIcon className="h-4 w-4" />;
    return <ComputerDesktopIcon className="h-4 w-4" />;
  };

  // Memoized responsive table columns
  const sessionColumns = useMemo(() => [
    {
      accessorKey: 'userId',
      header: 'User',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.userId?.fullName || '').localeCompare(b.original.userId?.fullName || ''),
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{r.userId?.fullName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{r.userId?.email}</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">{r.userId?.department}</div>
        </div>
      ),
    },
    {
      id: 'tenantId',
      header: 'Tenant',
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{r.tenantId?.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">/{r.tenantId?.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: 'userAgent',
      header: 'Device',
      cell: ({ getValue }) => {
        const userAgent = getValue();
        return (
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            {getDeviceIcon(userAgent)}
            {userAgent?.includes('Chrome') ? 'Chrome' :
             userAgent?.includes('Firefox') ? 'Firefox' :
             userAgent?.includes('Safari') ? 'Safari' : 'Unknown'}
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ getValue }) => <code className="text-xs">{getValue()}</code>,
    },
    {
      id: 'departmentAccess',
      header: 'Department Access',
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-wrap gap-1">
          {(r.departmentAccess || []).filter((da) => da.isActive).map((da) => (
            <Badge key={da.department} className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {da.department}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableColumnFilter: true,
      filterFn: (row, columnId, value) => !value || row.getValue(columnId) === value,
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || 'unknown').toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      enableSorting: true,
      sortingFn: (a, b) => new Date(a.original.lastActivity || 0) - new Date(b.original.lastActivity || 0),
      cell: ({ getValue }) => <span className="text-xs text-gray-500 dark:text-gray-400">{moment(getValue()).fromNow()}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setSelectedSession(r); setSessionDetailsModalVisible(true); }}
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            {r.status === 'active' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700"
                    onClick={() => setTerminateConfirm(r._id)}
                  >
                    <StopCircleIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Terminate Session</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ], []);

  const departmentAccessColumns = useMemo(() => [
    {
      id: 'userId',
      header: 'User',
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{r.userId?.fullName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{r.userId?.email}</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">{r.userId?.role}</div>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ getValue }) => (
        <Badge className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 gap-1">
          <BuildingOffice2Icon className="h-3 w-3" />
          {getValue()}
        </Badge>
      ),
    },
    {
      accessorKey: 'accessLevel',
      header: 'Access Level',
      cell: ({ getValue }) => <Badge className={ACCESS_LEVEL_BADGE[getValue()] || 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}>{(getValue() || '').toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ getValue }) => (
        <div className="flex flex-wrap gap-1">
          {(getValue() || []).map((permission) => (
            <Badge key={permission} variant="secondary">{permission}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || 'unknown').toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'lastAccessed',
      header: 'Last Accessed',
      enableSorting: true,
      sortingFn: (a, b) => new Date(a.original.lastAccessed || 0) - new Date(b.original.lastAccessed || 0),
      cell: ({ getValue }) => <span className="text-xs text-gray-500 dark:text-gray-400">{moment(getValue()).fromNow()}</span>,
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ getValue }) => <span className="text-xs text-gray-500 dark:text-gray-400">{getValue() ? moment(getValue()).format('MMM DD, YYYY') : 'Never'}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedSession(null); }}>
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            {r.status === 'active' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700"
                    onClick={() => setRevokeConfirm(r._id)}
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Revoke Access</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ], []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage tenant sessions and department access control</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchInitialData}>
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Active Sessions</span>
              <ComputerDesktopIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionAnalytics.activeSessions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Total Sessions</span>
              <GlobeAltIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sessionAnalytics.totalSessions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Unique Users</span>
              <UserIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{sessionAnalytics.uniqueUsers || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Departments</span>
              <BuildingOffice2Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{departments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-[220px]">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search users, emails, IPs..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tenant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant._id} value={tenant._id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept.name}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="sessions">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="sessions">Active Sessions ({filteredSessions.length})</TabsTrigger>
              <TabsTrigger value="department-access">Department Access ({filteredDepartmentAccess.length})</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions">
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : (
                <DataTable columns={sessionColumns} data={filteredSessions} pageSize={20} emptyMessage="No sessions found" />
              )}
            </TabsContent>

            <TabsContent value="department-access">
              <div className="mb-4">
                <Button onClick={() => setAccessModalVisible(true)}>
                  <PlusIcon className="h-4 w-4" />
                  Grant Department Access
                </Button>
              </div>
              {loading ? (
                <TableSkeleton columns={8} rows={5} />
              ) : (
                <DataTable columns={departmentAccessColumns} data={filteredDepartmentAccess} pageSize={20} emptyMessage="No access records found" />
              )}
            </TabsContent>

            <TabsContent value="departments">
              <div className="mb-4">
                <Button onClick={() => setDepartmentModalVisible(true)}>
                  <PlusIcon className="h-4 w-4" />
                  Create Department
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((department) => (
                  <Card key={department._id}>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle>{department.name}</CardTitle>
                      <Badge className="border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{department.code}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{department.description}</p>
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Users: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{department.stats?.totalUsers || 0}</span>
                        <br />
                        <span className="text-gray-500 dark:text-gray-400">Status: </span>
                        <Badge variant={department.status === 'active' ? 'success' : 'destructive'}>{department.status}</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button variant="ghost" size="sm"><EyeIcon className="h-4 w-4" />View</Button>
                      <Button variant="ghost" size="sm"><PencilSquareIcon className="h-4 w-4" />Edit</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Sessions by Department</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(sessionAnalytics.sessionsByDepartment || {}).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(sessionAnalytics.sessionsByDepartment || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Hourly Session Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={sessionAnalytics.hourlyDistribution?.map((value, index) => ({ hour: index, sessions: value })) || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="sessions" fill="#1890ff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Terminate / Revoke confirmations (Popconfirm replacements) */}
      <ConfirmDialog
        open={!!terminateConfirm}
        onOpenChange={(open) => !open && setTerminateConfirm(null)}
        title="Terminate this session?"
        description="The user will be signed out immediately."
        confirmLabel="Terminate"
        variant="destructive"
        onConfirm={async () => { await handleTerminateSession(terminateConfirm); setTerminateConfirm(null); }}
      />
      <ConfirmDialog
        open={!!revokeConfirm}
        onOpenChange={(open) => !open && setRevokeConfirm(null)}
        title="Revoke this access?"
        description="The user will immediately lose access to this department."
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={async () => { await handleRevokeDepartmentAccess(revokeConfirm); setRevokeConfirm(null); }}
      />

      {/* Session Details Modal */}
      <Dialog open={sessionDetailsModalVisible} onOpenChange={(open) => { if (!open) { setSessionDetailsModalVisible(false); setSelectedSession(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Details - {selectedSession?.userId?.fullName}</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="access">Department Access</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><dt className="text-gray-500 dark:text-gray-400">User</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedSession.userId?.fullName}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedSession.userId?.email}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Tenant</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedSession.tenantId?.name}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">IP Address</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedSession.ipAddress}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Device</dt><dd className="font-medium text-gray-900 dark:text-white truncate">{selectedSession.userAgent}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge variant={STATUS_BADGE_VARIANT(selectedSession.status)}>{selectedSession.status}</Badge></dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Login Time</dt><dd className="font-medium text-gray-900 dark:text-white">{moment(selectedSession.loginTime).format('MMM DD, YYYY HH:mm')}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Last Activity</dt><dd className="font-medium text-gray-900 dark:text-white">{moment(selectedSession.lastActivity).fromNow()}</dd></div>
                </dl>
              </TabsContent>
              <TabsContent value="access">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(selectedSession.departmentAccess || []).map((access) => (
                    <li key={access.department} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{access.department}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Permissions: {(access.permissions || []).join(', ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Granted: {moment(access.grantedAt).format('MMM DD, YYYY')}</p>
                        {access.expiresAt && <p className="text-xs text-gray-500 dark:text-gray-400">Expires: {moment(access.expiresAt).format('MMM DD, YYYY')}</p>}
                      </div>
                      <Badge variant={access.isActive ? 'success' : 'destructive'}>{access.isActive ? 'Active' : 'Inactive'}</Badge>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="activity">
                <ul className="space-y-4">
                  {(selectedSession.activities || []).map((activity, i) => (
                    <li key={i} className="relative pl-5 border-l-2 border-gray-200 dark:border-gray-700">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary-500" />
                      <p className="text-sm"><b className="text-gray-900 dark:text-white">{activity.action}</b> - {activity.resource}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{moment(activity.timestamp).format('MMM DD, YYYY HH:mm')}</p>
                    </li>
                  ))}
                  {!(selectedSession.activities || []).length && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded</p>
                  )}
                </ul>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Department Access Modal */}
      <Dialog open={accessModalVisible} onOpenChange={(open) => { if (!open) { setAccessModalVisible(false); accessForm.reset(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Grant Department Access</DialogTitle></DialogHeader>
          <Form {...accessForm}>
            <form onSubmit={accessForm.handleSubmit(handleGrantDepartmentAccess)} className="space-y-4">
              <FormField
                control={accessForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    {/* This would be populated with users from the selected tenant */}
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      </FormControl>
                      <SelectContent />
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accessForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept._id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accessForm.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-4 gap-y-2">
                        {['viewer', 'contributor', 'editor', 'admin'].map((level) => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <RadioGroupItem value={level} />
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accessForm.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {PERMISSION_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <Checkbox
                              checked={(field.value || []).includes(opt.value)}
                              onCheckedChange={(checked) => {
                                const next = new Set(field.value || []);
                                if (checked) next.add(opt.value); else next.delete(opt.value);
                                field.onChange([...next]);
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accessForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} className="w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setAccessModalVisible(false); accessForm.reset(); }}>Cancel</Button>
                <Button type="submit">Grant Access</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Department Modal */}
      <Dialog open={departmentModalVisible} onOpenChange={(open) => { if (!open) { setDepartmentModalVisible(false); departmentForm.reset(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Department</DialogTitle></DialogHeader>
          <Form {...departmentForm}>
            <form onSubmit={departmentForm.handleSubmit(handleCreateDepartment)} className="space-y-4">
              <FormField
                control={departmentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name</FormLabel>
                    <FormControl><Input placeholder="Enter department name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={departmentForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Code</FormLabel>
                    <FormControl><Input placeholder="Enter department code" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={departmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Enter department description" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={departmentForm.control}
                name="departmentHead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Head</FormLabel>
                    {/* This would be populated with users from the selected tenant */}
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select department head" /></SelectTrigger>
                      </FormControl>
                      <SelectContent />
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDepartmentModalVisible(false); departmentForm.reset(); }}>Cancel</Button>
                <Button type="submit">Create Department</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionManagement;
