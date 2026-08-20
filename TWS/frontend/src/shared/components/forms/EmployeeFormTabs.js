import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export const CompensationTab = ({ formData, handleInputChange, handleArrayChange, addArrayItem, removeArrayItem }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Base Salary *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            value={formData.salary.base}
            onChange={(e) => handleInputChange('salary.base', e.target.value)}
            className="w-full pl-7 pr-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="0"
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Currency
        </label>
        <select
          value={formData.salary.currency}
          onChange={(e) => handleInputChange('salary.currency', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CAD">CAD</option>
          <option value="AUD">AUD</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Pay Frequency
        </label>
        <select
          value={formData.salary.payFrequency}
          onChange={(e) => handleInputChange('salary.payFrequency', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </div>
    </div>

    {/* Salary Components */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Salary Components</h4>
        <button
          type="button"
          onClick={() => addArrayItem('salary.components', { name: '', amount: 0, type: 'allowance', isRecurring: true })}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-out backdrop-blur-sm"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Component
        </button>
      </div>
      
      <div className="space-y-4">
        {formData.salary.components.map((component, index) => (
          <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-5 p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={component.name}
                onChange={(e) => handleArrayChange('salary.components', index, { name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                placeholder="Component name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input
                type="number"
                value={component.amount}
                onChange={(e) => handleArrayChange('salary.components', index, { amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={component.type}
                onChange={(e) => handleArrayChange('salary.components', index, { type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              >
                <option value="allowance">Allowance</option>
                <option value="deduction">Deduction</option>
                <option value="bonus">Bonus</option>
                <option value="commission">Commission</option>
                <option value="overtime">Overtime</option>
                <option value="benefit">Benefit</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={component.isRecurring}
                onChange={(e) => handleArrayChange('salary.components', index, { isRecurring: e.target.checked })}
                className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Recurring</label>
            </div>
            
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => removeArrayItem('salary.components', index)}
                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BenefitsTab = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Insurance Benefits</h4>
        
        <div className="space-y-3">
          {[
            { key: 'healthInsurance', label: 'Health Insurance' },
            { key: 'dentalInsurance', label: 'Dental Insurance' },
            { key: 'visionInsurance', label: 'Vision Insurance' },
            { key: 'lifeInsurance', label: 'Life Insurance' },
            { key: 'disabilityInsurance', label: 'Disability Insurance' }
          ].map((benefit) => (
            <div key={benefit.key} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.benefits[benefit.key]}
                onChange={(e) => handleInputChange(`benefits.${benefit.key}`, e.target.checked)}
                className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label className="ml-3 block text-sm text-gray-700 dark:text-gray-300">{benefit.label}</label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Financial Benefits</h4>
        
        <div className="space-y-3">
          {[
            { key: 'retirementPlan', label: 'Retirement Plan' },
            { key: 'flexibleSpendingAccount', label: 'Flexible Spending Account' },
            { key: 'healthSavingsAccount', label: 'Health Savings Account' },
            { key: 'stockOptions', label: 'Stock Options' }
          ].map((benefit) => (
            <div key={benefit.key} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.benefits[benefit.key]}
                onChange={(e) => handleInputChange(`benefits.${benefit.key}`, e.target.checked)}
                className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label className="ml-3 block text-sm text-gray-700 dark:text-gray-300">{benefit.label}</label>
            </div>
          ))}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Equity Shares
          </label>
          <input
            type="number"
            value={formData.benefits.equityShares}
            onChange={(e) => handleInputChange('benefits.equityShares', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  </div>
);

export const SkillsTab = ({ formData, handleArrayChange, addArrayItem, removeArrayItem }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Skills & Competencies</h4>
      <button
        type="button"
        onClick={() => addArrayItem('skills', { name: '', level: 'beginner', category: 'technical', verified: false })}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-out backdrop-blur-sm"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Add Skill
      </button>
    </div>
    
    <div className="space-y-4">
      {formData.skills.map((skill, index) => (
        <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-5 p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skill Name</label>
            <input
              type="text"
              value={skill.name}
              onChange={(e) => handleArrayChange('skills', index, { name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              placeholder="Skill name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
            <select
              value={skill.level}
              onChange={(e) => handleArrayChange('skills', index, { level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={skill.category}
              onChange={(e) => handleArrayChange('skills', index, { category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
            >
              <option value="technical">Technical</option>
              <option value="soft">Soft Skills</option>
              <option value="language">Language</option>
              <option value="certification">Certification</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={skill.verified}
              onChange={(e) => handleArrayChange('skills', index, { verified: e.target.checked })}
              className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Verified</label>
          </div>
          
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => removeArrayItem('skills', index)}
              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ContactTab = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <div>
      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Address Information</h4>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Street Address
          </label>
          <input
            type="text"
            value={formData.address.street}
            onChange={(e) => handleInputChange('address.street', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter street address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            City
          </label>
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => handleInputChange('address.city', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter city"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            State/Province
          </label>
          <input
            type="text"
            value={formData.address.state}
            onChange={(e) => handleInputChange('address.state', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter state/province"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ZIP/Postal Code
          </label>
          <input
            type="text"
            value={formData.address.zipCode}
            onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter ZIP/postal code"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country
          </label>
          <input
            type="text"
            value={formData.address.country}
            onChange={(e) => handleInputChange('address.country', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter country"
          />
        </div>
      </div>
    </div>
    
    <div>
      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Emergency Contact</h4>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Name
          </label>
          <input
            type="text"
            value={formData.emergencyContact.name}
            onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter contact name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Relationship
          </label>
          <input
            type="text"
            value={formData.emergencyContact.relationship}
            onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter relationship"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.emergencyContact.phone}
            onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter phone number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.emergencyContact.email}
            onChange={(e) => handleInputChange('emergencyContact.email', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter email address"
          />
        </div>
      </div>
    </div>
  </div>
);

export const PerformanceTab = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Overall Rating
        </label>
        <select
          value={formData.performanceMetrics.overallRating}
          onChange={(e) => handleInputChange('performanceMetrics.overallRating', parseInt(e.target.value))}
          className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          <option value={1}>1 - Needs Improvement</option>
          <option value={2}>2 - Below Expectations</option>
          <option value={3}>3 - Meets Expectations</option>
          <option value={4}>4 - Exceeds Expectations</option>
          <option value={5}>5 - Outstanding</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Career Level
        </label>
        <select
          value={formData.performanceMetrics.careerLevel}
          onChange={(e) => handleInputChange('performanceMetrics.careerLevel', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300/60 dark:border-gray-600/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ease-out text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          <option value="entry">Entry Level</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid Level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="principal">Principal</option>
          <option value="director">Director</option>
          <option value="executive">Executive</option>
        </select>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.performanceMetrics.promotionEligibility}
          onChange={(e) => handleInputChange('performanceMetrics.promotionEligibility', e.target.checked)}
          className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label className="ml-3 block text-sm text-gray-700 dark:text-gray-300">Promotion Eligible</label>
      </div>
    </div>
  </div>
);
