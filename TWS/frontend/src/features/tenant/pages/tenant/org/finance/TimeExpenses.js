import React, { useState, useEffect } from 'react';
import { 
  ClockIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const TimeExpenses = () => {
  const tenantSlug = useTenantSlug();
  const [timeEntries, setTimeEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterBillable, setFilterBillable] = useState('all');
  const [timeFormData, setTimeFormData] = useState({
    projectId: '',
    employeeId: '',
    date: '',
    hours: 0,
    description: '',
    billable: true,
    hourlyRate: 0
  });
  const [expenseFormData, setExpenseFormData] = useState({
    projectId: '',
    employeeId: '',
    date: '',
    category: '',
    amount: 0,
    description: '',
    receipt: null,
    billable: true
  });

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const asId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return String(value._id);
    return String(value);
  };

  const asName = (obj, fallback = 'N/A') => {
    if (!obj) return fallback;
    if (typeof obj === 'string') return obj;
    return obj.name || obj.fullName || obj.displayName || fallback;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries
      try {
        const timeEntriesData = await tenantApiService.getTimeEntries(tenantSlug);
        // Ensure we always have an array
        const rawEntries = Array.isArray(timeEntriesData)
          ? timeEntriesData
          : Array.isArray(timeEntriesData?.data)
          ? timeEntriesData.data
          : Array.isArray(timeEntriesData?.timeEntries)
          ? timeEntriesData.timeEntries
          : [];
        const normalized = rawEntries.map((entry) => ({
          ...entry,
          projectId: asId(entry.projectId),
          employeeId: asId(entry.employeeId),
          projectName: entry.projectName || asName(entry.projectId),
          employeeName: entry.employeeName || asName(entry.employeeId),
          hourlyRate: Number(entry.hourlyRate || 0),
          hours: Number(entry.hours || 0),
          billable: entry.billable !== false
        }));
        setTimeEntries(normalized);
      } catch (err) {
        console.error('Error fetching time entries:', err);
        setTimeEntries([]);
      }

      // Fetch expenses
      try {
        const expensesData = await tenantApiService.getExpenses(tenantSlug);
        // Ensure we always have an array
        const rawExpenses = Array.isArray(expensesData)
          ? expensesData
          : Array.isArray(expensesData?.data)
          ? expensesData.data
          : Array.isArray(expensesData?.expenses)
          ? expensesData.expenses
          : [];
        const normalized = rawExpenses.map((expense) => ({
          ...expense,
          projectId: asId(expense.projectId),
          employeeId: asId(expense.employeeId),
          projectName: expense.projectName || asName(expense.projectId),
          employeeName: expense.employeeName || asName(expense.employeeId),
          amount: Number(expense.amount || 0),
          billable: expense.billable !== false
        }));
        setExpenses(normalized);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setExpenses([]);
      }

      // Fetch projects
      try {
        const projectsData = await tenantApiService.getProjects(tenantSlug);
        if (Array.isArray(projectsData)) {
          setProjects(projectsData);
        } else if (projectsData && Array.isArray(projectsData.projects)) {
          setProjects(projectsData.projects);
        } else if (projectsData && Array.isArray(projectsData.data)) {
          setProjects(projectsData.data);
        } else if (projectsData?.data && Array.isArray(projectsData.data.projects)) {
          setProjects(projectsData.data.projects);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setProjects([]);
      }

      // Fetch employees (team members)
      try {
        const employeesData = await tenantApiService.getTeamMembers(tenantSlug);
        const rawEmployees = Array.isArray(employeesData)
          ? employeesData
          : Array.isArray(employeesData?.members)
          ? employeesData.members
          : Array.isArray(employeesData?.data)
          ? employeesData.data
          : [];
        const normalized = rawEmployees.map((employee) => ({
          ...employee,
          _id: asId(employee._id || employee.id || employee.userId),
          name: asName(employee),
          hourlyRate: Number(employee.hourlyRate || employee.rate || 0)
        }));
        setEmployees(normalized);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const getCategoryColor = (category) => {
    const colors = {
      travel: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      software: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      office: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      equipment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      cloud: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[category?.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const handleTimeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEntry) {
        await tenantApiService.updateTimeEntry(tenantSlug, editingEntry._id, timeFormData);
      } else {
        await tenantApiService.createTimeEntry(tenantSlug, timeFormData);
      }
      
      setShowTimeForm(false);
      setEditingEntry(null);
      setTimeFormData({
        projectId: '',
        employeeId: '',
        date: '',
        hours: 0,
        description: '',
        billable: true,
        hourlyRate: 0
      });
      fetchData();
    } catch (error) {
      console.error('Error saving time entry:', error);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(expenseFormData).forEach(key => {
        if (key !== 'receipt') {
          formData.append(key, expenseFormData[key]);
        }
      });
      if (expenseFormData.receipt) {
        formData.append('receipt', expenseFormData.receipt);
      }

      if (editingExpense) {
        await tenantApiService.updateExpense(tenantSlug, editingExpense._id, formData);
      } else {
        await tenantApiService.createExpense(tenantSlug, formData);
      }
      
      setShowExpenseForm(false);
      setEditingExpense(null);
      setExpenseFormData({
        projectId: '',
        employeeId: '',
        date: '',
        category: '',
        amount: 0,
        description: '',
        receipt: null,
        billable: true
      });
      fetchData();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const getFilteredTimeEntries = () => {
    // Ensure timeEntries is an array
    const safeTimeEntries = Array.isArray(timeEntries) ? timeEntries : [];
    let filtered = safeTimeEntries;
    
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterProject !== 'all') {
      filtered = filtered.filter(entry => asId(entry.projectId) === filterProject);
    }
    
    if (filterBillable !== 'all') {
      filtered = filtered.filter(entry => 
        filterBillable === 'billable' ? entry.billable : !entry.billable
      );
    }
    
    return filtered;
  };

  const getFilteredExpenses = () => {
    // Ensure expenses is an array
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    let filtered = safeExpenses;
    
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterProject !== 'all') {
      filtered = filtered.filter(expense => asId(expense.projectId) === filterProject);
    }
    
    if (filterBillable !== 'all') {
      filtered = filtered.filter(expense => 
        filterBillable === 'billable' ? expense.billable : !expense.billable
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading time & expenses...</p>
        </div>
      </div>
    );
  }

  const filteredTimeEntries = getFilteredTimeEntries();
  const filteredExpenses = getFilteredExpenses();
  // Ensure timeEntries and expenses are arrays before using reduce
  const safeTimeEntries = Array.isArray(timeEntries) ? timeEntries : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  
  const totalHours = safeTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const billableHours = safeTimeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const totalExpenses = safeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const billableExpenses = safeExpenses.filter(expense => expense.billable).reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const resetTimeForm = () => setTimeFormData({ projectId: '', employeeId: '', date: '', hours: 0, description: '', billable: true, hourlyRate: 0 });
  const resetExpenseForm = () => setExpenseFormData({ projectId: '', employeeId: '', date: '', category: '', amount: 0, description: '', receipt: null, billable: true });

  // ── Full-page Time Entry Form ─────────────────────────────────────────────
  if (showTimeForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button type="button" onClick={() => { setShowTimeForm(false); setEditingEntry(null); resetTimeForm(); }} className="glass-button p-2 rounded-xl hover-scale" title="Back">←</button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">{editingEntry ? 'Edit Time Entry' : 'Log Time Entry'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track time spent on projects for accurate billing</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleTimeSubmit} className="space-y-6">
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Time Entry Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project *</label>
                <select value={timeFormData.projectId} onChange={(e) => setTimeFormData({...timeFormData, projectId: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Project</option>
                  {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Employee *</label>
                <select value={timeFormData.employeeId} onChange={(e) => { const emp = employees.find(e2 => e2._id === e.target.value); setTimeFormData({...timeFormData, employeeId: e.target.value, hourlyRate: emp?.hourlyRate || 0}); }} className="glass-input w-full" required>
                  <option value="">Select Employee</option>
                  {employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Date *</label>
                <input type="date" value={timeFormData.date} onChange={(e) => setTimeFormData({...timeFormData, date: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Hours *</label>
                <input type="number" value={timeFormData.hours} onChange={(e) => setTimeFormData({...timeFormData, hours: parseFloat(e.target.value) || 0})} className="glass-input w-full" min="0" step="0.25" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Hourly Rate</label>
                <input type="number" value={timeFormData.hourlyRate} onChange={(e) => setTimeFormData({...timeFormData, hourlyRate: parseFloat(e.target.value) || 0})} className="glass-input w-full" min="0" step="0.01" />
              </div>
              <div className="flex items-center pt-7">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={timeFormData.billable} onChange={(e) => setTimeFormData({...timeFormData, billable: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Billable</span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
              <textarea value={timeFormData.description} onChange={(e) => setTimeFormData({...timeFormData, description: e.target.value})} className="glass-input w-full" rows="4" required placeholder="Describe the work performed..." />
            </div>
          </div>
          <div className="glass-card-premium p-6 flex justify-end gap-3">
            <button type="button" onClick={() => { setShowTimeForm(false); setEditingEntry(null); resetTimeForm(); }} className="glass-button px-5 py-2.5 rounded-xl hover-scale">Cancel</button>
            <button type="submit" className="glass-button px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium">{editingEntry ? 'Update' : 'Log'} Time Entry</button>
          </div>
        </form>
      </div>
    );
  }

  // ── Full-page Expense Form ────────────────────────────────────────────────
  if (showExpenseForm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card-premium">
          <div className="px-6 py-5 sm:px-8 flex items-center gap-4">
            <button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); resetExpenseForm(); }} className="glass-button p-2 rounded-xl hover-scale" title="Back">←</button>
            <div>
              <h1 className="text-xl xl:text-2xl font-bold font-heading text-gray-900 dark:text-white">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Record project expenses for accurate cost tracking</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleExpenseSubmit} className="space-y-6">
          <div className="glass-card-premium p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">Expense Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project *</label>
                <select value={expenseFormData.projectId} onChange={(e) => setExpenseFormData({...expenseFormData, projectId: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Project</option>
                  {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Employee *</label>
                <select value={expenseFormData.employeeId} onChange={(e) => setExpenseFormData({...expenseFormData, employeeId: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Employee</option>
                  {employees.map(employee => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Date *</label>
                <input type="date" value={expenseFormData.date} onChange={(e) => setExpenseFormData({...expenseFormData, date: e.target.value})} className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category *</label>
                <select value={expenseFormData.category} onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})} className="glass-input w-full" required>
                  <option value="">Select Category</option>
                  <option value="Travel">Travel</option>
                  <option value="Software">Software</option>
                  <option value="Office">Office</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Cloud">Cloud Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount *</label>
                <input type="number" value={expenseFormData.amount} onChange={(e) => setExpenseFormData({...expenseFormData, amount: parseFloat(e.target.value) || 0})} className="glass-input w-full" min="0" step="0.01" required />
              </div>
              <div className="flex items-center pt-7">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={expenseFormData.billable} onChange={(e) => setExpenseFormData({...expenseFormData, billable: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Billable</span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Description *</label>
              <textarea value={expenseFormData.description} onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})} className="glass-input w-full" rows="4" required placeholder="Describe the expense..." />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Receipt</label>
              <input type="file" onChange={(e) => setExpenseFormData({...expenseFormData, receipt: e.target.files[0]})} className="glass-input w-full" accept=".pdf,.jpg,.jpeg,.png" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload receipt (PDF, JPG, PNG)</p>
            </div>
          </div>
          <div className="glass-card-premium p-6 flex justify-end gap-3">
            <button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); resetExpenseForm(); }} className="glass-button px-5 py-2.5 rounded-xl hover-scale">Cancel</button>
            <button type="submit" className="glass-button px-5 py-2.5 rounded-xl hover-scale bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium">{editingExpense ? 'Update' : 'Add'} Expense</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                Time & Expenses ⏰
              </h1>
              <p className="mt-2 text-sm xl:text-base text-gray-600 dark:text-gray-300">
                Track employee time and project expenses for accurate billing
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Time Tracking
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Expense Management
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Billable Tracking
                </span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                <ClockIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowTimeForm(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
            >
              <ClockIcon className="w-5 h-5" />
              <span className="font-medium">Log Time</span>
            </button>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            >
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="font-medium">Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 xl:w-7 xl:h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Hours
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {totalHours}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 xl:w-7 xl:h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Billable Hours
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {billableHours}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Expenses
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card-premium p-5 xl:p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 xl:w-7 xl:h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Billable Expenses
              </p>
              <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                {formatCurrency(billableExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Search & Filter
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search time & expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl"
              />
            </div>
            <div>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterBillable}
                onChange={(e) => setFilterBillable(e.target.value)}
                className="glass-input w-full px-4 py-3 text-sm font-medium rounded-xl"
              >
                <option value="all">All Items</option>
                <option value="billable">Billable Only</option>
                <option value="non-billable">Non-Billable Only</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterProject('all');
                  setFilterBillable('all');
                }}
                className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="font-medium">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Time Entries ({filteredTimeEntries.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredTimeEntries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTimeEntries.map((entry) => {
                  const totalAmount = (entry.hours || 0) * (entry.hourlyRate || 0);
                  return (
                    <tr key={entry._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.projectName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{entry.employeeName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{formatDate(entry.date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.hours || 0}h</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{entry.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium ${entry.billable ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {entry.billable ? formatCurrency(totalAmount) : 'Non-billable'}
                          </div>
                          {entry.billable && (
                            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => {
                              setEditingEntry(entry);
                              setTimeFormData({
                                projectId: entry.projectId || '',
                                employeeId: entry.employeeId || '',
                                date: entry.date || '',
                                hours: entry.hours || 0,
                                description: entry.description || '',
                                billable: entry.billable !== false,
                                hourlyRate: entry.hourlyRate || 0
                              });
                              setShowTimeForm(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No time entries found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Log your first time entry to get started</p>
              <button
                onClick={() => setShowTimeForm(true)}
                className="mt-4 glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Log Time</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      <div className="glass-card-premium">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            Expenses ({filteredExpenses.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {filteredExpenses.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="glass-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="glass-card divide-y divide-gray-200 dark:divide-gray-700">
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{expense.projectName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{expense.employeeName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{formatDate(expense.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(expense.amount || 0)}</div>
                        {expense.billable && (
                          <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{expense.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setEditingExpense(expense);
                            setExpenseFormData({
                              projectId: expense.projectId || '',
                              employeeId: expense.employeeId || '',
                              date: expense.date || '',
                              category: expense.category || '',
                              amount: expense.amount || 0,
                              description: expense.description || '',
                              receipt: null,
                              billable: expense.billable !== false
                            });
                            setShowExpenseForm(true);
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <CurrencyDollarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No expenses found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Add your first expense to get started</p>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="mt-4 glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Add Expense</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default TimeExpenses;

