import React, { useState, useEffect } from 'react';
import { 
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  CloudIcon,
  KeyIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTheme } from '../../../../../app/providers/ThemeContext';
import { Button } from '../../../../../components/ui/Button/Button';
import { Spinner } from '../../../../../components/ui/Spinner/Spinner';
import { get, put } from '../../../../../shared/utils/apiClient';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await get('/api/supra-admin/settings');
      setSettings(data);
    } catch (err) {
      // Don't mask a failed load behind fabricated defaults — show the real error instead.
      setError(err.message);
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await put('/api/supra-admin/settings', settings);
      toast.success('Settings saved');
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      // Ensure all nested objects exist
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'backup', name: 'Backup', icon: CircleStackIcon },
    { id: 'integrations', name: 'Integrations', icon: CloudIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" label="Loading settings..." />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSettings} className="flex-shrink-0 border-red-300 text-red-800 hover:bg-red-100">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card-premium p-8 hover-glow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold font-heading text-gray-900 dark:text-white tracking-tight">
                  System Settings
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                  Manage your SupraAdmin system configuration
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={fetchSettings}>
              <BoltIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <CheckIcon className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="glass-card p-6 hover-glow">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Settings Categories</h3>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                  } group flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full transition-all duration-200`}
                >
                  <tab.icon
                    className={`${
                      activeTab === tab.id ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="glass-card overflow-hidden rounded-xl">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center">
                  {React.createElement(tabs.find(tab => tab.id === activeTab)?.icon, { className: "w-4 h-4 text-white" })}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {tabs.find(tab => tab.id === activeTab)?.name} Settings
                </h2>
              </div>
            </div>
            
            <div className="p-8">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System Name</label>
                    <input
                      type="text"
                      value={settings?.systemName || ''}
                      onChange={(e) => updateSetting('systemName', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Version</label>
                    <input
                      type="text"
                      value={settings?.version || '1.0.0'}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={settings?.maintenanceMode || false}
                      onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                      Maintenance Mode
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="registrationEnabled"
                      checked={settings?.registrationEnabled || false}
                      onChange={(e) => updateSetting('registrationEnabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="registrationEnabled" className="ml-2 block text-sm text-gray-900">
                      Enable User Registration
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Default Trial Days</label>
                    <input
                      type="number"
                      value={settings?.defaultTrialDays || 14}
                      onChange={(e) => updateSetting('defaultTrialDays', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Tenants Per Admin</label>
                    <input
                      type="number"
                      value={settings?.maxTenantsPerAdmin || 100}
                      onChange={(e) => updateSetting('maxTenantsPerAdmin', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minimum Password Length</label>
                    <input
                      type="number"
                      value={settings?.securitySettings?.passwordMinLength || 8}
                      onChange={(e) => updateSetting('securitySettings.passwordMinLength', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Timeout (hours)</label>
                    <input
                      type="number"
                      value={settings?.securitySettings?.sessionTimeout || 24}
                      onChange={(e) => updateSetting('securitySettings.sessionTimeout', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={settings?.notificationSettings?.emailNotifications || false}
                      onChange={(e) => updateSetting('notificationSettings.emailNotifications', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                      Email Notifications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="systemAlerts"
                      checked={settings?.notificationSettings?.systemAlerts || false}
                      onChange={(e) => updateSetting('notificationSettings.systemAlerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="systemAlerts" className="ml-2 block text-sm text-gray-900">
                      System Alerts
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceAlerts"
                      checked={settings?.notificationSettings?.maintenanceAlerts || false}
                      onChange={(e) => updateSetting('notificationSettings.maintenanceAlerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceAlerts" className="ml-2 block text-sm text-gray-900">
                      Maintenance Alerts
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="securityAlerts"
                      checked={settings?.notificationSettings?.securityAlerts || false}
                      onChange={(e) => updateSetting('notificationSettings.securityAlerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="securityAlerts" className="ml-2 block text-sm text-gray-900">
                      Security Alerts
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'backup' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
                    <select
                      value={settings?.backupSettings?.frequency || 'daily'}
                      onChange={(e) => updateSetting('backupSettings.frequency', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retention Period (days)</label>
                    <input
                      type="number"
                      value={settings?.backupSettings?.retention || 30}
                      onChange={(e) => updateSetting('backupSettings.retention', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                    <input
                      type="text"
                      value={settings?.emailSettings?.smtpHost || ''}
                      onChange={(e) => updateSetting('emailSettings.smtpHost', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                    <input
                      type="number"
                      value={settings?.emailSettings?.smtpPort || 587}
                      onChange={(e) => updateSetting('emailSettings.smtpPort', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">From Email</label>
                    <input
                      type="email"
                      value={settings?.emailSettings?.fromEmail || ''}
                      onChange={(e) => updateSetting('emailSettings.fromEmail', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
