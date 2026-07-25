import React, { useState, useCallback } from 'react';
import { formTemplatesAPI, formUtils } from '@/shared/services/business/form-management.service';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  PlayIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ListBulletIcon,
  CheckIcon,
  StarIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PhotoIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const FormBuilder = ({ onSave, onPreview, initialForm = null }) => {
  const [form, setForm] = useState(initialForm || {
    id: null,
    title: 'New Job Form',
    description: '',
    category: 'job_posting',
    fields: [],
    settings: {
      allowMultipleSubmissions: false,
      requireAuthentication: true,
      showProgressBar: true,
      autoSave: true
    },
    metadata: {
      createdBy: '',
      createdAt: new Date().toISOString(),
      version: 1,
      tags: []
    }
  });

  const [selectedField, setSelectedField] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Field types available in the form builder
  const fieldTypes = [
    { 
      type: 'text', 
      label: 'Text Input', 
      icon: DocumentTextIcon, 
      description: 'Single line text input',
      defaultConfig: { placeholder: 'Enter text...', required: false, maxLength: 255 }
    },
    { 
      type: 'textarea', 
      label: 'Text Area', 
      icon: DocumentTextIcon, 
      description: 'Multi-line text input',
      defaultConfig: { placeholder: 'Enter description...', required: false, rows: 4 }
    },
    { 
      type: 'select', 
      label: 'Dropdown', 
      icon: ListBulletIcon, 
      description: 'Single selection dropdown',
      defaultConfig: { options: ['Option 1', 'Option 2'], required: false }
    },
    { 
      type: 'multiselect', 
      label: 'Multi-Select', 
      icon: CheckIcon, 
      description: 'Multiple selection dropdown',
      defaultConfig: { options: ['Option 1', 'Option 2'], required: false }
    },
    { 
      type: 'radio', 
      label: 'Radio Buttons', 
      icon: CheckIcon, 
      description: 'Single choice from options',
      defaultConfig: { options: ['Option 1', 'Option 2'], required: false }
    },
    { 
      type: 'checkbox', 
      label: 'Checkboxes', 
      icon: CheckIcon, 
      description: 'Multiple choice checkboxes',
      defaultConfig: { options: ['Option 1', 'Option 2'], required: false }
    },
    { 
      type: 'rating', 
      label: 'Rating Scale', 
      icon: StarIcon, 
      description: 'Star or number rating',
      defaultConfig: { maxRating: 5, required: false }
    },
    { 
      type: 'date', 
      label: 'Date Picker', 
      icon: CalendarIcon, 
      description: 'Date selection',
      defaultConfig: { required: false }
    },
    { 
      type: 'number', 
      label: 'Number Input', 
      icon: CurrencyDollarIcon, 
      description: 'Numeric input with validation',
      defaultConfig: { min: 0, max: 100, required: false }
    },
    { 
      type: 'email', 
      label: 'Email Input', 
      icon: UserIcon, 
      description: 'Email address input',
      defaultConfig: { required: false }
    },
    { 
      type: 'phone', 
      label: 'Phone Input', 
      icon: UserIcon, 
      description: 'Phone number input',
      defaultConfig: { required: false }
    },
    { 
      type: 'file', 
      label: 'File Upload', 
      icon: PhotoIcon, 
      description: 'File upload field',
      defaultConfig: { accept: '*/*', maxSize: '10MB', required: false }
    },
    { 
      type: 'url', 
      label: 'URL Input', 
      icon: LinkIcon, 
      description: 'Website URL input',
      defaultConfig: { required: false }
    }
  ];

  // Pre-built field templates for common HR use cases
  const fieldTemplates = [
    {
      category: 'Job Information',
      fields: [
        { type: 'text', label: 'Job Title', required: true, placeholder: 'e.g., Senior Developer' },
        { type: 'select', label: 'Department', required: true, options: ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance'] },
        { type: 'select', label: 'Employment Type', required: true, options: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
        { type: 'select', label: 'Experience Level', required: true, options: ['Entry Level', 'Mid Level', 'Senior Level', 'Executive'] },
        { type: 'text', label: 'Location', required: true, placeholder: 'e.g., New York, NY' },
        { type: 'select', label: 'Work Arrangement', required: true, options: ['Remote', 'Hybrid', 'On-site'] },
        { type: 'number', label: 'Salary Range (Min)', required: false, placeholder: 'e.g., 80000' },
        { type: 'number', label: 'Salary Range (Max)', required: false, placeholder: 'e.g., 120000' }
      ]
    },
    {
      category: 'Skills & Requirements',
      fields: [
        { type: 'multiselect', label: 'Required Skills', required: true, options: ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'AWS', 'Docker'] },
        { type: 'multiselect', label: 'Preferred Skills', required: false, options: ['TypeScript', 'GraphQL', 'Kubernetes', 'Machine Learning', 'DevOps'] },
        { type: 'textarea', label: 'Job Description', required: true, placeholder: 'Detailed job description...' },
        { type: 'textarea', label: 'Key Responsibilities', required: true, placeholder: 'List key responsibilities...' },
        { type: 'textarea', label: 'Qualifications', required: true, placeholder: 'Required qualifications...' }
      ]
    },
    {
      category: 'Interview Process',
      fields: [
        { type: 'select', label: 'Interview Type', required: true, options: ['Phone Screen', 'Video Interview', 'In-person', 'Technical Test', 'Panel Interview'] },
        { type: 'rating', label: 'Technical Skills Rating', required: true, maxRating: 5 },
        { type: 'rating', label: 'Communication Skills Rating', required: true, maxRating: 5 },
        { type: 'rating', label: 'Cultural Fit Rating', required: true, maxRating: 5 },
        { type: 'textarea', label: 'Interview Notes', required: false, placeholder: 'Interview feedback and notes...' },
        { type: 'select', label: 'Recommendation', required: true, options: ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] }
      ]
    }
  ];

  const addField = useCallback((fieldType) => {
    const fieldTemplate = fieldTypes.find(ft => ft.type === fieldType);
    if (!fieldTemplate) return;

    const newField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: fieldTemplate.label,
      required: false,
      ...fieldTemplate.defaultConfig
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField.id);
  }, []);

  const addFieldTemplate = useCallback((template) => {
    const newFields = template.fields.map((field, index) => ({
      id: `field_${Date.now()}_${index}`,
      type: field.type,
      label: field.label,
      required: field.required || false,
      ...field
    }));

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, ...newFields]
    }));
  }, []);

  const updateField = useCallback((fieldId, updates) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  }, []);

  const deleteField = useCallback((fieldId) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  }, [selectedField]);

  const moveField = useCallback((fieldId, direction) => {
    setForm(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(f => f.id === fieldId);
      
      if (direction === 'up' && index > 0) {
        [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      } else if (direction === 'down' && index < fields.length - 1) {
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      }
      
      return { ...prev, fields };
    });
  }, []);

  const duplicateField = useCallback((fieldId) => {
    setForm(prev => {
      const fieldToDuplicate = prev.fields.find(f => f.id === fieldId);
      if (!fieldToDuplicate) return prev;

      const duplicatedField = {
        ...fieldToDuplicate,
        id: `field_${Date.now()}`,
        label: `${fieldToDuplicate.label} (Copy)`
      };

      const index = prev.fields.findIndex(f => f.id === fieldId);
      const newFields = [...prev.fields];
      newFields.splice(index + 1, 0, duplicatedField);

      return { ...prev, fields: newFields };
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const formToSave = {
        ...form,
        metadata: {
          ...form.metadata,
          updatedAt: new Date().toISOString(),
          version: form.metadata.version + 1
        }
      };

      if (form.id) {
        // Update existing form
        await formTemplatesAPI.update(form.id, formToSave);
      } else {
        // Create new form
        const response = await formTemplatesAPI.create(formToSave);
        setForm(prev => ({ ...prev, id: response.data.id }));
      }
      
      onSave(formToSave);
    } catch (error) {
      console.error('Error saving form:', error);
      // Handle error (show notification, etc.)
    }
  }, [form, onSave]);

  const renderFieldEditor = (field) => {
    if (!field) return null;

    return (
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Field Settings
        </h3>
        
        <div className="space-y-4">
          {/* Basic Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Field Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              className="glass-input w-full"
              placeholder="Enter field label"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id={`required-${field.id}`}
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor={`required-${field.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Required field
            </label>
          </div>

          {/* Type-specific settings */}
          {field.type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                className="glass-input w-full"
                placeholder="Enter placeholder text"
              />
            </div>
          )}

          {field.type === 'textarea' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rows
              </label>
              <input
                type="number"
                value={field.rows || 4}
                onChange={(e) => updateField(field.id, { rows: parseInt(e.target.value) })}
                className="glass-input w-full"
                min="1"
                max="20"
              />
            </div>
          )}

          {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio' || field.type === 'checkbox') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {(field.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = e.target.value;
                        updateField(field.id, { options: newOptions });
                      }}
                      className="glass-input flex-1"
                    />
                    <button
                      onClick={() => {
                        const newOptions = (field.options || []).filter((_, i) => i !== index);
                        updateField(field.id, { options: newOptions });
                      }}
                      className="glass-button p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newOptions = [...(field.options || []), 'New Option'];
                    updateField(field.id, { options: newOptions });
                  }}
                  className="glass-button px-3 py-2 text-sm flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Option
                </button>
              </div>
            </div>
          )}

          {field.type === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Rating
              </label>
              <input
                type="number"
                value={field.maxRating || 5}
                onChange={(e) => updateField(field.id, { maxRating: parseInt(e.target.value) })}
                className="glass-input w-full"
                min="1"
                max="10"
              />
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Value
                </label>
                <input
                  type="number"
                  value={field.min || ''}
                  onChange={(e) => updateField(field.id, { min: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Value
                </label>
                <input
                  type="number"
                  value={field.max || ''}
                  onChange={(e) => updateField(field.id, { max: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="glass-input w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFieldPreview = (field) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      className: "glass-input w-full"
    };

    switch (field.type) {
      case 'text':
        return <input type="text" {...commonProps} placeholder={field.placeholder} />;
      
      case 'textarea':
        return <textarea {...commonProps} rows={field.rows} placeholder={field.placeholder} />;
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option</option>
            {(field.options || []).map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <select {...commonProps} multiple>
            {(field.options || []).map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <label key={index} className="flex items-center">
                <input type="radio" name={field.id} value={option} className="mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <label key={index} className="flex items-center">
                <input type="checkbox" value={option} className="mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex gap-1">
            {Array.from({ length: field.maxRating || 5 }, (_, i) => (
              <button key={i} type="button" className="text-2xl text-gray-300 hover:text-yellow-400">
                ★
              </button>
            ))}
          </div>
        );
      
      case 'date':
        return <input type="date" {...commonProps} />;
      
      case 'number':
        return <input type="number" {...commonProps} min={field.min} max={field.max} />;
      
      case 'email':
        return <input type="email" {...commonProps} placeholder="Enter email address" />;
      
      case 'phone':
        return <input type="tel" {...commonProps} placeholder="Enter phone number" />;
      
      case 'file':
        return <input type="file" {...commonProps} accept={field.accept} />;
      
      case 'url':
        return <input type="url" {...commonProps} placeholder="Enter website URL" />;
      
      default:
        return <div className="text-gray-500">Unknown field type</div>;
    }
  };

  if (isPreviewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
            Form Preview: {form.title}
          </h2>
          <button
            onClick={() => setIsPreviewMode(false)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Back to Editor
          </button>
        </div>

        <div className="glass-card-premium p-6">
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-6">{form.description}</p>
          )}
          
          <form className="space-y-6">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFieldPreview(field)}
              </div>
            ))}
            
            <div className="pt-6">
              <button
                type="submit"
                className="glass-button px-6 py-3 rounded-xl hover-scale bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
              >
                Submit Form
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white">
            Form Builder
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create dynamic forms for job postings and interviews
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsPreviewMode(true)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <EyeIcon className="w-5 h-5" />
            Preview
          </button>
          <button
            onClick={handleSave}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Save Form
          </button>
        </div>
      </div>

      {/* Form Settings */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
          Form Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Form Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="glass-input w-full"
              placeholder="Enter form title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="glass-input w-full"
            >
              <option value="job_posting">Job Posting</option>
              <option value="interview_form">Interview Form</option>
              <option value="evaluation_form">Evaluation Form</option>
              <option value="feedback_form">Feedback Form</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="glass-input w-full"
            rows="3"
            placeholder="Enter form description"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Templates */}
        <div className="lg:col-span-1">
          <div className="glass-card-premium p-6">
            <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
              Field Templates
            </h3>
            
            <div className="space-y-4">
              {fieldTemplates.map((template, index) => (
                <div key={index} className="glass-card p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {template.category}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.fields.length} fields
                  </p>
                  <button
                    onClick={() => addFieldTemplate(template)}
                    className="glass-button px-3 py-2 text-sm w-full flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Template
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Individual Fields</h4>
              <div className="grid grid-cols-2 gap-2">
                {fieldTypes.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    className="glass-button p-3 text-xs flex flex-col items-center gap-1 hover-scale"
                    title={fieldType.description}
                  >
                    <fieldType.icon className="w-4 h-4" />
                    <span className="text-center">{fieldType.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="lg:col-span-2">
          <div className="glass-card-premium p-6">
            <h3 className="text-lg font-bold font-heading text-gray-900 dark:text-white mb-4">
              Form Fields ({form.fields.length})
            </h3>
            
            {form.fields.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No fields added yet. Start by adding field templates or individual fields.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      selectedField === field.id ? 'ring-2 ring-primary-500' : 'hover-lift'
                    }`}
                    onClick={() => setSelectedField(field.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                          {React.createElement(fieldTypes.find(ft => ft.type === field.type)?.icon || DocumentTextIcon, { className: "w-4 h-4 text-white" })}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {field.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'up');
                            }}
                            disabled={index === 0}
                            className="glass-button p-1 text-xs disabled:opacity-50"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'down');
                            }}
                            disabled={index === form.fields.length - 1}
                            className="glass-button p-1 text-xs disabled:opacity-50"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateField(field.id);
                          }}
                          className="glass-button p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Duplicate field"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                          className="glass-button p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete field"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field Editor */}
      {selectedField && (
        <div className="mt-6">
          {renderFieldEditor(form.fields.find(f => f.id === selectedField))}
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
