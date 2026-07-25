import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  InputNumber, 
  DatePicker, 
  message, 
  Tooltip, 
  Badge, 
  Progress, 
  Statistic, 
  Tabs, 
  List, 
  Typography, 
  Divider,
  Alert,
  Descriptions,
  Timeline,
  Avatar,
  Checkbox,
  Popconfirm,
  Dropdown,
  Radio
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  EyeOutlined, 
  DownloadOutlined, 
  SendOutlined, 
  DollarOutlined, 
  FileTextOutlined, 
  CreditCardOutlined, 
  CalendarOutlined, 
  UserOutlined, 
  TeamOutlined, 
  RiseOutlined, 
  PieChartOutlined, 
  BarChartOutlined,
  ExportOutlined,
  ReloadOutlined,
  PrinterOutlined,
  TrophyOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  MailOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import { 
  LineChart, 
  Line, 
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
  AreaChart,
  Area
} from 'recharts';
import axiosInstance from '../../../../../shared/utils/axiosInstance';
import moment from 'moment';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const { Option } = Select;
const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const BillingManagement = () => {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenants, setTenants] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [amountRangeFilter, setAmountRangeFilter] = useState([null, null]);
  const [paymentForm] = Form.useForm();
  const [emailForm] = Form.useForm();

  useEffect(() => {
    fetchBillingData();
    fetchInvoices();
    fetchTenants();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchText, statusFilter, tenantFilter, dateRangeFilter, amountRangeFilter]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/supra-admin/billing/overview');
      // Ensure the response has the expected structure
      const data = response.data?.data || response.data || {};
      setBillingData({
        summary: data.summary || {
          totalRevenue: 0,
          monthlyRevenue: 0,
          pendingRevenue: 0,
          overdueRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0
        },
        monthlyTrend: data.monthlyTrend || [],
        planDistribution: data.planDistribution || {},
        topCustomers: data.topCustomers || [],
        billingEligibleCount: data.billingEligibleCount,
        totalTenantCount: data.totalTenantCount
      });
    } catch (error) {
      message.error('Failed to fetch billing data');
      console.error('Error fetching billing data:', error);
      // Set default empty structure on error
      setBillingData({
        summary: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          pendingRevenue: 0,
          overdueRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0
        },
        monthlyTrend: [],
        planDistribution: {},
        topCustomers: []
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
      message.error('Failed to fetch invoices');
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

  const filterInvoices = () => {
    if (!invoices || invoices.length === 0) {
      setFilteredInvoices([]);
      return;
    }

    let filtered = [...invoices];

    // Search filter
    if (searchText) {
      filtered = filtered.filter(invoice =>
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchText.toLowerCase())) ||
        (invoice.tenant && invoice.tenant.name && invoice.tenant.name.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Tenant filter
    if (tenantFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.tenantId === tenantFilter);
    }

    // Date range filter
    if (dateRangeFilter && dateRangeFilter.length === 2) {
      filtered = filtered.filter(invoice => {
        if (!invoice.createdAt) return false;
        const invoiceDate = moment(invoice.createdAt);
        return invoiceDate.isAfter(dateRangeFilter[0], 'day') && invoiceDate.isBefore(dateRangeFilter[1], 'day');
      });
    }

    // Amount range filter
    if (amountRangeFilter[0] !== null || amountRangeFilter[1] !== null) {
      filtered = filtered.filter(invoice => {
        const amount = invoice.total || 0;
        if (amountRangeFilter[0] !== null && amount < amountRangeFilter[0]) return false;
        if (amountRangeFilter[1] !== null && amount > amountRangeFilter[1]) return false;
        return true;
      });
    }

    setFilteredInvoices(filtered);
  };

  const handleCreateInvoice = async (values) => {
    try {
      const payload = {
        tenantId: values.tenantId,
        total: values.total ?? 10,
        description: values.description || 'Subscription Fee ($10/org)',
        dueDate: values.dueDate ? moment(values.dueDate).toISOString() : moment().add(30, 'days').toISOString(),
        invoiceNumber: values.invoiceNumber
      };
      const response = await axiosInstance.post('/api/supra-admin/billing/invoices', payload);
      const newInvoice = response.data?.invoice || response.data?.data?.invoice;
      if (newInvoice) {
        setInvoices(prev => [newInvoice, ...prev]);
        fetchBillingData(); // Refresh stats
      }
      setCreateModalVisible(false);
      form.resetFields();
      message.success('Invoice created successfully');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create invoice');
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
        setInvoices(prev => prev.map(inv => 
          inv._id === invoiceId ? { ...inv, ...updatedInvoice, total: updatedInvoice.totalAmount ?? updatedInvoice.total } : inv
        ));
        fetchBillingData(); // Refresh revenue stats
      } else {
        setInvoices(prev => prev.map(inv => 
          inv._id === invoiceId ? { ...inv, status: updatePayload.status } : inv
        ));
        fetchBillingData();
      }
      message.success(`Invoice ${action.replace('_', ' ')} successfully`);
    } catch (error) {
      message.error(error.response?.data?.message || `Failed to ${action} invoice`);
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
          quantity: 1
        }]
      };

      await axiosInstance.put(`/api/supra-admin/billing/invoices/${selectedInvoice._id}`, updatedInvoice);

      setInvoices(prev => prev.map(inv =>
        inv._id === selectedInvoice._id ? updatedInvoice : inv
      ));
      setEditModalVisible(false);
      setSelectedInvoice(null);
      editForm.resetFields();
      message.success('Invoice updated successfully');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      // Generate PDF content
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || 'N/A',
        tenantName: invoice.tenant?.name || 'N/A',
        tenantEmail: invoice.tenant?.email || 'N/A',
        amount: invoice.total || 0,
        status: invoice.status || 'pending',
        createdAt: invoice.createdAt ? moment(invoice.createdAt).format('MMM DD, YYYY') : 'N/A',
        dueDate: invoice.dueDate ? moment(invoice.dueDate).format('MMM DD, YYYY') : 'N/A',
        lineItems: invoice.lineItems || []
      };

      // Create a simple HTML invoice
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
                ${invoiceData.lineItems.map(item => `
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

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceData.invoiceNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      message.error('Failed to download invoice');
    }
  };

  // Export functions
  const exportToCSV = () => {
    try {
      const headers = ['Invoice #', 'Tenant', 'Amount', 'Status', 'Created Date', 'Due Date'];
      const rows = filteredInvoices.map(invoice => [
        invoice.invoiceNumber || 'N/A',
        invoice.tenant?.name || 'N/A',
        (invoice.total || 0).toFixed(2),
        invoice.status || 'pending',
        invoice.createdAt ? moment(invoice.createdAt).format('YYYY-MM-DD') : 'N/A',
        invoice.dueDate ? moment(invoice.dueDate).format('YYYY-MM-DD') : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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
      message.success('Invoices exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      message.error('Failed to export invoices');
    }
  };

  const exportToExcel = () => {
    // For Excel, we'll create a more detailed CSV that Excel can open
    try {
      const headers = ['Invoice #', 'Tenant Name', 'Tenant Email', 'Amount', 'Status', 'Created Date', 'Due Date', 'Payment Date'];
      const rows = filteredInvoices.map(invoice => [
        invoice.invoiceNumber || 'N/A',
        invoice.tenant?.name || 'N/A',
        invoice.tenant?.email || 'N/A',
        (invoice.total || 0).toFixed(2),
        invoice.status || 'pending',
        invoice.createdAt ? moment(invoice.createdAt).format('YYYY-MM-DD') : 'N/A',
        invoice.dueDate ? moment(invoice.dueDate).format('YYYY-MM-DD') : 'N/A',
        invoice.paymentDate ? moment(invoice.paymentDate).format('YYYY-MM-DD') : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `invoices-export-${moment().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Invoices exported successfully (Excel compatible)');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      message.error('Failed to export invoices');
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select invoices to delete');
      return;
    }

    try {
      // Try to delete via API
      const deletePromises = selectedRowKeys.map(id => 
        axiosInstance.delete(`/api/supra-admin/billing/invoices/${id}`).catch(() => null)
      );
      await Promise.all(deletePromises);

      setInvoices(prev => prev.filter(inv => !selectedRowKeys.includes(inv._id)));
      setSelectedRowKeys([]);
      message.success(`Deleted ${selectedRowKeys.length} invoice(s) successfully`);
    } catch (error) {
      console.error('Error deleting invoices:', error);
      message.error('Failed to delete invoices');
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select invoices to update');
      return;
    }

    try {
      const updatePromises = selectedRowKeys.map(id => 
        axiosInstance.put(`/api/supra-admin/billing/invoices/${id}`, { status: newStatus }).catch(() => null)
      );
      await Promise.all(updatePromises);

      setInvoices(prev => prev.map(inv => 
        selectedRowKeys.includes(inv._id) 
          ? { ...inv, status: newStatus, ...(newStatus === 'paid' ? { paymentDate: new Date() } : {}) }
          : inv
      ));
      setSelectedRowKeys([]);
      message.success(`Updated ${selectedRowKeys.length} invoice(s) to ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoices:', error);
      message.error('Failed to update invoices');
    }
  };

  // Payment recording
  const handleRecordPayment = async (values) => {
    if (!selectedInvoice) return;

    try {
      const paymentData = {
        invoiceId: selectedInvoice._id,
        paymentDate: values.paymentDate ? moment(values.paymentDate).toDate() : new Date(),
        paymentMethod: values.paymentMethod,
        amount: values.amount,
        reference: values.reference,
        notes: values.notes
      };

      await axiosInstance.post(`/api/supra-admin/billing/invoices/${selectedInvoice._id}/payments`, paymentData);

      // Update invoice
      const updatedInvoice = {
        ...selectedInvoice,
        status: values.amount >= (selectedInvoice.total || 0) ? 'paid' : selectedInvoice.status,
        paymentDate: paymentData.paymentDate,
        paidAmount: (selectedInvoice.paidAmount || 0) + values.amount
      };

      setInvoices(prev => prev.map(inv =>
        inv._id === selectedInvoice._id ? updatedInvoice : inv
      ));
      setPaymentModalVisible(false);
      setSelectedInvoice(null);
      paymentForm.resetFields();
      message.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      message.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  // Email sending
  const handleSendEmail = async (values) => {
    if (!selectedInvoice) return;

    try {
      const emailData = {
        invoiceId: selectedInvoice._id,
        to: values.email || selectedInvoice.tenant?.email,
        subject: values.subject || `Invoice ${selectedInvoice.invoiceNumber}`,
        message: values.message || `Please find attached invoice ${selectedInvoice.invoiceNumber} for your review.`
      };

      await axiosInstance.post(`/api/supra-admin/billing/invoices/${selectedInvoice._id}/send-email`, emailData);
      message.success('Invoice email sent successfully');

      // Update invoice status to sent
      setInvoices(prev => prev.map(inv =>
        inv._id === selectedInvoice._id
          ? { ...inv, status: 'sent', sentDate: new Date() }
          : inv
      ));
      setEmailModalVisible(false);
      setSelectedInvoice(null);
      emailForm.resetFields();
    } catch (error) {
      console.error('Error sending email:', error);
      message.error(error.response?.data?.message || 'Failed to send email');
    }
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const date = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${date}-${random}`;
  };

  // Invoice preview
  const handlePreviewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setPreviewModalVisible(true);
  };

  const invoiceColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.createdAt ? moment(record.createdAt).format('MMM DD, YYYY') : 'N/A'}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.invoiceNumber || '').localeCompare(b.invoiceNumber || ''),
    },
    {
      title: 'Tenant',
      dataIndex: 'tenant',
      key: 'tenant',
      render: (tenant) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{tenant?.name || 'N/A'}</div>
          {tenant?.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>{tenant.email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'total',
      key: 'total',
      render: (amount) => (
        <Text strong style={{ fontSize: '16px' }}>
          ${(amount || 0).toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => (a.total || 0) - (b.total || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'paid': 'green',
          'pending': 'orange',
          'sent': 'blue',
          'overdue': 'red',
          'cancelled': 'gray'
        };
        const statusValue = status || 'pending';
        return <Tag color={colors[statusValue] || 'gray'}>{statusValue.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Pending', value: 'pending' },
        { text: 'Sent', value: 'sent' },
        { text: 'Overdue', value: 'overdue' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => {
        if (!date) return <div>N/A</div>;
        const invoice = invoices.find(inv => inv.dueDate === date);
        const isOverdue = moment(date).isBefore(moment()) && invoice?.status !== 'paid';
        return (
          <div>
            <div style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
              {moment(date).format('MMM DD, YYYY')}
            </div>
            {isOverdue && <Tag color="red" size="small">OVERDUE</Tag>}
          </div>
        );
      },
      sorter: (a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate) - new Date(b.dueDate);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => {
                setSelectedInvoice(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownloadInvoice(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Mark as Paid">
                <Button 
                  type="text" 
                  icon={<CreditCardOutlined />} 
                  onClick={() => handleInvoiceAction(record._id, 'mark_paid')}
                />
              </Tooltip>
              <Tooltip title="Send Invoice">
                <Button 
                  type="text" 
                  icon={<SendOutlined />} 
                  onClick={() => handleInvoiceAction(record._id, 'send')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => {
                setSelectedInvoice(record);
                editForm.setFieldsValue({
                  tenantId: record.tenantId,
                  total: record.total,
                  description: record.description || record.lineItems?.[0]?.description || '',
                  dueDate: record.dueDate ? moment(record.dueDate) : null,
                  invoiceNumber: record.invoiceNumber,
                  status: record.status
                });
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const planDistribution = billingData?.planDistribution ? [
    { name: 'Trial', value: billingData.planDistribution.trial },
    { name: 'Starter', value: billingData.planDistribution.starter },
    { name: 'Growth', value: billingData.planDistribution.growth },
    { name: 'Professional', value: billingData.planDistribution.professional },
    { name: 'Enterprise', value: billingData.planDistribution.enterprise }
  ].filter((e) => e.value !== undefined && e.value !== null) : [];
  const billingEligibleCount = billingData?.billingEligibleCount ?? null;
  const totalTenantCount = billingData?.totalTenantCount ?? null;

  return (
    <div style={{ padding: '24px' }}>
      {/* Pricing Info Banner — Software House only */}
      <Alert
        message="Billing and plans: Software House ERP only"
        description="Billing and subscription plans apply only to Software House ERP. New Software House tenants receive a 7-day free trial (Starter limits). Other ERP categories are not billed; plan shows N/A. Storage: Starter 2 GB, Growth 5 GB, Professional 10 GB, Enterprise Custom."
        type="info"
        showIcon
        icon={<DollarOutlined />}
        style={{ marginBottom: '24px' }}
      />

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Billing Management</Title>
          <Text type="secondary">Manage invoices, payments, and billing analytics</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
            Refresh
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'csv',
                  label: 'Export to CSV',
                  icon: <FileTextOutlined />,
                  onClick: exportToCSV
                },
                {
                  key: 'excel',
                  label: 'Export to Excel',
                  icon: <FileExcelOutlined />,
                  onClick: exportToExcel
                }
              ]
            }}
          >
            <Button icon={<ExportOutlined />}>
              Export <ChevronDownIcon className="w-4 h-4 inline ml-1" />
            </Button>
          </Dropdown>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Invoice
          </Button>
        </Space>
      </div>

      {/* Billing Overview Cards */}
      {billingData && billingData.summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={billingData.summary?.totalRevenue || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Monthly Revenue"
                value={billingData.summary?.monthlyRevenue || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Pending Revenue"
                value={billingData.summary?.pendingRevenue || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Overdue Revenue"
                value={billingData.summary?.overdueRevenue || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Revenue Trend Chart */}
      {billingData && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={16}>
            <Card title="Revenue Trend" extra={<RiseOutlined />}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={billingData.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#1890ff" 
                    fill="#1890ff" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Plan Distribution" extra={<PieChartOutlined />}>
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
            </Card>
          </Col>
        </Row>
      )}

      {/* Top Customers */}
      {billingData && billingData.summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <Card title="Top Customers by Revenue" extra={<TrophyOutlined />}>
              <List
                dataSource={billingData.topCustomers || []}
                renderItem={(customer, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        >
                          {index + 1}
                        </Avatar>
                      }
                      title={customer?.name || 'N/A'}
                      description={
                        <div>
                          <Text type="secondary">{customer?.plan || 'N/A'} Plan • {customer?.users || 0} users</Text>
                          <div style={{ marginTop: '4px' }}>
                            <Text strong style={{ color: '#52c41a' }}>
                              ${((customer?.revenue || customer?.totalRevenue || 0)).toLocaleString()}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Invoice Statistics">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Total Invoices"
                    value={billingData.summary?.totalInvoices || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Paid Invoices"
                    value={billingData.summary?.paidInvoices || 0}
                    prefix={<CreditCardOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Pending Invoices"
                    value={billingData.summary?.pendingInvoices || 0}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Collection Rate"
                    value={billingData.summary?.totalInvoices > 0 
                      ? Math.round((billingData.summary.paidInvoices / billingData.summary.totalInvoices) * 100)
                      : 0}
                    suffix="%"
                    prefix={<RiseOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters and Search */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search invoices..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="paid">Paid</Option>
              <Option value="pending">Pending</Option>
              <Option value="sent">Sent</Option>
              <Option value="overdue">Overdue</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Tenant"
              value={tenantFilter}
              onChange={setTenantFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Tenants</Option>
              {tenants.map(tenant => (
                <Option key={tenant._id} value={tenant._id}>{tenant.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <Text type="secondary">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: '16px', background: '#f0f9ff' }}>
          <Space>
            <Text strong>Selected: {selectedRowKeys.length} invoice(s)</Text>
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleBulkStatusUpdate('paid')}
            >
              Mark as Paid
            </Button>
            <Button 
              size="small"
              onClick={() => handleBulkStatusUpdate('sent')}
            >
              Mark as Sent
            </Button>
            <Button 
              size="small"
              onClick={() => handleBulkStatusUpdate('cancelled')}
            >
              Cancel Selected
            </Button>
            <Popconfirm
              title="Are you sure you want to delete these invoices?"
              onConfirm={handleBulkDelete}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                danger 
                size="small"
                icon={<DeleteOutlined />}
              >
                Delete Selected
              </Button>
            </Popconfirm>
            <Button 
              size="small"
              onClick={() => setSelectedRowKeys([])}
            >
              Clear Selection
            </Button>
          </Space>
        </Card>
      )}

      {/* Advanced Filters */}
      <Card style={{ marginBottom: '16px' }} title={<><FilterOutlined /> Advanced Filters</>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Text strong>Date Range:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: '8px' }}
              onChange={(dates) => setDateRangeFilter(dates)}
              value={dateRangeFilter}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Amount Range:</Text>
            <Space style={{ width: '100%', marginTop: '8px' }}>
              <InputNumber
                placeholder="Min"
                style={{ width: '48%' }}
                min={0}
                value={amountRangeFilter[0]}
                onChange={(value) => setAmountRangeFilter([value, amountRangeFilter[1]])}
              />
              <InputNumber
                placeholder="Max"
                style={{ width: '48%' }}
                min={0}
                value={amountRangeFilter[1]}
                onChange={(value) => setAmountRangeFilter([amountRangeFilter[0], value])}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Button 
              onClick={() => {
                setDateRangeFilter(null);
                setAmountRangeFilter([null, null]);
              }}
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Invoices Table */}
      <Card title="All Invoices">
        <Table
          columns={invoiceColumns}
          dataSource={filteredInvoices}
          rowKey="_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.status === 'cancelled'
            })
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        title="Create New Invoice"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateInvoice}
          initialValues={{ total: 10 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tenantId"
                label="Tenant"
                rules={[{ required: true, message: 'Please select tenant' }]}
              >
                <Select placeholder="Select tenant">
                  {tenants.map(tenant => (
                    <Option key={tenant._id} value={tenant._id}>{tenant.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="total"
                label="Amount ($10/org)"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input placeholder="Invoice description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="invoiceNumber"
                label="Invoice Number"
                rules={[{ required: true, message: 'Please enter invoice number' }]}
                initialValue={generateInvoiceNumber()}
              >
                <Input 
                  placeholder="INV-20241201-001"
                  addonAfter={
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => form.setFieldsValue({ invoiceNumber: generateInvoiceNumber() })}
                    >
                      Generate
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create Invoice
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        title={`Invoice Details - ${selectedInvoice?.invoiceNumber}`}
        open={modalVisible && !!selectedInvoice}
        onCancel={() => {
          setModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={null}
        width={800}
      >
        {selectedInvoice && (
          <Tabs 
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <>
                    <Descriptions bordered column={2}>
                      <Descriptions.Item label="Invoice Number" span={2}>
                        {selectedInvoice.invoiceNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tenant">
                        {selectedInvoice.tenant?.name || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={
                          selectedInvoice.status === 'paid' ? 'green' :
                          selectedInvoice.status === 'pending' ? 'orange' :
                          selectedInvoice.status === 'sent' ? 'blue' :
                          selectedInvoice.status === 'overdue' ? 'red' : 'gray'
                        }>
                          {(selectedInvoice.status || 'pending').toUpperCase()}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Amount">
                        <Text strong style={{ fontSize: '18px' }}>
                          ${(selectedInvoice.total || 0).toLocaleString()}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Created Date">
                        {selectedInvoice.createdAt ? moment(selectedInvoice.createdAt).format('MMM DD, YYYY') : 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Due Date">
                        {selectedInvoice.dueDate ? moment(selectedInvoice.dueDate).format('MMM DD, YYYY') : 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Payment Date">
                        {selectedInvoice.paymentDate ? 
                          moment(selectedInvoice.paymentDate).format('MMM DD, YYYY') : 
                          'Not paid'
                        }
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <Title level={5}>Line Items</Title>
                    <Table
                      dataSource={selectedInvoice.lineItems || []}
                      columns={[
                        { title: 'Description', dataIndex: 'description', key: 'description', render: (text) => text || 'N/A' },
                        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', render: (qty) => qty || 1 },
                        { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount) => `$${(amount || 0).toLocaleString()}` }
                      ]}
                      pagination={false}
                      size="small"
                    />

                    <Divider />

                    <Space>
                      <Button 
                        type="primary" 
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadInvoice(selectedInvoice)}
                      >
                        Download PDF
                      </Button>
                      <Tooltip title="Email delivery isn't available yet">
                        <Button icon={<MailOutlined />} disabled>
                          Send Email
                        </Button>
                      </Tooltip>
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={() => {
                          window.print();
                        }}
                      >
                        Print
                      </Button>
                      <Tooltip title="Payment recording isn't available yet">
                        <Button icon={<CreditCardOutlined />} disabled>
                          Record Payment
                        </Button>
                      </Tooltip>
                      {selectedInvoice.status === 'pending' && (
                        <Button 
                          type="primary" 
                          icon={<CheckOutlined />}
                          onClick={() => {
                            handleInvoiceAction(selectedInvoice._id, 'mark_paid');
                            setModalVisible(false);
                          }}
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </Space>
                  </>
                )
              },
              {
                key: 'history',
                label: 'Payment History',
                children: (
                  <Timeline>
                    <Timeline.Item color="green">
                      <Text strong>Invoice Created</Text>
                      <br />
                      <Text type="secondary">
                        {selectedInvoice.createdAt ? moment(selectedInvoice.createdAt).format('MMM DD, YYYY HH:mm') : 'N/A'}
                      </Text>
                    </Timeline.Item>
                    {selectedInvoice.status === 'sent' && selectedInvoice.sentDate && (
                      <Timeline.Item color="blue">
                        <Text strong>Invoice Sent</Text>
                        <br />
                        <Text type="secondary">{moment(selectedInvoice.sentDate).format('MMM DD, YYYY HH:mm')}</Text>
                      </Timeline.Item>
                    )}
                    {selectedInvoice.status === 'paid' && selectedInvoice.paymentDate && (
                      <Timeline.Item color="green">
                        <Text strong>Payment Received</Text>
                        <br />
                        <Text type="secondary">{moment(selectedInvoice.paymentDate).format('MMM DD, YYYY HH:mm')}</Text>
                        <br />
                        <Text type="secondary">Amount: ${(selectedInvoice.total || 0).toLocaleString()}</Text>
                      </Timeline.Item>
                    )}
                  </Timeline>
                )
              }
            ]}
          />
        )}
          </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        title="Edit Invoice"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedInvoice(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditInvoice}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tenantId"
                label="Tenant"
                rules={[{ required: true, message: 'Please select tenant' }]}
              >
                <Select placeholder="Select tenant" disabled>
                  {tenants.map(tenant => (
                    <Option key={tenant._id} value={tenant._id}>{tenant.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="total"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input placeholder="Invoice description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="invoiceNumber"
                label="Invoice Number"
                rules={[{ required: true, message: 'Please enter invoice number' }]}
              >
                <Input placeholder="INV-20241201-001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Status"
          >
            <Select>
              <Option value="pending">Pending</Option>
              <Option value="sent">Sent</Option>
              <Option value="paid">Paid</Option>
              <Option value="overdue">Overdue</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update Invoice
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setSelectedInvoice(null);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        title={`Invoice Preview - ${selectedInvoice?.invoiceNumber}`}
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => selectedInvoice && handleDownloadInvoice(selectedInvoice)}>
            Download
          </Button>,
          <Tooltip key="email" title="Email delivery isn't available yet">
            <Button icon={<MailOutlined />} disabled>
              Send Email
            </Button>
          </Tooltip>,
          <Button key="close" onClick={() => {
            setPreviewModalVisible(false);
            setSelectedInvoice(null);
          }}>
            Close
          </Button>
        ]}
        width={900}
      >
        {selectedInvoice && (
          <div style={{ padding: '20px', background: '#fff' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
              <h1 style={{ margin: 0 }}>INVOICE</h1>
              <p style={{ margin: '10px 0 0 0' }}>Invoice #: {selectedInvoice.invoiceNumber || 'N/A'}</p>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <table style={{ width: '100%' }}>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '150px', padding: '5px 0' }}>Bill To:</td>
                  <td style={{ padding: '5px 0' }}>
                    {selectedInvoice.tenant?.name || 'N/A'}<br/>
                    {selectedInvoice.tenant?.email || ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '5px 0' }}>Invoice Date:</td>
                  <td style={{ padding: '5px 0' }}>
                    {selectedInvoice.createdAt ? moment(selectedInvoice.createdAt).format('MMM DD, YYYY') : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '5px 0' }}>Due Date:</td>
                  <td style={{ padding: '5px 0' }}>
                    {selectedInvoice.dueDate ? moment(selectedInvoice.dueDate).format('MMM DD, YYYY') : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '5px 0' }}>Status:</td>
                  <td style={{ padding: '5px 0' }}>
                    <Tag color={
                      selectedInvoice.status === 'paid' ? 'green' :
                      selectedInvoice.status === 'pending' ? 'orange' :
                      selectedInvoice.status === 'sent' ? 'blue' :
                      selectedInvoice.status === 'overdue' ? 'red' : 'gray'
                    }>
                      {(selectedInvoice.status || 'pending').toUpperCase()}
                    </Tag>
                  </td>
                </tr>
              </table>
            </div>

            <div style={{ marginTop: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f2f2f2' }}>
                    <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Description</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.lineItems || []).map((item, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.description || 'N/A'}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.quantity || 1}</td>
                      <td style={{ border: '1px solid #ddd', padding: '10px' }}>${(item.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold' }}>
              Total: ${(selectedInvoice.total || 0).toLocaleString()}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Recording Modal */}
      <Modal
        title="Record Payment"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedInvoice(null);
          paymentForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleRecordPayment}
          initialValues={{
            paymentDate: moment(),
            paymentMethod: 'bank_transfer',
            amount: selectedInvoice ? (selectedInvoice.total || 0) : 0
          }}
        >
          <Form.Item
            name="paymentDate"
            label="Payment Date"
            rules={[{ required: true, message: 'Please select payment date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select>
              <Option value="bank_transfer">Bank Transfer</Option>
              <Option value="credit_card">Credit Card</Option>
              <Option value="check">Check</Option>
              <Option value="cash">Cash</Option>
              <Option value="paypal">PayPal</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="reference"
            label="Reference Number"
          >
            <Input placeholder="Payment reference number" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Record Payment
              </Button>
              <Button onClick={() => {
                setPaymentModalVisible(false);
                setSelectedInvoice(null);
                paymentForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Email Sending Modal */}
      <Modal
        title="Send Invoice via Email"
        open={emailModalVisible}
        onCancel={() => {
          setEmailModalVisible(false);
          setSelectedInvoice(null);
          emailForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={handleSendEmail}
          initialValues={{
            email: selectedInvoice?.tenant?.email || '',
            subject: selectedInvoice ? `Invoice ${selectedInvoice.invoiceNumber}` : '',
            message: selectedInvoice ? `Please find attached invoice ${selectedInvoice.invoiceNumber} for your review.` : ''
          }}
        >
          <Form.Item
            name="email"
            label="Recipient Email"
            rules={[
              { required: true, message: 'Please enter email address' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="recipient@example.com" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please enter subject' }]}
          >
            <Input placeholder="Invoice subject" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Please enter message' }]}
          >
            <Input.TextArea rows={5} placeholder="Email message" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<MailOutlined />}>
                Send Email
              </Button>
              <Button onClick={() => {
                setEmailModalVisible(false);
                setSelectedInvoice(null);
                emailForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BillingManagement;
