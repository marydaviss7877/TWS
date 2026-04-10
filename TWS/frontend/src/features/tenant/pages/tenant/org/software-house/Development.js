import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  WrenchScrewdriverIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { softwareHouseApi } from '../../../../../../shared/services/industry/softwareHouseApi';
import toast from 'react-hot-toast';

const Development = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    defaultMethodology: 'agile',
    supportedMethodologies: ['agile'],
    developmentSettings: {
      defaultSprintDuration: 14,
      storyPointScale: 'fibonacci',
      codeQualityTracking: true
    }
  });

  const methodologies = [
    { value: 'agile', label: 'Agile', description: 'Iterative and incremental approach' },
    { value: 'scrum', label: 'Scrum', description: 'Framework for managing complex projects' },
    { value: 'kanban', label: 'Kanban', description: 'Visual workflow management' },
    { value: 'waterfall', label: 'Waterfall', description: 'Sequential project phases' },
    { value: 'hybrid', label: 'Hybrid', description: 'Combination of methodologies' }
  ];

  const storyPointScales = [
    { value: 'fibonacci', label: 'Fibonacci (1, 2, 3, 5, 8, 13, 21)', description: 'Most common scale' },
    { value: 'linear', label: 'Linear (1, 2, 3, 4, 5)', description: 'Simple sequential scale' },
    { value: 'powers_of_2', label: 'Powers of 2 (1, 2, 4, 8, 16)', description: 'Exponential scale' },
    { value: 'shirt_sizes', label: 'T-Shirt Sizes (XS, S, M, L, XL)', description: 'Relative sizing' }
  ];

  useEffect(() => {
    // Fetch config when component mounts or tenantSlug changes
    if (tenantSlug) {
      fetchDevelopmentConfig();
    } else {
      setLoading(false);
    }
  }, [tenantSlug]);

  const fetchDevelopmentConfig = async () => {
    if (!tenantSlug) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await softwareHouseApi.getDevelopment(tenantSlug);
      
      // Handle different response structures
      if (response?.data?.success && response?.data?.data) {
        // Standard success response
        setConfig({
          defaultMethodology: response.data.data.defaultMethodology || 'agile',
          supportedMethodologies: response.data.data.supportedMethodologies || ['agile'],
          developmentSettings: response.data.data.developmentSettings || config.developmentSettings
        });
      } else if (response?.data?.data) {
        // Nested data
        setConfig({
          defaultMethodology: response.data.data.defaultMethodology || 'agile',
          supportedMethodologies: response.data.data.supportedMethodologies || ['agile'],
          developmentSettings: response.data.data.developmentSettings || config.developmentSettings
        });
      } else if (response?.data && typeof response.data === 'object') {
        // Direct data object
        setConfig({
          defaultMethodology: response.data.defaultMethodology || 'agile',
          supportedMethodologies: response.data.supportedMethodologies || ['agile'],
          developmentSettings: response.data.developmentSettings || config.developmentSettings
        });
      }
      // If no data, keep default config
    } catch (error) {
      // Only show error if not auth-related (401/403) or 404
      if (!error.response || 
          (error.response.status !== 401 && 
           error.response.status !== 403 && 
           error.response.status !== 404)) {
        console.error('Error fetching development config:', error);
        // Don't show error toast - just use default config
      }
      // Keep default config on error
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const response = await softwareHouseApi.updateDevelopment(tenantSlug, config);
      
      // Handle different response structures
      if (response?.data?.success || response?.status === 200 || response?.status === 201) {
        toast.success('Development methodology configuration updated successfully');
        // Optionally refresh config
        await fetchDevelopmentConfig();
      } else {
        toast.error('Failed to update development configuration');
      }
    } catch (error) {
      console.error('Error updating development config:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update development configuration';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleMethodologyToggle = (methodology) => {
    const supported = config.supportedMethodologies || [];
    const updated = supported.includes(methodology)
      ? supported.filter(m => m !== methodology)
      : [...supported, methodology];
    
    setConfig({
      ...config,
      supportedMethodologies: updated
    });
  };

  const handleSettingChange = (setting, value) => {
    setConfig({
      ...config,
      developmentSettings: {
        ...config.developmentSettings,
        [setting]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#0078d4] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[#605e5c]">Loading development configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <WrenchScrewdriverIcon className="w-8 h-8 text-[#0078d4]" />
          Development Methodology
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure development methodologies and project settings
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Development Methodology Configuration</p>
          <p>
            Configure how your team manages projects. These settings will be used as defaults for new projects
            and can be customized per project as needed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Methodology */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Default Methodology
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the default methodology that will be used for new projects
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {methodologies.map((methodology) => (
                <button
                  key={methodology.value}
                  onClick={() => setConfig({ ...config, defaultMethodology: methodology.value })}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    config.defaultMethodology === methodology.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {methodology.label}
                        </h3>
                        {config.defaultMethodology === methodology.value && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {methodology.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Supported Methodologies */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Supported Methodologies
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select which methodologies your team can use when creating projects
            </p>
            <div className="space-y-2">
              {methodologies.map((methodology) => (
                <label
                  key={methodology.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={config.supportedMethodologies?.includes(methodology.value) || false}
                    onChange={() => handleMethodologyToggle(methodology.value)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {methodology.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {methodology.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Development Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Development Settings
            </h2>
            
            <div className="space-y-6">
              {/* Sprint Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Sprint Duration (days)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={config.developmentSettings?.defaultSprintDuration || 14}
                    onChange={(e) => handleSettingChange('defaultSprintDuration', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Recommended: 1-2 weeks (7-14 days)
                  </span>
                </div>
              </div>

              {/* Story Point Scale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Story Point Scale
                </label>
                <select
                  value={config.developmentSettings?.storyPointScale || 'fibonacci'}
                  onChange={(e) => handleSettingChange('storyPointScale', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {storyPointScales.map((scale) => (
                    <option key={scale.value} value={scale.value}>
                      {scale.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {storyPointScales.find(s => s.value === config.developmentSettings?.storyPointScale)?.description}
                </p>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feature Settings
                </label>
                {[
                  { key: 'codeQualityTracking', label: 'Code Quality Tracking', description: 'Track code quality metrics and standards' }
                ].map((feature) => (
                  <label
                    key={feature.key}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={config.developmentSettings?.[feature.key] || false}
                      onChange={(e) => handleSettingChange(feature.key, e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {feature.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Configuration Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Configuration Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Default:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                  {config.defaultMethodology}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Supported:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {config.supportedMethodologies?.length || 0} methodology{config.supportedMethodologies?.length !== 1 ? 'ies' : 'y'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Sprint Duration:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {config.developmentSettings?.defaultSprintDuration || 14} days
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Story Points:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                  {config.developmentSettings?.storyPointScale || 'fibonacci'}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Development;
