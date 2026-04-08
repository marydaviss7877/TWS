import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  UserIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  PencilIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'salary', name: 'Salary & Compensation', icon: CurrencyDollarIcon },
    { id: 'performance', name: 'Performance', icon: ChartBarIcon },
    { id: 'skills', name: 'Skills & Development', icon: AcademicCapIcon },
    { id: 'compliance', name: 'Compliance', icon: ShieldCheckIcon },
    { id: 'attendance', name: 'Attendance', icon: ClockIcon },
    { id: 'tasks', name: 'Tasks', icon: BriefcaseIcon },
    { id: 'documents', name: 'Documents', icon: DocumentTextIcon }
  ];

  const fetchEmployeeData = useCallback(async () => {
    try {
      const [employeeRes, attendanceRes, tasksRes, documentsRes] = await Promise.all([
        axios.get(`/employees/${id}`),
        axios.get(`/api/attendance?userId=${id}`),
        axios.get(`/tasks/employee/${id}`),
        axios.get(`/documents/employee/${id}`)
      ]);

      setEmployee(employeeRes.data.data.employee);
      setAttendance(attendanceRes.data.data.attendance || []);
      setTasks(tasksRes.data.data.tasks || []);
      setDocuments(documentsRes.data.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
      toast.error('Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [id, fetchEmployeeData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'on-leave': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderTabContent = () => {
    if (!employee) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.userId?.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.userId?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.userId?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Job Title</label>
                  <p className="mt-1 text-sm text-gray-900">{employee.jobTitle}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Hire Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(employee.hireDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Salary Information */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Salary Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Base Salary</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(employee.salary?.base)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Bonus</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(employee.salary?.bonus || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Total Compensation</label>
                  <p className="mt-1 text-lg font-semibold text-blue-600">
                    {formatCurrency((employee.salary?.base || 0) + (employee.salary?.bonus || 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-900">Last check-in: {formatDate(new Date())}</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BriefcaseIcon className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-900">Completed task: "Update documentation"</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-900">Payroll processed for December</p>
                    <p className="text-xs text-gray-500">3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Attendance History</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  View attendance records for the past 30 days
                </p>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {attendance.slice(0, 10).map((record) => (
                    <li key={record._id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(record.date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Check-in: {record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toLocaleTimeString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              Duration: {record.durationMinutes ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m` : 'N/A'}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Task History</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  View assigned tasks and completion status
                </p>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {tasks.slice(0, 10).map((task) => (
                    <li key={task._id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-500">{task.description}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'done' ? 'bg-green-100 text-green-800' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
                            {task.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {formatDate(task.dueDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'salary':
        return (
          <div className="glass-card-premium p-6">
            <p className="text-gray-600 dark:text-gray-400">Salary management feature is being updated.</p>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{employee.performanceMetrics?.overallRating || 'N/A'}</div>
                  <div className="text-sm text-gray-500">Overall Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{employee.performanceMetrics?.goals?.length || 0}</div>
                  <div className="text-sm text-gray-500">Active Goals</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{employee.careerDevelopment?.careerLevel || 'N/A'}</div>
                  <div className="text-sm text-gray-500">Career Level</div>
                </div>
              </div>
            </div>

            {employee.performanceMetrics?.goals && employee.performanceMetrics.goals.length > 0 && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Goals</h3>
                <div className="space-y-4">
                  {employee.performanceMetrics.goals.map((goal, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{goal.title}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                          goal.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {goal.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{goal.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{goal.progress}%</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Target: {formatDate(goal.targetDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Skills & Competencies</h3>
              <div className="space-y-4">
                {employee.skills && employee.skills.length > 0 ? (
                  employee.skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{skill.name}</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              skill.level === 'expert' ? 'bg-green-100 text-green-800' :
                              skill.level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                              skill.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {skill.level}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              skill.category === 'technical' ? 'bg-purple-100 text-purple-800' :
                              skill.category === 'soft' ? 'bg-pink-100 text-pink-800' :
                              skill.category === 'language' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {skill.category}
                            </span>
                            {skill.verified && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No skills recorded</h3>
                    <p className="mt-1 text-sm text-gray-500">Skills and competencies will be displayed here once added.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Status</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Background Check</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.compliance?.backgroundCheck?.status === 'passed' ? 'bg-green-100 text-green-800' :
                      employee.compliance?.backgroundCheck?.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.compliance?.backgroundCheck?.status || 'pending'}
                    </span>
                  </div>
                  {employee.compliance?.backgroundCheck?.completedDate && (
                    <p className="text-xs text-gray-500">
                      Completed: {formatDate(employee.compliance.backgroundCheck.completedDate)}
                    </p>
                  )}
                  {employee.compliance?.backgroundCheck?.expiryDate && (
                    <p className="text-xs text-gray-500">
                      Expires: {formatDate(employee.compliance.backgroundCheck.expiryDate)}
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Drug Test</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.compliance?.drugTest?.status === 'passed' ? 'bg-green-100 text-green-800' :
                      employee.compliance?.drugTest?.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.compliance?.drugTest?.status || 'pending'}
                    </span>
                  </div>
                  {employee.compliance?.drugTest?.completedDate && (
                    <p className="text-xs text-gray-500">
                      Completed: {formatDate(employee.compliance.drugTest.completedDate)}
                    </p>
                  )}
                  {employee.compliance?.drugTest?.expiryDate && (
                    <p className="text-xs text-gray-500">
                      Expires: {formatDate(employee.compliance.drugTest.expiryDate)}
                    </p>
                  )}
                </div>
              </div>

              {employee.compliance?.certifications && employee.compliance.certifications.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Certifications</h4>
                  <div className="space-y-3">
                    {employee.compliance.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                          <p className="text-xs text-gray-500">Issued by: {cert.issuer}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            cert.status === 'active' ? 'bg-green-100 text-green-800' :
                            cert.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cert.status}
                          </span>
                          {cert.expiryDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expires: {formatDate(cert.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Documents</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  View and manage employee documents
                </p>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {documents.length > 0 ? documents.map((doc) => (
                    <li key={doc._id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">{doc.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {formatDate(doc.uploadDate)}
                            </p>
                            <button className="text-blue-600 hover:text-blue-900 text-sm">
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )) : (
                    <li>
                      <div className="px-4 py-8 text-center">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No documents have been uploaded for this employee.
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Employee not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The employee you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/employees')}
            className="mr-4 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {employee.userId?.fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {employee.jobTitle} • {employee.department}
            </p>
          </div>
        </div>
        
        {hasPermission('employees:write') && (
          <div className="mt-4 sm:mt-0">
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Employee Info Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-16 w-16">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300">
              <span className="text-gray-900 font-bold text-xl">
                {employee.userId?.fullName?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-6">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {employee.userId?.fullName}
              </h3>
              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                {employee.status}
              </span>
            </div>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 space-y-1 sm:space-y-0">
              <span>{employee.employeeId}</span>
              <span className="hidden sm:inline mx-2">•</span>
              <span>{employee.department}</span>
              <span className="hidden sm:inline mx-2">•</span>
              <span>{employee.jobTitle}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
