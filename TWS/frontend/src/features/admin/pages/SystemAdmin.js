import React, { useState } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import { useRoleBasedUI } from '../../../shared/hooks/useRoleBasedUI';
import { 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const SystemAdmin = () => {
  const { user } = useAuth();
  const { hasPermission } = useRoleBasedUI();
  const [activeTab, setActiveTab] = useState('settings');

  // Check if user has permission to access system admin
  if (!hasPermission('system:manage') && user.role !== 'owner') {
    return (
      <div className="glass rounded-2xl p-8 backdrop-blur-xl border border-white/20 shadow-2xl text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-200">
          You don't have permission to access system administration.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'settings', label: 'System Settings', icon: Cog6ToothIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'backup', label: 'Backup & Restore', icon: CloudArrowUpIcon },
    { id: 'audit', label: 'Audit Logs', icon: DocumentTextIcon },
    { id: 'api', label: 'API Management', icon: KeyIcon }
  ];

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">General Settings</h3>
        
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Application Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Application Name</label>
                <input 
                  type="text" 
                  defaultValue="Wolf Stack ERP"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Default Language</label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Timezone</label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time</option>
                  <option value="PST">Pacific Time</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Email Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">SMTP Server</label>
                <input 
                  type="text" 
                  defaultValue="smtp.gmail.com"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">SMTP Port</label>
                <input 
                  type="number" 
                  defaultValue="587"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Security Configuration</h3>
        
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Password Policy</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-gray-200">Require minimum 8 characters</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-gray-200">Require uppercase and lowercase letters</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-gray-200">Require numbers and special characters</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-200">Prevent password reuse (last 5 passwords)</span>
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Session Security</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Session Timeout (minutes)</label>
                <input 
                  type="number" 
                  defaultValue="30"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-sm text-gray-200">Logout on browser close</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Backup & Restore</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Backup Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200">Last Backup</span>
                <span className="text-sm text-white">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200">Backup Size</span>
                <span className="text-sm text-white">2.4 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200">Status</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Success
                </span>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Backup Now
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Restore Options</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Select Backup</label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a backup...</option>
                  <option value="backup1">Backup - 2024-01-15 10:30</option>
                  <option value="backup2">Backup - 2024-01-14 10:30</option>
                  <option value="backup3">Backup - 2024-01-13 10:30</option>
                </select>
              </div>
              <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Restore Selected Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">Audit Logs</h3>
        
        <div className="space-y-4">
          {[
            { action: 'User Login', user: 'admin@wolfstack.com', time: '2 minutes ago', status: 'success' },
            { action: 'Role Assignment', user: 'admin@wolfstack.com', time: '15 minutes ago', status: 'success' },
            { action: 'Failed Login', user: 'unknown@example.com', time: '1 hour ago', status: 'failed' },
            { action: 'System Backup', user: 'system', time: '2 hours ago', status: 'success' },
            { action: 'User Creation', user: 'admin@wolfstack.com', time: '3 hours ago', status: 'success' }
          ].map((log, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  log.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <div>
                  <div className="text-white font-medium">{log.action}</div>
                  <div className="text-sm text-gray-200">{log.user}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">{log.time}</div>
                <div className={`text-xs ${
                  log.status === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {log.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAPI = () => (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6">API Management</h3>
        
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">API Keys</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <div className="text-white font-medium">Production API Key</div>
                  <div className="text-sm text-gray-200">sk-prod-...abc123</div>
                </div>
                <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  Regenerate
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <div className="text-white font-medium">Development API Key</div>
                  <div className="text-sm text-gray-200">sk-dev-...xyz789</div>
                </div>
                <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <h4 className="font-semibold text-white mb-3">Rate Limiting</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Requests per minute</label>
                <input 
                  type="number" 
                  defaultValue="1000"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Burst limit</label>
                <input 
                  type="number" 
                  defaultValue="100"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'settings': return renderSettings();
      case 'security': return renderSecurity();
      case 'backup': return renderBackup();
      case 'audit': return renderAudit();
      case 'api': return renderAPI();
      default: return renderSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <Cog6ToothIcon className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">System Administration</h1>
            <p className="text-gray-200">Configure system settings, security, and maintenance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-2 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default SystemAdmin;
