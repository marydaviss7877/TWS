import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const ComplianceAudit = ({ timeRange }) => {
  const [complianceData, setComplianceData] = useState({
    overall: { score: 0, status: 'compliant', issues: 0 },
    byCategory: [],
    violations: [],
    audits: [],
    policies: [],
    recommendations: []
  });

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    fetchComplianceData();
  }, [timeRange, selectedPeriod]);

  const fetchComplianceData = async () => {
    try {
      // Simulate API call - replace with actual endpoint
      const mockData = {
        overall: { score: 92, status: 'compliant', issues: 3 },
        byCategory: [
          { category: 'Labor Law Compliance', score: 95, status: 'compliant', issues: 1 },
          { category: 'Overtime Regulations', score: 88, status: 'warning', issues: 2 },
          { category: 'Break Time Compliance', score: 90, status: 'compliant', issues: 0 },
          { category: 'Remote Work Policies', score: 85, status: 'warning', issues: 2 },
          { category: 'Data Privacy', score: 98, status: 'compliant', issues: 0 },
          { category: 'Health & Safety', score: 93, status: 'compliant', issues: 1 }
        ],
        violations: [
          {
            id: 1,
            type: 'Overtime Violation',
            severity: 'high',
            employee: 'John Smith',
            department: 'Engineering',
            date: '2024-01-15',
            description: 'Exceeded maximum overtime hours without proper authorization',
            status: 'open',
            resolution: null
          },
          {
            id: 2,
            type: 'Break Time Violation',
            severity: 'medium',
            employee: 'Sarah Johnson',
            department: 'Marketing',
            date: '2024-01-14',
            description: 'Did not take required break time during shift',
            status: 'resolved',
            resolution: 'Manager notified, break schedule adjusted'
          },
          {
            id: 3,
            type: 'Remote Work Policy',
            severity: 'low',
            employee: 'Mike Chen',
            department: 'Sales',
            date: '2024-01-13',
            description: 'Remote work request not properly documented',
            status: 'open',
            resolution: null
          }
        ],
        audits: [
          {
            id: 1,
            type: 'Monthly Compliance Review',
            date: '2024-01-01',
            auditor: 'HR Department',
            status: 'completed',
            findings: 2,
            score: 92
          },
          {
            id: 2,
            type: 'Labor Law Audit',
            date: '2023-12-15',
            auditor: 'External Auditor',
            status: 'completed',
            findings: 1,
            score: 95
          },
          {
            id: 3,
            type: 'Data Privacy Review',
            date: '2023-12-01',
            auditor: 'IT Security',
            status: 'completed',
            findings: 0,
            score: 98
          }
        ],
        policies: [
          {
            id: 1,
            name: 'Overtime Policy',
            lastUpdated: '2023-11-15',
            compliance: 88,
            status: 'active',
            nextReview: '2024-02-15'
          },
          {
            id: 2,
            name: 'Remote Work Policy',
            lastUpdated: '2023-10-20',
            compliance: 85,
            status: 'active',
            nextReview: '2024-01-20'
          },
          {
            id: 3,
            name: 'Break Time Policy',
            lastUpdated: '2023-09-10',
            compliance: 90,
            status: 'active',
            nextReview: '2024-03-10'
          }
        ],
        recommendations: [
          {
            id: 1,
            title: 'Implement Overtime Approval System',
            priority: 'high',
            description: 'Automate overtime approval process to prevent violations',
            impact: 'Reduce overtime violations by 80%',
            effort: 'medium'
          },
          {
            id: 2,
            title: 'Update Remote Work Documentation',
            priority: 'medium',
            description: 'Improve remote work request documentation process',
            impact: 'Ensure 100% policy compliance',
            effort: 'low'
          },
          {
            id: 3,
            title: 'Regular Compliance Training',
            priority: 'medium',
            description: 'Implement quarterly compliance training for all employees',
            impact: 'Improve overall compliance score by 5%',
            effort: 'high'
          }
        ]
      };

      setComplianceData(mockData);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'text-gray-800 bg-gray-100';
      case 'warning': return 'text-gray-800 bg-gray-200';
      case 'violation': return 'text-gray-800 bg-gray-300';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-gray-800 bg-gray-300';
      case 'medium': return 'text-gray-800 bg-gray-200';
      case 'low': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-gray-800 bg-gray-300';
      case 'medium': return 'text-gray-800 bg-gray-200';
      case 'low': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getEffortColor = (effort) => {
    switch (effort) {
      case 'high': return 'text-gray-800 bg-gray-300';
      case 'medium': return 'text-gray-800 bg-gray-200';
      case 'low': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Compliance Audit</h2>
          <p className="text-sm text-gray-600">Monitor and ensure regulatory compliance across all attendance policies</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1.5 bg-gray-100 rounded">
            <ShieldCheckIcon className="h-4 w-4 text-gray-600 mr-2" />
            <span className="text-xs text-gray-600">Compliance Score: {complianceData.overall.score}%</span>
          </div>
        </div>
      </div>

      {/* Overall Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded p-4 text-center">
          <div className="text-2xl font-semibold text-gray-900">{complianceData.overall.score}%</div>
          <div className="text-sm text-gray-600">Overall Compliance</div>
          <div className={`text-xs px-2 py-1 rounded mt-2 ${getStatusColor(complianceData.overall.status)}`}>
            {complianceData.overall.status}
          </div>
        </div>
        <div className="border border-gray-200 rounded p-4 text-center">
          <div className="text-2xl font-semibold text-gray-900">{complianceData.overall.issues}</div>
          <div className="text-sm text-gray-600">Active Issues</div>
          <div className="text-xs text-gray-500 mt-2">Requires attention</div>
        </div>
        <div className="border border-gray-200 rounded p-4 text-center">
          <div className="text-2xl font-semibold text-gray-900">{complianceData.audits.length}</div>
          <div className="text-sm text-gray-600">Completed Audits</div>
          <div className="text-xs text-gray-500 mt-2">Last 3 months</div>
        </div>
      </div>

      {/* Compliance by Category */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Compliance by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complianceData.byCategory.map((category, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{category.category}</span>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(category.status)}`}>
                  {category.status}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">{category.score}%</div>
              <div className="text-xs text-gray-600">{category.issues} issues</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Violations */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Active Violations</h3>
        <div className="space-y-3">
          {complianceData.violations.map((violation) => (
            <div key={violation.id} className="p-3 border border-gray-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">{violation.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(violation.severity)}`}>
                    {violation.severity}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(violation.status)}`}>
                    {violation.status}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">{violation.description}</div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center">
                  <UserGroupIcon className="h-3 w-3 mr-1" />
                  {violation.employee?.fullName || violation.employee?.name || violation.employee || 'Unknown'} - {violation.department?.name || violation.department || ''}
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {new Date(violation.date).toLocaleDateString()}
                </div>
              </div>
              {violation.resolution && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                  <strong>Resolution:</strong> {violation.resolution}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit History */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Audit History</h3>
        <div className="space-y-3">
          {complianceData.audits.map((audit) => (
            <div key={audit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 text-gray-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{audit.type}</div>
                  <div className="text-xs text-gray-600">{audit.auditor}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{audit.score}%</div>
                <div className="text-xs text-gray-600">{audit.findings} findings</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Compliance */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Policy Compliance</h3>
        <div className="space-y-3">
          {complianceData.policies.map((policy) => (
            <div key={policy.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
              <div>
                <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                <div className="text-xs text-gray-600">
                  Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{policy.compliance}%</div>
                <div className="text-xs text-gray-600">
                  Next review: {new Date(policy.nextReview).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Compliance Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complianceData.recommendations.map((recommendation) => (
            <div key={recommendation.id} className="p-3 border border-gray-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{recommendation.title}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(recommendation.priority)}`}>
                    {recommendation.priority}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getEffortColor(recommendation.effort)}`}>
                    {recommendation.effort}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-700 mb-2">{recommendation.description}</p>
              <div className="text-xs text-gray-600">
                <strong>Impact:</strong> {recommendation.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Actions */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-3 text-left border border-gray-200 rounded hover:bg-gray-50">
            <DocumentTextIcon className="h-5 w-5 text-gray-600 mb-2" />
            <div className="text-sm font-medium text-gray-900">Generate Compliance Report</div>
            <div className="text-xs text-gray-600">Export detailed compliance analysis</div>
          </button>
          <button className="p-3 text-left border border-gray-200 rounded hover:bg-gray-50">
            <CalendarIcon className="h-5 w-5 text-gray-600 mb-2" />
            <div className="text-sm font-medium text-gray-900">Schedule Audit</div>
            <div className="text-xs text-gray-600">Plan next compliance review</div>
          </button>
          <button className="p-3 text-left border border-gray-200 rounded hover:bg-gray-50">
            <PencilIcon className="h-5 w-5 text-gray-600 mb-2" />
            <div className="text-sm font-medium text-gray-900">Update Policies</div>
            <div className="text-xs text-gray-600">Modify compliance policies</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceAudit;
