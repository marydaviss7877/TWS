import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import tenantProjectApiService from '../projects/services/tenantProjectApiService';

const DepartmentsList = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, [tenantSlug]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      if (data) {
        setDepartments(Array.isArray(data) ? data : data.departments || []);
        setError(null);
      } else {
        setDepartments([]);
        setError('Failed to load departments. Please check your authentication.');
        toast.error('Failed to load departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.message || 'Failed to load departments');
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        // SECURITY FIX: Use credentials: 'include' instead of Authorization header
        const response = await fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}`, {
          method: 'DELETE',
          credentials: 'include', // SECURITY FIX: Include cookies (HttpOnly tokens)
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to delete department');
        
        toast.success('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error('Failed to delete department');
      }
    }
  };

  const filteredDepartments = departments.filter(department =>
    department.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Message */}
      {error && (
        <div className="glass-card-premium p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <XMarkIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 dark:text-red-100 mb-1">Error Loading Departments</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchDepartments}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage organizational departments
          </p>
        </div>
        <button
         
          onClick={() => navigate(`/${tenantSlug}/org/departments/create`)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Department
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Head
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No departments found
                </td>
              </tr>
            ) : (
              filteredDepartments.map((department) => (
                <tr key={department._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {department.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {department.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {department.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {department.departmentHead?.fullName || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      department.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : department.status === 'inactive'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {department.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/${tenantSlug}/org/departments/${department._id}/dashboard`)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        title="View Dashboard"
                      >
                        <ChartBarIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(department._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Department"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentsList;

