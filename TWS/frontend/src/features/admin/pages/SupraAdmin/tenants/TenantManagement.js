import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  UserGroupIcon,
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../../../components/ui/Form/Form';
import moment from 'moment';

// Must exactly match LEGITIMATE_ACCESS_REASONS in
// backend/src/services/tenant/platform-admin-access.service.js
const ACCESS_REASONS = [
  { value: 'support_troubleshooting', label: 'Support / Troubleshooting' },
  { value: 'billing_dispute', label: 'Billing Dispute' },
  { value: 'security_incident', label: 'Security Incident' },
  { value: 'data_migration', label: 'Data Migration' },
  { value: 'compliance_audit', label: 'Compliance Audit' },
  { value: 'legal_request', label: 'Legal Request' },
  { value: 'system_maintenance', label: 'System Maintenance' },
  { value: 'onboarding_assistance', label: 'Onboarding Assistance' },
];

const DELETE_JUSTIFICATION_MIN = { single: 30, bulk: 50 };

const planBadgeClass = {
  trial: 'border-transparent bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  basic: 'border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  professional: 'border-transparent bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  enterprise: 'border-transparent bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

const editTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

const TenantManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ visible: false, mode: null, id: null });
  const [justification, setJustification] = useState('');
  const [accessReason, setAccessReason] = useState(undefined);
  const [statusConfirm, setStatusConfirm] = useState(null); // { id, status, tenantName } | null

  const editForm = useForm({
    resolver: zodResolver(editTenantSchema),
    defaultValues: { name: '', slug: '', email: '' },
  });

  // Reset the form each time a different tenant is opened for editing — the equivalent of
  // antd's `key={selectedTenant._id}` remount + `initialValues` on the old Form.
  useEffect(() => {
    if (selectedTenant) {
      editForm.reset({
        name: selectedTenant.name || '',
        slug: selectedTenant.slug || '',
        email: selectedTenant.email || selectedTenant.contactInfo?.email || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?._id]);

  const openDeleteModal = (id) => {
    setJustification('');
    setAccessReason(undefined);
    setDeleteModal({ visible: true, mode: 'single', id });
  };

  const openBulkDeleteModal = () => {
    setJustification('');
    setAccessReason(undefined);
    setDeleteModal({ visible: true, mode: 'bulk', id: null });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ visible: false, mode: null, id: null });
    setJustification('');
    setAccessReason(undefined);
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/supra-admin/tenants?limit=100', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Tenants API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Tenants API Response:', {
        tenantsCount: data.tenants?.length || 0,
        total: data.pagination?.total || 0,
        summary: data.summary
      });

      setTenants(data.tenants || []);
    } catch (e) {
      console.error('Fetch tenants error:', e);
      toast.error(e.message || 'Failed to fetch tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!tenants.length) {
      setFilteredTenants([]);
      return;
    }
    let f = [...tenants];
    const q = (searchText || '').toLowerCase();
    if (q) {
      f = f.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const email = (t.email || t.contactInfo?.email || '').toLowerCase();
        const slug = (t.slug || '').toLowerCase();
        return name.includes(q) || email.includes(q) || slug.includes(q);
      });
    }
    if (statusFilter !== 'all') f = f.filter((t) => t.status === statusFilter);
    if (planFilter !== 'all') {
      f = f.filter((t) => {
        const p = (t.plan || t.subscription?.plan || '').toLowerCase();
        return p === planFilter.toLowerCase();
      });
    }
    if (categoryFilter !== 'all') f = f.filter((t) => (t.erpCategory || 'software_house') === categoryFilter);
    setFilteredTenants(f);
  }, [tenants, searchText, statusFilter, planFilter, categoryFilter]);

  const handleEditTenant = async (values) => {
    if (!selectedTenant?._id) return;
    try {
      const res = await fetch(`/api/supra-admin/tenants/${selectedTenant._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          slug: values.slug,
          email: values.email,
          accessReason: 'system_maintenance',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.map((t) => (t._id === selectedTenant._id ? { ...t, ...data } : t)));
      setFilteredTenants((prev) => prev.map((t) => (t._id === selectedTenant._id ? { ...t, ...data } : t)));
      setEditModalVisible(false);
      setSelectedTenant(null);
      toast.success('Tenant updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (id, deleteJustification, deleteAccessReason) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/supra-admin/tenants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: deleteJustification, accessReason: deleteAccessReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.filter((t) => t._id !== id));
      setFilteredTenants((prev) => prev.filter((t) => t._id !== id));
      setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
      toast.success('Tenant deleted');
    } catch (e) {
      toast.error(e.message || 'Failed to delete tenant');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async (deleteJustification, deleteAccessReason) => {
    if (!selectedRowKeys.length) return;
    try {
      setBulkDeleting(true);
      const res = await fetch('/api/supra-admin/tenants/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRowKeys, justification: deleteJustification, accessReason: deleteAccessReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const { deleted = [], failed = [] } = data.data || {};
      setTenants((prev) => prev.filter((t) => !deleted.includes(t._id)));
      setFilteredTenants((prev) => prev.filter((t) => !deleted.includes(t._id)));
      setSelectedRowKeys([]);
      await fetchTenants();
      if (failed.length > 0) {
        toast(`${deleted.length} deleted, ${failed.length} failed.`, { icon: '⚠️' });
      } else {
        toast.success(`${deleted.length} tenant(s) deleted.`);
      }
    } catch (e) {
      toast.error(e.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    const { mode, id } = deleteModal;
    if (mode === 'single') {
      await handleDeleteTenant(id, justification, accessReason);
    } else if (mode === 'bulk') {
      await handleBulkDelete(justification, accessReason);
    }
    closeDeleteModal();
  };

  const applyStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/supra-admin/tenants/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, accessReason: 'system_maintenance' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setTenants((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
      setFilteredTenants((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
      toast.success('Status updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleStatusChange = (id, status, tenantName) => {
    // Access-reducing transitions cut the tenant off immediately — confirm before firing.
    if (status === 'suspended' || status === 'cancelled') {
      setStatusConfirm({ id, status, tenantName });
      return;
    }
    applyStatusChange(id, status);
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Tenant',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.name || '').localeCompare(b.original.name || ''),
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{r.name || 'N/A'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{r.email || r.contactInfo?.email || 'N/A'}</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">/{r.slug || 'N/A'}</div>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      cell: ({ row: { original: r } }) => {
        if (r.erpCategory !== 'software_house') return <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>;
        const p = (r.plan || r.subscription?.plan || 'Trial').toString();
        return <Badge className={planBadgeClass[p.toLowerCase()] || 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}>{p}</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row: { original: r } }) => (
        <Select value={r.status} onValueChange={(v) => handleStatusChange(r._id, v, r.name)}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      cell: ({ row: { original: r } }) => {
        const a = r.usage?.activeUsers ?? r.users;
        const t = r.usage?.totalUsers ?? r.users;
        if (a == null && t == null) return '—';
        return `${a ?? '—'} / ${t ?? '—'}`;
      },
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.revenue ?? a.original.subscription?.revenue ?? 0) - (b.original.revenue ?? b.original.subscription?.revenue ?? 0),
      cell: ({ row: { original: r } }) => {
        const n = r.revenue ?? r.subscription?.revenue ?? 0;
        return <span className={n > 0 ? 'font-semibold text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>${Number(n).toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      enableSorting: true,
      sortingFn: (a, b) => new Date(a.original.createdAt || 0) - new Date(b.original.createdAt || 0),
      cell: ({ getValue }) => (getValue() ? moment(getValue()).format('MMM DD, YYYY') : 'N/A'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTenant(r); setViewModalVisible(true); }}>
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/supra-admin/tenants/users?tenantId=${r._id}`)}>
                  <UserGroupIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View users</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTenant(r); setEditModalVisible(true); }}>
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700"
                  disabled={!!deletingId}
                  onClick={() => openDeleteModal(r._id)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-3">
          <CardTitle>Tenants</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={fetchTenants} disabled={loading}>
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {selectedRowKeys.length > 0 && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedRowKeys.length} selected</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedRowKeys([])} disabled={bulkDeleting}>Clear</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkDeleting}
                  onClick={openBulkDeleteModal}
                >
                  <TrashIcon className="h-4 w-4" />
                  Bulk delete
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative w-[220px]">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, email, slug"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="software_house">Software house</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 dark:text-gray-400">{filteredTenants.length} of {tenants.length}</span>
          </div>

          <DataTable
            columns={columns}
            data={filteredTenants}
            enableRowSelection
            onRowSelectionChange={(sel) => {
              const ids = Object.keys(sel).filter((k) => sel[k]).map((idx) => filteredTenants[idx]?._id).filter(Boolean);
              setSelectedRowKeys(ids);
            }}
            pageSize={20}
            emptyMessage="No tenants found"
          />
        </CardContent>
      </Card>

      {/* Delete confirmation (single or bulk) */}
      <Dialog open={deleteModal.visible} onOpenChange={(open) => !open && closeDeleteModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteModal.mode === 'bulk'
                ? `Permanently delete ${selectedRowKeys.length} tenant(s)?`
                : 'Permanently delete this tenant?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-red-600 dark:text-red-400">This cannot be undone. All associated data will be permanently deleted.</p>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Access reason (required)</label>
            <Select value={accessReason} onValueChange={setAccessReason}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {ACCESS_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Justification (minimum {DELETE_JUSTIFICATION_MIN[deleteModal.mode || 'single']} characters, required for the audit log)
            </label>
            <Textarea
              rows={3}
              className="mt-2"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this tenant is being deleted..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {justification.trim().length} / {DELETE_JUSTIFICATION_MIN[deleteModal.mode || 'single']}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={
                !accessReason ||
                justification.trim().length < DELETE_JUSTIFICATION_MIN[deleteModal.mode || 'single']
              }
              onClick={handleConfirmDelete}
            >
              {(deleteModal.mode === 'bulk' ? bulkDeleting : deletingId === deleteModal.id) ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / cancel confirmation */}
      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        title={statusConfirm?.status === 'suspended' ? 'Suspend this tenant?' : 'Cancel this tenant?'}
        description={`${statusConfirm?.tenantName || 'This tenant'} will immediately lose access to the platform.`}
        confirmLabel={statusConfirm?.status === 'suspended' ? 'Suspend' : 'Cancel tenant'}
        cancelLabel="Keep current status"
        variant="destructive"
        onConfirm={async () => {
          await applyStatusChange(statusConfirm.id, statusConfirm.status);
          setStatusConfirm(null);
        }}
      />

      {/* Edit tenant */}
      <Dialog open={editModalVisible} onOpenChange={(open) => { if (!open) { setEditModalVisible(false); setSelectedTenant(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit: {selectedTenant?.name}</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditTenant)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (immutable)</FormLabel>
                      <FormControl><Input {...field} disabled title="Slug cannot be changed after creation (FR2)" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setEditModalVisible(false); setSelectedTenant(null); }}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* View tenant */}
      <Dialog open={viewModalVisible && !!selectedTenant} onOpenChange={(open) => { if (!open) { setViewModalVisible(false); setSelectedTenant(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTenant?.name}</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="grid gap-2 text-sm">
              <div><b className="text-gray-700 dark:text-gray-300">Slug:</b> {selectedTenant.slug || '—'}</div>
              <div><b className="text-gray-700 dark:text-gray-300">Email:</b> {selectedTenant.email || selectedTenant.contactInfo?.email || '—'}</div>
              <div><b className="text-gray-700 dark:text-gray-300">Category:</b> {(selectedTenant.erpCategory || 'software_house').replace(/_/g, ' ')}</div>
              <div className="flex items-center gap-1.5">
                <b className="text-gray-700 dark:text-gray-300">Plan:</b>
                {selectedTenant.erpCategory !== 'software_house' ? (
                  <span className="text-gray-400 dark:text-gray-500">N/A (non–Software House)</span>
                ) : (
                  <Badge className={planBadgeClass[(selectedTenant.plan || selectedTenant.subscription?.plan || '').toLowerCase()] || 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}>
                    {selectedTenant.plan || selectedTenant.subscription?.plan || '—'}
                  </Badge>
                )}
              </div>
              <div><b className="text-gray-700 dark:text-gray-300">Status:</b> {selectedTenant.status || '—'}</div>
              <div><b className="text-gray-700 dark:text-gray-300">Created:</b> {selectedTenant.createdAt ? moment(selectedTenant.createdAt).format('MMM DD, YYYY') : '—'}</div>
              <div><b className="text-gray-700 dark:text-gray-300">Users:</b> {selectedTenant.usage?.totalUsers ?? selectedTenant.users ?? '—'}</div>
              <div><b className="text-gray-700 dark:text-gray-300">Revenue:</b> ${Number(selectedTenant.revenue ?? selectedTenant.subscription?.revenue ?? 0).toLocaleString()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantManagement;
