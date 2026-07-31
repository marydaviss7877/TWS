import React, { useState, useEffect } from 'react';
import { useTenantAuth } from '../../../../app/providers/TenantAuthContext';
import { Link } from 'react-router-dom';
import { 
  ChevronRightIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  CloudIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  CheckBadgeIcon,
  XMarkIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ClockIcon as TimeIcon,
  CurrencyDollarIcon as DollarIcon
} from '@heroicons/react/24/outline';

const TenantAccountsPayable = () => {
  const { user, tenant, isAuthenticated } = useTenantAuth();
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Mock data for tenant-specific accounts payable
      const mockBills = [
        {
          id: 1,
          billNumber: 'BILL-001',
          vendor: 'Office Supplies Co.',
          amount: 1250.00,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
          status: 'pending',
          project: 'General Operations',
          description: 'Office supplies and equipment',
          createdDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
        },
        {
          id: 2,
          billNumber: 'BILL-002',
          vendor: 'Software Licenses Inc.',
          amount: 2500.00,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          status: 'approved',
          project: 'E-commerce Platform',
          description: 'Software licenses renewal',
          createdDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
        }
      ];

      const mockVendors = [
        { id: 1, name: 'Office Supplies Co.', email: 'contact@officesupplies.com', phone: '+1-555-0123' },
        { id: 2, name: 'Software Licenses Inc.', email: 'billing@softwarelicenses.com', phone: '+1-555-0456' }
      ];

      const mockProjects = [
        { id: 1, name: 'E-commerce Platform', client: 'Client ABC' },
        { id: 2, name: 'Mobile App Development', client: 'Client XYZ' },
        { id: 3, name: 'General Operations', client: 'Internal' }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBills(mockBills);
      setVendors(mockVendors);
      setProjects(mockProjects);
    } catch (error) {
      console.error('Error fetching accounts payable data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access accounts payable.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounts payable...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPending = bills.filter(bill => bill.status === 'pending').reduce((sum, bill) => sum + bill.amount, 0);
  const totalOverdue = bills.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Accounts Payable
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage bills and payments for {tenant?.name}.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Bill
            </button>
            <button
              onClick={() => setShowVendorForm(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              Add Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Bills</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${totalPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue Bills</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${totalOverdue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bills</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {bills.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Bills</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {bill.billNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {bill.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${bill.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {bill.dueDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {bill.project}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantAccountsPayable;
