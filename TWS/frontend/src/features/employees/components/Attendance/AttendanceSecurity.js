import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LockClosedIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AttendanceSecurity = () => {
  const { user } = useAuth();
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [riskLevel, setRiskLevel] = useState('all');
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    fetchSecurityAlerts();
    fetchAuditLogs();
  }, [riskLevel]);

  const fetchSecurityAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (riskLevel !== 'all') {
        params.append('riskLevel', riskLevel);
      }
      params.append('limit', '20');

      const response = await axios.get(`/api/attendance/security/alerts?${params}`);
      
      if (response.data.success) {
        setSecurityAlerts(response.data.data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      toast.error('Failed to load security alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      // In a real app, this would fetch audit logs for the user's attendance records
      // For now, we'll use mock data
      const mockAuditLogs = [
        {
          id: 1,
          action: 'checkin',
          timestamp: new Date(),
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows',
            ipAddress: '192.168.1.100'
          },
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'New York, NY'
          },
          riskLevel: 'low'
        },
        {
          id: 2,
          action: 'break_start',
          timestamp: new Date(Date.now() - 3600000),
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows',
            ipAddress: '192.168.1.100'
          },
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'New York, NY'
          },
          riskLevel: 'low'
        }
      ];
      setAuditLogs(mockAuditLogs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'medium': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'high': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default: return <InformationCircleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'checkin': return <ClockIcon className="h-4 w-4" />;
      case 'checkout': return <ClockIcon className="h-4 w-4" />;
      case 'break_start': return <ClockIcon className="h-4 w-4" />;
      case 'break_end': return <ClockIcon className="h-4 w-4" />;
      case 'correction_request': return <ExclamationTriangleIcon className="h-4 w-4" />;
      default: return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  const formatSecurityFlags = (flags) => {
    if (!flags || flags.length === 0) return 'No flags';
    
    return flags.map(flag => {
      switch (flag) {
        case 'unusual_location': return 'Unusual Location';
        case 'unusual_time': return 'Unusual Time';
        case 'rapid_checkin_checkout': return 'Rapid Check-in/out';
        case 'multiple_devices': return 'Multiple Devices';
        case 'suspicious_ip': return 'Suspicious IP';
        case 'missing_photo': return 'Missing Photo';
        case 'manual_override': return 'Manual Override';
        case 'after_hours_access': return 'After Hours Access';
        case 'weekend_access': return 'Weekend Access';
        case 'holiday_access': return 'Holiday Access';
        case 'proxy_detection': return 'Proxy Detection';
        case 'biometric_mismatch': return 'Biometric Mismatch';
        case 'location_spoofing': return 'Location Spoofing';
        case 'time_manipulation': return 'Time Manipulation';
        default: return flag;
      }
    }).join(', ');
  };

  const handleViewAuditTrail = async (attendanceId) => {
    try {
      const response = await axios.get(`/api/attendance/audit/${attendanceId}`);
      if (response.data.success) {
        setAuditLogs(response.data.data.auditTrail);
        setShowAuditModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      toast.error('Failed to load audit trail');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Security Overview</h3>
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">Security Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-green-800">Verified Sessions</div>
                <div className="text-2xl font-bold text-green-900">
                  {auditLogs.filter(log => log.riskLevel === 'low').length}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-yellow-800">Medium Risk</div>
                <div className="text-2xl font-bold text-yellow-900">
                  {securityAlerts.filter(alert => alert.riskLevel === 'medium').length}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-red-800">High Risk</div>
                <div className="text-2xl font-bold text-red-900">
                  {securityAlerts.filter(alert => alert.riskLevel === 'high' || alert.riskLevel === 'critical').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Controls */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Security Features</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Location Verification
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Photo Capture
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Device Tracking
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                IP Address Monitoring
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Time Validation
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Factors Monitored</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                Unusual Locations
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                After Hours Access
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                Multiple Device Usage
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                Rapid Check-in/out
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                Missing Verification
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>
          </div>
          <button
            onClick={fetchSecurityAlerts}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Alerts */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Alerts</h3>
        
        {securityAlerts.length > 0 ? (
          <div className="space-y-4">
            {securityAlerts.map((alert, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getRiskIcon(alert.riskLevel)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(alert.date).toLocaleDateString()} - {new Date(alert.date).toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatSecurityFlags(alert.securityFlags)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(alert.riskLevel)}`}>
                      {alert.riskLevel.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleViewAuditTrail(alert._id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
                
                {alert.checkIn && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                    <div className="flex items-center">
                      <MapPinIcon className="h-3 w-3 mr-1" />
                      {alert.checkIn.location?.address || 'Location not available'}
                    </div>
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="h-3 w-3 mr-1" />
                      {alert.checkIn.device?.browser || 'Unknown'} on {alert.checkIn.device?.os || 'Unknown'}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Quality: {alert.qualityScore || 100}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No security alerts found</p>
            <p className="text-sm">Your attendance records show good security compliance</p>
          </div>
        )}
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity Log</h3>
        
        <div className="space-y-3">
          {auditLogs.map((log, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                {getActionIcon(log.action)}
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {log.action.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(log.riskLevel)}`}>
                  {log.riskLevel.toUpperCase()}
                </span>
                {log.deviceInfo && (
                  <span className="text-xs text-gray-500">
                    {log.deviceInfo.browser} • {log.deviceInfo.os}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.map((log, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium text-gray-900">
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(log.riskLevel)}`}>
                        {log.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Time: {new Date(log.timestamp).toLocaleString()}</div>
                      {log.deviceInfo && (
                        <div>Device: {log.deviceInfo.browser} on {log.deviceInfo.os}</div>
                      )}
                      {log.location && (
                        <div>Location: {log.location.address}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSecurity;
