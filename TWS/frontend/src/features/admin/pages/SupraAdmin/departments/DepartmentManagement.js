import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PlusIcon,
  PencilSquareIcon,
  EyeIcon,
  UserGroupIcon,
  UserIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  TrashIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card/Card';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Button } from '../../../../../components/ui/Button/Button';
import { Input, Textarea } from '../../../../../components/ui/Input';
import { DataTable } from '../../../../../components/ui/DataTable/DataTable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../components/ui/Select/Select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../../../components/ui/Tooltip/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../../../../components/ui/Dialog/Dialog';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../components/ui/Tabs/Tabs';
import { Checkbox } from '../../../../../components/ui/Checkbox/Checkbox';
import { Progress } from '../../../../../components/ui/Progress/Progress';
import { Avatar, AvatarFallback } from '../../../../../components/ui/Avatar/Avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '../../../../../components/ui/DropdownMenu/DropdownMenu';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../../../components/ui/Form/Form';
import { get, post, put, del } from '../../../../../shared/utils/apiClient';
import '../styles/DepartmentManagement.css';

const PERMISSIONS = [
  { value: 'read', label: 'Read Only', badge: 'border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'write', label: 'Read & Write', badge: 'border-transparent bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { value: 'admin', label: 'Full Admin', badge: 'border-transparent bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const STATUS_BADGE_VARIANT = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'inactive') return 'destructive';
  return 'secondary';
};

const permissionBadgeClass = (permission) =>
  PERMISSIONS.find((p) => p.value === permission)?.badge ||
  'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';

// Sentinel used because Radix Select items can't have an empty string value.
const NO_PARENT = '__none__';

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Please enter department name'),
  code: z.string().min(1, 'Please enter department code'),
  description: z.string().min(1, 'Please enter description'),
  managerId: z.string().min(1, 'Please select manager'),
  parentId: z.string().optional(),
  budget: z.coerce.number({ invalid_type_error: 'Please enter budget' }).min(0, 'Please enter budget'),
  location: z.string().min(1, 'Please enter location'),
  contact: z.string().min(1, 'Please enter contact'),
  status: z.string().min(1, 'Please select status'),
  permissions: z.array(z.string()).min(1, 'Please select permissions'),
  color: z.string().optional(),
});

const resolveSelectedIds = (selectionState, rows) => {
  const ids = [];
  Object.keys(selectionState).forEach((key) => {
    if (!selectionState[key]) return;
    const path = key.split('.').map(Number);
    let row = rows[path[0]];
    for (let i = 1; i < path.length && row; i++) {
      row = row.children?.[path[i]];
    }
    if (row) ids.push(row.id);
  });
  return ids;
};

const HierarchyNode = ({ dept, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-200 dark:border-gray-700 pl-4' : ''}>
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <Avatar className="h-6 w-6" style={{ backgroundColor: dept.color }}>
          <AvatarFallback className="bg-transparent text-white">
            <Cog6ToothIcon className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm text-gray-900 dark:text-white">{dept.name}</span>
        <Badge variant={STATUS_BADGE_VARIANT(dept.status)}>{dept.status}</Badge>
        <Badge variant="secondary">{dept.employees || 0} employees</Badge>
      </div>
      {hasChildren && expanded && (
        <div>
          {dept.children.map((child) => (
            <HierarchyNode key={child.id} dept={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [rowSelectionState, setRowSelectionState] = useState({});
  const [activeTab, setActiveTab] = useState('departments');
  const [users, setUsers] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const form = useForm({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: '', code: '', description: '', managerId: '', parentId: NO_PARENT,
      budget: 0, location: '', contact: '', status: 'active', permissions: ['read'], color: '#1890ff',
    },
  });

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await get('/api/supra-admin/departments');
      if (response.success && response.data) {
        const transformedDepartments = response.data.map((dept) => ({
          id: dept._id || dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description || '',
          parentId: dept.parentId || dept.parentDepartment || null,
          level: dept.level || 0,
          manager: dept.departmentHead ? {
            id: dept.departmentHead._id || dept.departmentHead.id,
            name: dept.departmentHead.fullName || dept.departmentHead.name,
            email: dept.departmentHead.email,
            role: dept.departmentHead.role,
          } : null,
          budget: dept.budget || dept.metadata?.budget || 0,
          employees: dept.employees || dept.employeeCount || dept.stats?.totalUsers || 0,
          status: dept.status || 'active',
          createdDate: dept.createdAt || dept.createdDate,
          lastModified: dept.updatedAt || dept.lastModified,
          permissions: Array.isArray(dept.permissions) ? dept.permissions : (Array.isArray(dept.defaultPermissions) ? dept.defaultPermissions : ['read']),
          location: dept.location || dept.metadata?.location || '',
          contact: dept.contact || dept.metadata?.contact || '',
          color: dept.color || '#1890ff',
          children: Array.isArray(dept.children) ? dept.children : [],
        }));
        setDepartments(transformedDepartments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await get('/api/supra-admin/users');
      if (response.success && response.data) {
        const transformedUsers = (response.data.users || response.data || []).map((user) => ({
          id: user._id || user.id,
          name: user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          role: user.role || 'User',
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    form.reset({
      name: '', code: '', description: '', managerId: '', parentId: NO_PARENT,
      budget: 0, location: '', contact: '', status: 'active', permissions: ['read'], color: '#1890ff',
    });
    setModalVisible(true);
  };

  const handleEditDepartment = useCallback((record) => {
    setEditingDepartment(record);
    form.reset({
      name: record.name,
      code: record.code,
      description: record.description,
      managerId: record.manager?.id || '',
      parentId: record.parentId || NO_PARENT,
      budget: record.budget || 0,
      location: record.location || '',
      contact: record.contact || '',
      status: record.status || 'active',
      permissions: record.permissions?.length ? record.permissions : ['read'],
      color: record.color || '#1890ff',
    });
    setModalVisible(true);
  }, [form]);

  const handleDeleteDepartment = async (id) => {
    try {
      setLoading(true);
      await del(`/api/supra-admin/departments/${id}`);
      toast.success('Department deleted successfully!');
      await fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    let filtered = departments;

    if (searchText) {
      filtered = filtered.filter((dept) =>
        dept.name.toLowerCase().includes(searchText.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchText.toLowerCase()) ||
        dept.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((dept) => dept.status === filterStatus);
    }

    return filtered;
  }, [departments, searchText, filterStatus]);

  const selectedIds = useMemo(
    () => resolveSelectedIds(rowSelectionState, filteredDepartments),
    [rowSelectionState, filteredDepartments]
  );

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      await Promise.all(selectedIds.map((id) => del(`/api/supra-admin/departments/${id}`)));
      toast.success(`${selectedIds.length} departments deleted successfully!`);
      setRowSelectionState({});
      await fetchDepartments();
    } catch (error) {
      console.error('Error deleting departments:', error);
      toast.error('Failed to delete departments');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    try {
      setLoading(true);

      const departmentData = {
        name: values.name,
        code: values.code,
        description: values.description,
        managerId: values.managerId,
        parentId: values.parentId === NO_PARENT ? null : values.parentId,
        budget: values.budget || 0,
        location: values.location || '',
        contact: values.contact || '',
        status: values.status || 'active',
        permissions: values.permissions || ['read'],
        color: values.color || '#1890ff',
      };

      if (editingDepartment) {
        await put(`/api/supra-admin/departments/${editingDepartment.id}`, departmentData);
        toast.success('Department updated successfully!');
      } else {
        await post('/api/supra-admin/departments', departmentData);
        toast.success('Department created successfully!');
      }

      setModalVisible(false);
      await fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error(error.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    const totalDepartments = departments.length;
    const totalEmployees = departments.reduce((sum, dept) => sum + dept.employees, 0);
    const totalBudget = departments.reduce((sum, dept) => sum + dept.budget, 0);
    const activeDepartments = departments.filter((dept) => dept.status === 'active').length;

    return { totalDepartments, totalEmployees, totalBudget, activeDepartments };
  };

  const handleExportDepartments = () => {
    try {
      const rows = filteredDepartments;
      const headers = ['Name', 'Code', 'Manager', 'Employees', 'Budget', 'Status', 'Location'];
      const csvRows = rows.map((dept) => [
        dept.name || 'N/A',
        dept.code || 'N/A',
        dept.manager?.name || dept.manager?.fullName || 'Not assigned',
        dept.employees || 0,
        (dept.budget || 0).toFixed(2),
        dept.status || 'N/A',
        dept.location || 'N/A',
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `departments-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Departments exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting departments:', error);
      toast.error('Failed to export departments');
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Department',
      enableSorting: true,
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8" style={{ backgroundColor: r.color }}>
            <AvatarFallback className="bg-transparent text-white">
              <Cog6ToothIcon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">{r.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{r.code}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'manager',
      header: 'Manager',
      cell: ({ row: { original: r } }) => {
        if (!r.manager) return <span className="text-sm text-gray-400 dark:text-gray-500">Not assigned</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback><UserIcon className="h-3.5 w-3.5" /></AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm text-gray-900 dark:text-white">{r.manager?.name || r.manager?.fullName || 'Unknown'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{r.manager?.email || ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'employees',
      header: 'Employees',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.employees || 0) - (b.original.employees || 0),
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() || 0}</Badge>,
    },
    {
      accessorKey: 'budget',
      header: 'Budget',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.budget || 0) - (b.original.budget || 0),
      cell: ({ getValue }) => <span className="text-sm text-gray-900 dark:text-white">${(getValue() || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableColumnFilter: true,
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue())}>{(getValue() || '').toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ getValue }) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(getValue()) ? getValue() : ['read']).map((perm) => (
            <Badge key={perm} className={permissionBadgeClass(perm)}>{perm}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ getValue }) => <span className="text-sm text-gray-700 dark:text-gray-300">{getValue()}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><EyeIcon className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditDepartment(r)}>
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><EllipsisHorizontalIcon className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><EyeIcon className="h-4 w-4" />View Details</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleEditDepartment(r)}><PencilSquareIcon className="h-4 w-4" />Edit</DropdownMenuItem>
                <DropdownMenuItem><LockClosedIcon className="h-4 w-4" />Manage Permissions</DropdownMenuItem>
                <DropdownMenuItem><UserGroupIcon className="h-4 w-4" />View Employees</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-700"
                  onSelect={() => setDeleteConfirmId(r.id)}
                >
                  <TrashIcon className="h-4 w-4" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      ),
    },
  ], [handleEditDepartment]);

  const stats = getTotalStats();
  const topLevelParents = departments.filter((dept) => !dept.parentId);

  return (
    <div className="department-management p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BuildingOffice2Icon className="h-6 w-6" /> Department Management
        </h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" disabled>
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Import
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Bulk import isn't available yet</TooltipContent>
          </Tooltip>
          <Button variant="outline" onClick={handleExportDepartments}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleAddDepartment}>
            <PlusIcon className="h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Total Departments</span>
              <BuildingOffice2Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDepartments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Total Employees</span>
              <UserGroupIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalEmployees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Total Budget</span>
              <CurrencyDollarIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">${stats.totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Active Departments</span>
              <CheckCircleIcon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeDepartments}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="departments">
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <div className="relative w-[240px]">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search departments..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchDepartments} disabled={loading}>
                  <ArrowPathIcon className="h-4 w-4" />
                  Refresh
                </Button>
                {selectedIds.length > 0 && (
                  <Button variant="destructive" onClick={() => setBulkDeleteConfirm(true)}>
                    <TrashIcon className="h-4 w-4" />
                    Delete Selected ({selectedIds.length})
                  </Button>
                )}
              </div>

              <DataTable
                columns={columns}
                data={filteredDepartments}
                getSubRows={(row) => row.children}
                enableRowSelection
                onRowSelectionChange={setRowSelectionState}
                pageSize={10}
                emptyMessage="No departments found"
              />
            </TabsContent>

            <TabsContent value="hierarchy">
              <div className="hierarchy-view">
                {topLevelParents.map((dept) => (
                  <HierarchyNode key={dept.id} dept={dept} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Department Budget Distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {departments.map((dept) => (
                      <div key={dept.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">{dept.name}</span>
                          <span className="text-gray-700 dark:text-gray-300">${dept.budget.toLocaleString()}</span>
                        </div>
                        <Progress
                          value={stats.totalBudget ? (dept.budget / stats.totalBudget) * 100 : 0}
                          indicatorClassName="bg-current"
                          style={{ color: dept.color }}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Employee Distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {departments.map((dept) => (
                      <div key={dept.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">{dept.name}</span>
                          <Badge variant="secondary">{dept.employees}</Badge>
                        </div>
                        <Progress
                          value={stats.totalEmployees ? (dept.employees / stats.totalEmployees) * 100 : 0}
                          indicatorClassName="bg-current"
                          style={{ color: dept.color }}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete this department?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => { await handleDeleteDepartment(deleteConfirmId); setDeleteConfirmId(null); }}
      />
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Are you sure you want to delete ${selectedIds.length} departments?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => { await handleBulkDelete(); setBulkDeleteConfirm(false); }}
      />

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Code</FormLabel>
                      <FormControl><Input placeholder="Enter department code" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Enter department description" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Department</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select parent department (optional)" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_PARENT}>— None —</SelectItem>
                          {departments.filter((dept) => !dept.parentId && dept.id !== editingDepartment?.id).map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <FormControl><Input type="number" placeholder="Enter budget" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="Enter location" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl><Input placeholder="Enter contact information" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {PERMISSIONS.map((perm) => (
                          <label key={perm.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={(field.value || []).includes(perm.value)}
                              onCheckedChange={(checked) => {
                                const next = new Set(field.value || []);
                                if (checked) next.add(perm.value); else next.delete(perm.value);
                                field.onChange([...next]);
                              }}
                            />
                            <Badge className={perm.badge}>{perm.label}</Badge>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Color</FormLabel>
                    <FormControl><Input type="color" className="h-10 w-20 p-1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalVisible(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{editingDepartment ? 'Save Changes' : 'Create Department'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
