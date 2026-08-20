import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  XMarkIcon,
  UserIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  MapPinIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { 
  CompensationTab, 
  BenefitsTab, 
  SkillsTab, 
  ContactTab, 
  PerformanceTab 
} from './EmployeeFormTabs';

const EmployeeForm = ({ employee, onClose, onSuccess, mode = 'create' }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formData, setFormData] = useState({
    // Basic Information
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    jobTitle: '',
    department: '',
    contractType: 'full-time',
    hireDate: '',
    probationEndDate: '',
    status: 'active',
    
    // Salary Information
    salary: {
      base: '',
      currency: 'USD',
      payFrequency: 'monthly',
      components: []
    },
    
    // Work Schedule
    workSchedule: {
      type: 'standard',
      hoursPerWeek: 40,
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC'
    },
    
    // Benefits
    benefits: {
      healthInsurance: false,
      dentalInsurance: false,
      visionInsurance: false,
      retirementPlan: false,
      lifeInsurance: false,
      disabilityInsurance: false,
      flexibleSpendingAccount: false,
      healthSavingsAccount: false,
      stockOptions: false,
      equityShares: 0
    },
    
    // Skills
    skills: [],
    
    // Address
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    
    // Emergency Contact
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    
    // Performance Metrics
    performanceMetrics: {
      overallRating: 3,
      careerLevel: 'entry',
      promotionEligibility: false
    },
    
    // Compliance
    compliance: {
      backgroundCheck: { status: 'pending' },
      drugTest: { status: 'pending' },
      certifications: []
    }
  });

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: UserIcon },
    { id: 'employment', name: 'Employment', icon: BriefcaseIcon },
    { id: 'compensation', name: 'Compensation', icon: CurrencyDollarIcon },
    { id: 'benefits', name: 'Benefits', icon: ShieldCheckIcon },
    { id: 'skills', name: 'Skills', icon: AcademicCapIcon },
    { id: 'contact', name: 'Contact', icon: MapPinIcon },
    { id: 'performance', name: 'Performance', icon: ChartBarIcon }
  ];

  useEffect(() => {
    if (employee && mode === 'edit') {
      setFormData({
        fullName: employee.userId?.fullName || '',
        email: employee.userId?.email || '',
        phone: employee.userId?.phone || '',
        employeeId: employee.employeeId || '',
        jobTitle: employee.jobTitle || '',
        department: employee.department || '',
        contractType: employee.contractType || 'full-time',
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
        probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate).toISOString().split('T')[0] : '',
        status: employee.status || 'active',
        salary: employee.salary || { base: '', currency: 'USD', payFrequency: 'monthly', components: [] },
        workSchedule: employee.workSchedule || { type: 'standard', hoursPerWeek: 40, workDays: [], startTime: '09:00', endTime: '17:00', timezone: 'UTC' },
        benefits: employee.benefits || {},
        skills: employee.skills || [],
        address: employee.address || {},
        emergencyContact: employee.emergencyContact || {},
        performanceMetrics: employee.performanceMetrics || { overallRating: 3, careerLevel: 'entry', promotionEligibility: false },
        compliance: employee.compliance || { backgroundCheck: { status: 'pending' }, drugTest: { status: 'pending' }, certifications: [] }
      });
    }
  }, [employee, mode]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? { ...item, ...value } : item)
    }));
  };

  const addArrayItem = (field, newItem) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], newItem]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const generatePassword = () => {
    const email = formData.email;
    if (!email) {
      toast.error('Please enter email first to generate password');
      return;
    }
    
    // Generate password based on email (first 4 chars + random 4 digits)
    const emailPrefix = email.split('@')[0].substring(0, 4).toLowerCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const password = `${emailPrefix}${randomDigits}`;
    
    setGeneratedPassword(password);
    toast.success('Password generated successfully!');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success('Password copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.employeeId || !formData.jobTitle || !formData.department) {
      toast.error('Please fill in all required fields (Full Name, Email, Employee ID, Job Title, Department)');
      return;
    }
    
    // Validate password generation for create mode
    if (mode === 'create' && !generatedPassword) {
      toast.error('Please generate a password for the employee before creating the account');
      return;
    }
    
    setLoading(true);

    let payload;
    try {
      payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        jobTitle: formData.jobTitle,
        department: formData.department,
        contractType: formData.contractType,
        hireDate: formData.hireDate ? new Date(formData.hireDate).toISOString() : new Date().toISOString(),
        probationEndDate: formData.probationEndDate ? new Date(formData.probationEndDate).toISOString() : null,
        status: formData.status,
        password: generatedPassword, // Include the generated password
        salary: {
          base: parseFloat(formData.salary.base) || 50000, // Default salary if not provided
          currency: formData.salary.currency || 'USD',
          payFrequency: formData.salary.payFrequency || 'monthly',
          components: formData.salary.components || []
        },
        workSchedule: formData.workSchedule,
        benefits: formData.benefits,
        skills: formData.skills,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        performanceMetrics: formData.performanceMetrics,
        compliance: formData.compliance
      };

      console.log('Creating employee with payload:', payload);

      let response;
      if (mode === 'create') {
        response = await axios.post('/api/employees', payload);
      } else {
        response = await axios.patch(`/api/employees/${employee._id}`, payload);
      }

      if (response.data.success) {
        if (mode === 'create') {
          toast.success(`Employee created successfully! Password: ${generatedPassword}`, {
            duration: 10000, // Show for 10 seconds
            style: {
              background: '#10B981',
              color: 'white',
              fontSize: '14px'
            }
          });
        } else {
          toast.success('Employee updated successfully!');
        }
        onSuccess(response.data.data.employee);
        onClose();
      } else {
        toast.error(response.data.message || `Failed to ${mode} employee`);
      }
    } catch (error) {
      console.error(`Error ${mode}ing employee:`, error);
      console.error('Error details:', error.response?.data);
      console.error('Payload sent:', payload);
      
      // More detailed error handling
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(`Failed to ${mode} employee. Please check all required fields.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter full name"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter email address"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter phone number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter employee ID"
            required
          />
        </div>
      </div>

      {/* Password Generation Section - Only for Create Mode */}
      {mode === 'create' && (
        <div className="mt-6 p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl backdrop-blur-sm">
          <div className="flex items-center mb-3">
            <KeyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Employee Login Password</h4>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            Generate a secure password for the employee to access their portal. This password will be sent to the employee.
          </p>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-primary-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ease-out shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:-translate-y-0.5"
            >
              Generate Password
            </button>
            
            {generatedPassword && (
              <>
                <div className="flex-1 flex items-center">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      className="w-full px-4 py-3 pr-10 border border-gray-300/60 dark:border-gray-600/60 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-mono text-sm backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 ease-out shadow-lg hover:shadow-xl hover:shadow-green-500/25 transform hover:-translate-y-0.5 flex items-center"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  Copy
                </button>
              </>
            )}
          </div>
          
          {generatedPassword && (
            <div className="mt-3 p-3 bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/50 rounded-lg backdrop-blur-sm">
              <p className="text-sm text-green-800 dark:text-green-300">
                <strong>Important:</strong> Please copy this password and send it to the employee securely. 
                They will use this password along with their email to login to the employee portal.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEmploymentInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter job title"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Department *
          </label>
          <select
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
            required
          >
            <option value="">Select department</option>
            <option value="development">Development</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="hr">Human Resources</option>
            <option value="finance">Finance</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="customer-support">Customer Support</option>
            <option value="legal">Legal</option>
            <option value="research">Research & Development</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contract Type
          </label>
          <select
            value={formData.contractType}
            onChange={(e) => handleInputChange('contractType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="on-leave">On Leave</option>
            <option value="terminated">Terminated</option>
            <option value="resigned">Resigned</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hire Date *
          </label>
          <input
            type="date"
            value={formData.hireDate}
            onChange={(e) => handleInputChange('hireDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Probation End Date
          </label>
          <input
            type="date"
            value={formData.probationEndDate}
            onChange={(e) => handleInputChange('probationEndDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-0 border w-full max-w-6xl shadow-2xl rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-gray-200/50 dark:border-gray-700/50 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create' ? 'Add New Employee' : 'Edit Employee'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mode === 'create' ? 'Create a new employee record with comprehensive information' : 'Update employee information and settings'}
            </p>
            {mode === 'create' && (
              <div className="mt-2 p-2 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-lg backdrop-blur-sm">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Required:</strong> Full Name, Email, Employee ID, Job Title, Department, and Password Generation
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="min-h-[500px]">
            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'employment' && renderEmploymentInfo()}
            {activeTab === 'compensation' && (
              <CompensationTab 
                formData={formData}
                handleInputChange={handleInputChange}
                handleArrayChange={handleArrayChange}
                addArrayItem={addArrayItem}
                removeArrayItem={removeArrayItem}
              />
            )}
            {activeTab === 'benefits' && (
              <BenefitsTab 
                formData={formData}
                handleInputChange={handleInputChange}
              />
            )}
            {activeTab === 'skills' && (
              <SkillsTab 
                formData={formData}
                handleArrayChange={handleArrayChange}
                addArrayItem={addArrayItem}
                removeArrayItem={removeArrayItem}
              />
            )}
            {activeTab === 'contact' && (
              <ContactTab 
                formData={formData}
                handleInputChange={handleInputChange}
              />
            )}
            {activeTab === 'performance' && (
              <PerformanceTab 
                formData={formData}
                handleInputChange={handleInputChange}
              />
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-700/80 hover:bg-gray-50/90 dark:hover:bg-gray-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 via-accent-600 to-primary-700 hover:from-primary-700 hover:via-accent-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out shadow-lg hover:shadow-xl hover:shadow-primary-500/25 transform hover:-translate-y-0.5"
            >
              {loading ? 'Saving...' : (mode === 'create' ? 'Create Employee' : 'Update Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
