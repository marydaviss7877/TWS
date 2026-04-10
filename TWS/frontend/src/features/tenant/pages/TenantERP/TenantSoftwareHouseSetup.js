import React, { useState } from 'react';
import { 
  CogIcon, 
  CheckCircleIcon, 
  ArrowRightIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const TenantSoftwareHouseSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState({
    // Development Methodologies
    defaultMethodology: 'agile',
    supportedMethodologies: ['agile', 'scrum'],
    
    // Technology Stack
    techStack: {
      frontend: ['React', 'Vue.js'],
      backend: ['Node.js', 'Python'],
      database: ['MongoDB', 'PostgreSQL'],
      cloud: ['AWS', 'Azure'],
      tools: ['Git', 'Docker']
    },
    
    // Project Types
    supportedProjectTypes: ['web_application', 'mobile_app'],
    
    // Development Settings
    developmentSettings: {
      defaultSprintDuration: 14,
      storyPointScale: 'fibonacci',
      clientPortalEnabled: true,
      codeQualityTracking: true
    },
    
    // Billing Configuration
    billingConfig: {
      defaultHourlyRate: 75,
      currency: 'USD',
      billingCycle: 'monthly',
      invoiceTemplate: 'standard',
      autoInvoiceGeneration: false
    },
    
    // Team Configuration
    teamConfig: {
      maxTeamSize: 25,
      allowRemoteWork: true,
      requireTimeTracking: true,
      allowOvertime: true,
      maxOvertimeHours: 20
    },
    
    // Quality Configuration
    qualityConfig: {
      codeReviewRequired: true,
      testingRequired: true,
      documentationRequired: true,
      minCodeCoverage: 85,
      maxTechnicalDebt: 15
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleConfigChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleTechStackChange = (category, value) => {
    setConfig(prev => ({
      ...prev,
      techStack: {
        ...prev.techStack,
        [category]: value
      }
    }));
  };

  const handleInitialize = async () => {
    setIsLoading(true);
    try {
      // API call to initialize tenant as software house
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/tenant/software-house/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // SECURITY FIX: Use cookies instead of localStorage token
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to software house dashboard
        window.location.href = '/tenant-software-house';
      } else {
        alert('Failed to initialize software house configuration');
      }
    } catch (error) {
      console.error('Error initializing software house:', error);
      alert('Error initializing software house configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Methodologies', icon: CogIcon },
    { id: 2, name: 'Technology Stack', icon: ComputerDesktopIcon },
    { id: 3, name: 'Development Settings', icon: WrenchScrewdriverIcon },
    { id: 4, name: 'Billing & Team', icon: CurrencyDollarIcon },
    { id: 5, name: 'Quality & Review', icon: ShieldCheckIcon }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Development Methodologies
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Methodology
                  </label>
                  <select
                    value={config.defaultMethodology}
                    onChange={(e) => setConfig(prev => ({ ...prev, defaultMethodology: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  >
                    <option value="agile">Agile</option>
                    <option value="scrum">Scrum</option>
                    <option value="kanban">Kanban</option>
                    <option value="waterfall">Waterfall</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supported Methodologies
                  </label>
                  <div className="space-y-2">
                    {['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'].map((methodology) => (
                      <label key={methodology} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.supportedMethodologies.includes(methodology)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig(prev => ({
                                ...prev,
                                supportedMethodologies: [...prev.supportedMethodologies, methodology]
                              }));
                            } else {
                              setConfig(prev => ({
                                ...prev,
                                supportedMethodologies: prev.supportedMethodologies.filter(m => m !== methodology)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {methodology}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Technology Stack
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(config.techStack).map(([category, technologies]) => (
                  <div key={category}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                      {category}
                    </label>
                    <input
                      type="text"
                      value={technologies.join(', ')}
                      onChange={(e) => handleTechStackChange(category, e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                      placeholder={`Enter ${category} technologies separated by commas`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Development Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Sprint Duration (days)
                  </label>
                  <input
                    type="number"
                    value={config.developmentSettings.defaultSprintDuration}
                    onChange={(e) => handleConfigChange('developmentSettings', 'defaultSprintDuration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Story Point Scale
                  </label>
                  <select
                    value={config.developmentSettings.storyPointScale}
                    onChange={(e) => handleConfigChange('developmentSettings', 'storyPointScale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  >
                    <option value="fibonacci">Fibonacci</option>
                    <option value="linear">Linear</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <div className="space-y-3">
                    {Object.entries(config.developmentSettings).filter(([key]) => typeof config.developmentSettings[key] === 'boolean').map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleConfigChange('developmentSettings', key, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Billing & Team Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={config.billingConfig.defaultHourlyRate}
                    onChange={(e) => handleConfigChange('billingConfig', 'defaultHourlyRate', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={config.billingConfig.currency}
                    onChange={(e) => handleConfigChange('billingConfig', 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Team Size
                  </label>
                  <input
                    type="number"
                    value={config.teamConfig.maxTeamSize}
                    onChange={(e) => handleConfigChange('teamConfig', 'maxTeamSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Overtime Hours
                  </label>
                  <input
                    type="number"
                    value={config.teamConfig.maxOvertimeHours}
                    onChange={(e) => handleConfigChange('teamConfig', 'maxOvertimeHours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <div className="space-y-3">
                    {Object.entries(config.teamConfig).filter(([key]) => typeof config.teamConfig[key] === 'boolean').map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleConfigChange('teamConfig', key, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quality & Review Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Code Coverage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.qualityConfig.minCodeCoverage}
                    onChange={(e) => handleConfigChange('qualityConfig', 'minCodeCoverage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Technical Debt (hours)
                  </label>
                  <input
                    type="number"
                    value={config.qualityConfig.maxTechnicalDebt}
                    onChange={(e) => handleConfigChange('qualityConfig', 'maxTechnicalDebt', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <div className="space-y-3">
                    {Object.entries(config.qualityConfig).filter(([key]) => typeof config.qualityConfig[key] === 'boolean').map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handleConfigChange('qualityConfig', key, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="glass-card-premium p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <CogIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Setup Software House ERP
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your tenant as a software development company with specialized ERP features
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleInitialize}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Initializing...' : 'Initialize Software House ERP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantSoftwareHouseSetup;
