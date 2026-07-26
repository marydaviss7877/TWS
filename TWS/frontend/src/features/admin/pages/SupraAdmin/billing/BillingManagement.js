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
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  ArrowPathIcon,
  PrinterIcon,
  TrophyIcon,
  TrashIcon,
  CheckIcon,
  EnvelopeIcon,
  TableCellsIcon,
  FunnelIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card/Card';
import { Badge } from '../../../../../components/ui/Badge/Badge';
import { Button } from '../../../../../components/ui/Button/Button';
import { Input } from '../../../../../components/ui/Input';
import { DataTable } from '../../../../../components/ui/DataTable/DataTable';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../../components/ui/Table/Table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../components/ui/Select/Select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../../../components/ui/Tooltip/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../../../../components/ui/Dialog/Dialog';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../components/ui/Tabs/Tabs';
import { DatePicker } from '../../../../../components/ui/DatePicker/DatePicker';
import { DateRangePicker } from '../../../../../components/ui/DatePicker/DateRangePicker';
import { Alert, AlertTitle, AlertDescription } from '../../../../../components/ui/Alert/Alert';
import { Avatar, AvatarFallback } from '../../../../../components/ui/Avatar/Avatar';
import { Separator } from '../../../../../components/ui/Separator/Separator';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '../../../../../components/ui/DropdownMenu/DropdownMenu';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../../../../components/ui/Form/Form';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import axiosInstance from '../../../../../shared/utils/axiosInstance';
import moment from 'moment';
import { TableSkeleton } from '../../../../../shared/components/ui/SkeletonLoader';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const STATUS_BADGE_VARIANT = (status) => {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'sent': return 'default';
    case 'overdue': return 'destructive';
    default: return 'secondary';
  }
};

const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${date}-${random}`;
};

const invoiceFormSchema = z.object({
  tenantId: z.string().min(1, 'Please select tenant'),
  total: z.coerce.number({ invalid_type_error: 'Please enter amount' }).min(0, 'Please enter amount'),
  description: z.string().min(1, 'Please enter description'),
  dueDate: z.date({ required_error: 'Please select due date', invalid_type_error: 'Please select due date' }),
  invoiceNumber: z.string().min(1, 'Please enter invoice number'),
  status: z.string().optional(),
});

const BillingManagement = () => {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenants, setTenants] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [dateRangeFilter, setDateRangeFilter] = useState(null); // [moment, moment] | null
  const [amountRangeFilter, setAmountRangeFilter] = useState([null, null]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const form = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { tenantId: '', total: 10, description: '', dueDate: undefined, invoiceNumber: generateInvoiceNumber() },
  });
  const editForm = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { tenantId: '', total: 0, description: '', dueDate: undefined, invoiceNumber: '', status: 'pending' },
  });

  useEffect(() => {
    fetchBillingData();
    fetchInvoices();
    fetchTenants();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/supra-admin/billing/overview');
      const data = response.data?.data || response.data || {};
      setBillingData({
        summary: data.summary || {
          totalRevenue: 0, monthlyRevenue: 0, pendingRevenue: 0, overdueRevenue: 0,
          totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0,
        },
        monthlyTrend: data.monthlyTrend || [],
        planDistribution: data.planDistribution || {},
        topCustomers: data.topCustomers || [],
        billingEligibleCount: data.billingEligibleCount,
        totalTenantCount: data.totalTenantCount,
      });
    } catch (error) {
      toast.error('Failed to fetch billing data');
      console.error('Error fetching billing data:', error);
      setBillingData({
        summary: {
          totalRevenue: 0, monthlyRevenue: 0, pendingRevenue: 0, overdueRevenue: 0,
          totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0,
        },
        monthlyTrend: [], planDistribution: {}, topCustomers: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/supra-admin/billing/invoices?limit=100');
      const invoicesData = response.data?.data?.invoices || response.data?.invoices || [];
      setInvoices(invoicesData);
    } catch (error) {
      toast.error('Failed to fetch invoices');
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await axiosInstance.get('/api/supra-admin/tenants?limit=100');
      const tenantsData = response.data?.data?.tenants || response.data?.tenants || [];
      setTenants(tenantsData);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
    }
  };

  useEffect(() => {
    if (!invoices || invoices.length === 0) {
      setFilteredInvoices([]);
      return;
    }

    let filtered = [...invoices];

    if (searchText) {
      filtered = filtered.filter((invoice) =>
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchText.toLowerCase())) ||
        (invoice.tenant && invoice.tenant.name && invoice.tenant.name.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    if (tenantFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.tenantId === tenantFilter);
    }

    if (dateRangeFilter && dateRangeFilter.length === 2) {
      filtered = filtered.filter((invoice) => {
        if (!invoice.createdAt) return false;
        const invoiceDate = moment(invoice.createdAt);
        return invoiceDate.isAfter(dateRangeFilter[0], 'day') && invoiceDate.isBefore(dateRangeFilter[1], 'day');
      });
    }

    if (amountRangeFilter[0] !== null || amountRangeFilter[1] !== null) {
      filtered = filtered.filter((invoice) => {
        const amount = invoice.total || 0;
        if (amountRangeFilter[0] !== null && amount < amountRangeFilter[0]) return false;
        if (amountRangeFilter[1] !== null && amount > amountRangeFilter[1]) return false;
        return true;
      });
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchText, statusFilter, tenantFilter, dateRangeFilter, amountRangeFilter]);

  const handleCreateInvoice = async (values) => {
    try {
      const payload = {
        tenantId: values.tenantId,
        total: values.total ?? 10,
        description: values.description || 'Subscription Fee ($10/org)',
        dueDate: values.dueDate ? moment(values.dueDate).toISOString() : moment().add(30, 'days').toISOString(),
        invoiceNumber: values.invoiceNumber,
      };
      const response = await axiosInstance.post('/api/supra-admin/billing/invoices', payload);
      const newInvoice = response.data?.invoice || response.data?.data?.invoice;
      if (newInvoice) {
        setInvoices((prev) => [newInvoice, ...prev]);
        fetchBillingData();
      }
      setCreateModalVisible(false);
      form.reset({ tenantId: '', total: 10, description: '', dueDate: undefined, invoiceNumber: generateInvoiceNumber() });
      toast.success('Invoice created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
      console.error('Create invoice error:', error);
    }
  };

  const handleInvoiceAction = async (invoiceId, action) => {
    try {
      let updatePayload = {};
      if (action === 'mark_paid') {
        updatePayload = { status: 'paid', paymentDate: new Date().toISOString() };
      } else if (action === 'send') {
        updatePayload = { status: 'sent' };
      } else if (action === 'cancel') {
        updatePayload = { status: 'cancelled' };
      }

      const response = await axiosInstance.put(`/api/supra-admin/billing/invoices/${invoiceId}`, updatePayload);
      const updatedInvoice = response.data?.invoice;
      if (updatedInvoice) {
        setInvoices((prev) => prev.map((inv) =>
          inv._id === invoiceId ? { ...inv, ...updatedInvoice, total: updatedInvoice.totalAmount ?? updatedInvoice.total } : inv
        ));
        fetchBillingData();
      } else {
        setInvoices((prev) => prev.map((inv) =>
          inv._id === invoiceId ? { ...inv, status: updatePayload.status } : inv
        ));
        fetchBillingData();
      }
      toast.success(`Invoice ${action.replace('_', ' ')} successfully`);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} invoice`);
      console.error('Invoice action error:', error);
    }
  };

  const handleEditInvoice = async (values) => {
    if (!selectedInvoice) return;

    try {
      const updatedInvoice = {
        ...selectedInvoice,
        ...values,
        dueDate: values.dueDate ? moment(values.dueDate).toDate() : selectedInvoice.dueDate,
        lineItems: selectedInvoice.lineItems || [{
          description: values.description || 'Subscription Fee',
          amount: values.total,
          quantity: 1,
        }],
      };

      await axiosInstance.put(`/api/supra-admin/billing/invoices/${selectedInvoice._id}`, updatedInvoice);

      setInvoices((prev) => prev.map((inv) => (inv._id === selectedInvoice._id ? updatedInvoice : inv)));
      setEditModalVisible(false);
      setSelectedInvoice(null);
      editForm.reset();
      toast.success('Invoice updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || 'N/A',
        tenantName: invoice.tenant?.name || 'N/A',
        tenantEmail: invoice.tenant?.email || 'N/A',
        amount: invoice.total || 0,
        status: invoice.status || 'pending',
        createdAt: invoice.createdAt ? moment(invoice.createdAt).format('MMM DD, YYYY') : 'N/A',
        dueDate: invoice.dueDate ? moment(invoice.dueDate).format('MMM DD, YYYY') : 'N/A',
        lineItems: invoice.lineItems || [],
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .invoice-info { margin-bottom: 30px; }
            .invoice-info table { width: 100%; }
            .invoice-info td { padding: 5px 0; }
            .invoice-info td:first-child { font-weight: bold; width: 150px; }
            .line-items { margin-top: 30px; }
            .line-items table { width: 100%; border-collapse: collapse; }
            .line-items th, .line-items td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .line-items th { background-color: #f2f2f2; }
            .total { margin-top: 30px; text-align: right; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>Invoice #: ${invoiceData.invoiceNumber}</p>
          </div>

          <div class="invoice-info">
            <table>
              <tr>
                <td>Bill To:</td>
                <td>${invoiceData.tenantName}<br>${invoiceData.tenantEmail}</td>
              </tr>
              <tr>
                <td>Invoice Date:</td>
                <td>${invoiceData.createdAt}</td>
              </tr>
              <tr>
                <td>Due Date:</td>
                <td>${invoiceData.dueDate}</td>
              </tr>
              <tr>
                <td>Status:</td>
                <td>${invoiceData.status.toUpperCase()}</td>
              </tr>
            </table>
          </div>

          <div class="line-items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.lineItems.map((item) => `
                  <tr>
                    <td>${item.description || 'N/A'}</td>
                    <td>${item.quantity || 1}</td>
                    <td>$${(item.amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="total">
            Total: $${invoiceData.amount.toLocaleString()}
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is an automatically generated invoice.</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceData.invoiceNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Invoice #', 'Tenant', 'Amount', 'Status', 'Created Date', 'Due Date'];
      const rows = filteredInvoices.map((invoice) => [
        invoice.invoiceNumber || 'N/A',
        invoice.tenant?.name || 'N/A',
        (invoice.total || 0).toFixed(2),
        invoice.status || 'pending',
        invoice.createdAt ? moment(invoice.createdAt).format('YYYY-MM-DD') : 'N/A',
        invoice.dueDate ? moment(invoice.dueDate).format('YYYY-MM-DD') : 'N/A',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `invoices-export-${moment().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Invoices exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export invoices');
    }
  };

  const exportToExcel = () => {
    try {
      const headers = ['Invoice #', 'Tenant Name', 'Tenant Email', 'Amount', 'Status', 'Created Date', 'Due Date', 'Payment Date'];
      const rows = filteredInvoices.map((invoice) => [
        invoice.invoiceNumber || 'N/A',
        invoice.tenant?.name || 'N/A',
        invoice.tenant?.email || 'N/A',
        (invoice.total || 0).toFixed(2),
        invoice.status || 'pending',
        invoice.createdAt ? moment(invoice.createdAt).format('YYYY-MM-DD') : 'N/A',
        invoice.dueDate ? moment(invoice.dueDate).format('YYYY-MM-DD') : 'N/A',
        invoice.paymentDate ? moment(invoice.paymentDate).format('YYYY-MM-DD') : 'N/A',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `invoices-export-${moment().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Invoices exported successfully (Excel compatible)');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export invoices');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      toast('Please select invoices to delete', { icon: '⚠️' });
      return;
    }

    try {
      const deletePromises = selectedRowKeys.map((id) =>
        axiosInstance.delete(`/api/supra-admin/billing/invoices/${id}`).catch(() => null)
      );
      await Promise.all(deletePromises);

      setInvoices((prev) => prev.filter((inv) => !selectedRowKeys.includes(inv._id)));
      setSelectedRowKeys([]);
      toast.success(`Deleted ${selectedRowKeys.length} invoice(s) successfully`);
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete invoices');
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedRowKeys.length === 0) {
      toast('Please select invoices to update', { icon: '⚠️' });
      return;
    }

    try {
      const updatePromises = selectedRowKeys.map((id) =>
        axiosInstance.put(`/api/supra-admin/billing/invoices/${id}`, { status: newStatus }).catch(() => null)
      );
      await Promise.all(updatePromises);

      setInvoices((prev) => prev.map((inv) =>
        selectedRowKeys.includes(inv._id)
          ? { ...inv, status: newStatus, ...(newStatus === 'paid' ? { paymentDate: new Date() } : {}) }
          : inv
      ));
      setSelectedRowKeys([]);
      toast.success(`Updated ${selectedRowKeys.length} invoice(s) to ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoices:', error);
      toast.error('Failed to update invoices');
    }
  };

  const openEditModal = useCallback((record) => {
    setSelectedInvoice(record);
    editForm.reset({
      tenantId: record.tenantId,
      total: record.total,
      description: record.description || record.lineItems?.[0]?.description || '',
      dueDate: record.dueDate ? moment(record.dueDate).toDate() : undefined,
      invoiceNumber: record.invoiceNumber,
      status: record.status,
    });
    setEditModalVisible(true);
  }, [editForm]);

  const invoiceColumns = useMemo(() => [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.invoiceNumber || '').localeCompare(b.original.invoiceNumber || ''),
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{r.invoiceNumber || 'N/A'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{r.createdAt ? moment(r.createdAt).format('MMM DD, YYYY') : 'N/A'}</div>
        </div>
      ),
    },
    {
      id: 'tenant',
      header: 'Tenant',
      cell: ({ row: { original: r } }) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{r.tenant?.name || 'N/A'}</div>
          {r.tenant?.email && <div className="text-xs text-gray-500 dark:text-gray-400">{r.tenant.email}</div>}
        </div>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Amount',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.total || 0) - (b.original.total || 0),
      cell: ({ getValue }) => <span className="text-base font-semibold text-gray-900 dark:text-white">${(getValue() || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableColumnFilter: true,
      cell: ({ getValue }) => <Badge variant={STATUS_BADGE_VARIANT(getValue() || 'pending')}>{(getValue() || 'pending').toUpperCase()}</Badge>,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.dueDate || !b.original.dueDate) return 0;
        return new Date(a.original.dueDate) - new Date(b.original.dueDate);
      },
      cell: ({ row: { original: r } }) => {
        if (!r.dueDate) return <span>N/A</span>;
        const isOverdue = moment(r.dueDate).isBefore(moment()) && r.status !== 'paid';
        return (
          <div>
            <div className={isOverdue ? 'text-red-500' : ''}>{moment(r.dueDate).format('MMM DD, YYYY')}</div>
            {isOverdue && <Badge variant="destructive">OVERDUE</Badge>}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedInvoice(r); setModalVisible(true); }}>
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadInvoice(r)}>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>
            {r.status === 'pending' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleInvoiceAction(r._id, 'mark_paid')}>
                      <CreditCardIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Paid</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleInvoiceAction(r._id, 'send')}>
                      <PaperAirplaneIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send Invoice</TooltipContent>
                </Tooltip>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(r)}>
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ], [openEditModal]);

  const planDistribution = billingData?.planDistribution ? [
    { name: 'Trial', value: billingData.planDistribution.trial },
    { name: 'Starter', value: billingData.planDistribution.starter },
    { name: 'Growth', value: billingData.planDistribution.growth },
    { name: 'Professional', value: billingData.planDistribution.professional },
    { name: 'Enterprise', value: billingData.planDistribution.enterprise },
  ].filter((e) => e.value !== undefined && e.value !== null) : [];

  return (
    <div className="p-6">
      <Alert className="mb-6">
        <CurrencyDollarIcon className="h-4 w-4" />
        <AlertTitle>Billing and plans: Software House ERP only</AlertTitle>
        <AlertDescription>
          Billing and subscription plans apply only to Software House ERP. New Software House tenants receive a
          7-day free trial (Starter limits). Other ERP categories are not billed; plan shows N/A. Storage: Starter 2 GB,
          Growth 5 GB, Professional 10 GB, Enterprise Custom.
        </AlertDescription>
      </Alert>

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage invoices, payments, and billing analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchInvoices}>
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportToCSV}><DocumentTextIcon className="h-4 w-4" />Export to CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportToExcel}><TableCellsIcon className="h-4 w-4" />Export to Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateModalVisible(true)}>
            <PlusIcon className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {billingData && billingData.summary && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Total Revenue</span>
                <CurrencyDollarIcon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">${(billingData.summary?.totalRevenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Monthly Revenue</span>
                <CurrencyDollarIcon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${(billingData.summary?.monthlyRevenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Pending Revenue</span>
                <CurrencyDollarIcon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${(billingData.summary?.pendingRevenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Overdue Revenue</span>
                <CurrencyDollarIcon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">${(billingData.summary?.overdueRevenue || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {billingData && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Revenue Trend</CardTitle>
              <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={billingData.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Plan Distribution</CardTitle>
              <ChartPieIcon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {billingData && billingData.summary && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Top Customers by Revenue</CardTitle>
              <TrophyIcon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {(billingData.topCustomers || []).map((customer, index) => (
                  <li key={customer?.name || index} className="flex items-center gap-3 py-3">
                    <Avatar className="h-8 w-8" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                      <AvatarFallback className="bg-transparent text-white">{index + 1}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{customer?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{customer?.plan || 'N/A'} Plan • {customer?.users || 0} users</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-0.5">
                        ${((customer?.revenue || customer?.totalRevenue || 0)).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
                {!(billingData.topCustomers || []).length && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-3">No customer data available</p>
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Invoice Statistics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <DocumentTextIcon className="h-3.5 w-3.5" /> Total Invoices
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{billingData.summary?.totalInvoices || 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <CreditCardIcon className="h-3.5 w-3.5" /> Paid Invoices
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{billingData.summary?.paidInvoices || 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarIcon className="h-3.5 w-3.5" /> Pending Invoices
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{billingData.summary?.pendingInvoices || 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> Collection Rate
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {billingData.summary?.totalInvoices > 0
                    ? Math.round((billingData.summary.paidInvoices / billingData.summary.totalInvoices) * 100)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-[240px]">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search invoices..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </span>
          </div>
        </CardContent>
      </Card>

      {selectedRowKeys.length > 0 && (
        <Card className="mb-4 bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Selected: {selectedRowKeys.length} invoice(s)</span>
            <Button size="sm" onClick={() => handleBulkStatusUpdate('paid')}>Mark as Paid</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('sent')}>Mark as Sent</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('cancelled')}>Cancel Selected</Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)}>
              <TrashIcon className="h-4 w-4" />
              Delete Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedRowKeys([])}>Clear Selection</Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FunnelIcon className="h-4 w-4" /> Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Date Range</p>
            <DateRangePicker
              className="w-full"
              value={dateRangeFilter ? { from: dateRangeFilter[0].toDate(), to: dateRangeFilter[1].toDate() } : undefined}
              onChange={(range) => setDateRangeFilter(range?.from && range?.to ? [moment(range.from), moment(range.to)] : null)}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Amount Range</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                value={amountRangeFilter[0] ?? ''}
                onChange={(e) => setAmountRangeFilter([e.target.value === '' ? null : Number(e.target.value), amountRangeFilter[1]])}
              />
              <Input
                type="number"
                placeholder="Max"
                min={0}
                value={amountRangeFilter[1] ?? ''}
                onChange={(e) => setAmountRangeFilter([amountRangeFilter[0], e.target.value === '' ? null : Number(e.target.value)])}
              />
            </div>
          </div>
          <div className="pt-6">
            <Button variant="outline" onClick={() => { setDateRangeFilter(null); setAmountRangeFilter([null, null]); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? <TableSkeleton columns={6} rows={8} /> : (
          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            enableRowSelection={(row) => row.original.status !== 'cancelled'}
            onRowSelectionChange={(sel) => {
              const ids = Object.keys(sel).filter((k) => sel[k]).map((idx) => filteredInvoices[idx]?._id).filter(Boolean);
              setSelectedRowKeys(ids);
            }}
            pageSize={20}
            emptyMessage="No invoices found"
          />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title="Are you sure you want to delete these invoices?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => { await handleBulkDelete(); setBulkDeleteConfirm(false); }}
      />

      {/* Create Invoice Modal */}
      <Dialog open={createModalVisible} onOpenChange={(open) => { setCreateModalVisible(open); if (!open) form.reset({ tenantId: '', total: 10, description: '', dueDate: undefined, invoiceNumber: generateInvoiceNumber() }); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateInvoice)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant._id} value={tenant._id}>{tenant.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($10/org)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
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
                    <FormControl><Input placeholder="Invoice description" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl><DatePicker value={field.value} onChange={field.onChange} className="w-full" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="INV-20241201-001" {...field} /></FormControl>
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('invoiceNumber', generateInvoiceNumber())}>
                          Generate
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateModalVisible(false)}>Cancel</Button>
                <Button type="submit">Create Invoice</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Modal */}
      <Dialog open={modalVisible && !!selectedInvoice} onOpenChange={(open) => { if (!open) { setModalVisible(false); setSelectedInvoice(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">Payment History</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="col-span-2"><dt className="text-gray-500 dark:text-gray-400">Invoice Number</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedInvoice.invoiceNumber}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Tenant</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedInvoice.tenant?.name || 'N/A'}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge variant={STATUS_BADGE_VARIANT(selectedInvoice.status || 'pending')}>{(selectedInvoice.status || 'pending').toUpperCase()}</Badge></dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Amount</dt><dd className="text-lg font-bold text-gray-900 dark:text-white">${(selectedInvoice.total || 0).toLocaleString()}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Created Date</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedInvoice.createdAt ? moment(selectedInvoice.createdAt).format('MMM DD, YYYY') : 'N/A'}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Due Date</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedInvoice.dueDate ? moment(selectedInvoice.dueDate).format('MMM DD, YYYY') : 'N/A'}</dd></div>
                  <div><dt className="text-gray-500 dark:text-gray-400">Payment Date</dt><dd className="font-medium text-gray-900 dark:text-white">{selectedInvoice.paymentDate ? moment(selectedInvoice.paymentDate).format('MMM DD, YYYY') : 'Not paid'}</dd></div>
                </dl>

                <Separator className="my-4" />

                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedInvoice.lineItems || []).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description || 'N/A'}</TableCell>
                        <TableCell>{item.quantity || 1}</TableCell>
                        <TableCell>${(item.amount || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {!(selectedInvoice.lineItems || []).length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-500 dark:text-gray-400">No line items</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                <TooltipProvider>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => handleDownloadInvoice(selectedInvoice)}>
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild><span><Button variant="outline" disabled><EnvelopeIcon className="h-4 w-4" />Send Email</Button></span></TooltipTrigger>
                      <TooltipContent>Email delivery isn't available yet</TooltipContent>
                    </Tooltip>
                    <Button variant="outline" onClick={() => window.print()}>
                      <PrinterIcon className="h-4 w-4" />
                      Print
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild><span><Button variant="outline" disabled><CreditCardIcon className="h-4 w-4" />Record Payment</Button></span></TooltipTrigger>
                      <TooltipContent>Payment recording isn't available yet</TooltipContent>
                    </Tooltip>
                    {selectedInvoice.status === 'pending' && (
                      <Button onClick={() => { handleInvoiceAction(selectedInvoice._id, 'mark_paid'); setModalVisible(false); }}>
                        <CheckIcon className="h-4 w-4" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </TooltipProvider>
              </TabsContent>

              <TabsContent value="history">
                <ul className="space-y-4">
                  <li className="relative pl-5 border-l-2 border-green-500">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Invoice Created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedInvoice.createdAt ? moment(selectedInvoice.createdAt).format('MMM DD, YYYY HH:mm') : 'N/A'}</p>
                  </li>
                  {selectedInvoice.status === 'sent' && selectedInvoice.sentDate && (
                    <li className="relative pl-5 border-l-2 border-blue-500">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Invoice Sent</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{moment(selectedInvoice.sentDate).format('MMM DD, YYYY HH:mm')}</p>
                    </li>
                  )}
                  {selectedInvoice.status === 'paid' && selectedInvoice.paymentDate && (
                    <li className="relative pl-5 border-l-2 border-green-500">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-green-500" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Payment Received</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{moment(selectedInvoice.paymentDate).format('MMM DD, YYYY HH:mm')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Amount: ${(selectedInvoice.total || 0).toLocaleString()}</p>
                    </li>
                  )}
                </ul>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Modal */}
      <Dialog open={editModalVisible} onOpenChange={(open) => { setEditModalVisible(open); if (!open) { setSelectedInvoice(null); editForm.reset(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditInvoice)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant._id} value={tenant._id}>{tenant.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="Invoice description" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl><DatePicker value={field.value} onChange={field.onChange} className="w-full" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl><Input placeholder="INV-20241201-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditModalVisible(false)}>Cancel</Button>
                <Button type="submit">Update Invoice</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingManagement;
