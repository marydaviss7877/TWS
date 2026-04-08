const mongoose = require('mongoose');

// ERP Template Schema for different business types
const erpTemplateSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['education', 'healthcare', 'software_house'],
    required: true
  },
  description: String,
  version: {
    type: String,
    default: '1.0.0'
  },
  
  // Template Configuration
  configuration: {
    // Default ERP modules for this category
    defaultModules: [{
      type: String,
      enum: ['hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles']
    }],
    
    // Software House specific configuration
    softwareHouseConfig: {
      defaultMethodology: {
        type: String,
        enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'],
        default: 'agile'
      },
      supportedMethodologies: [{
        type: String,
        enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid']
      }],
      techStack: {
        frontend: [String],
        backend: [String],
        database: [String],
        cloud: [String],
        tools: [String]
      },
      supportedProjectTypes: [{
        type: String,
        enum: ['web_application', 'mobile_app', 'api_development', 'system_integration', 'maintenance_support', 'consulting']
      }],
      developmentSettings: {
        defaultSprintDuration: { type: Number, default: 14 },
        storyPointScale: { type: String, enum: ['fibonacci', 'linear', 'custom'], default: 'fibonacci' },
        timeTrackingEnabled: { type: Boolean, default: true },
        codeQualityTracking: { type: Boolean, default: true },
        automatedTesting: { type: Boolean, default: false }
      },
      billingConfig: {
        defaultHourlyRate: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' },
        billingCycle: { type: String, enum: ['weekly', 'monthly', 'quarterly'], default: 'monthly' },
        invoiceTemplate: { type: String, default: 'standard' },
        autoInvoiceGeneration: { type: Boolean, default: false }
      },
      teamConfig: {
        maxTeamSize: { type: Number, default: 50 },
        allowRemoteWork: { type: Boolean, default: true },
        requireTimeTracking: { type: Boolean, default: true },
        allowOvertime: { type: Boolean, default: true },
        maxOvertimeHours: { type: Number, default: 20 }
      },
      qualityConfig: {
        codeReviewRequired: { type: Boolean, default: true },
        testingRequired: { type: Boolean, default: true },
        documentationRequired: { type: Boolean, default: true },
        minCodeCoverage: { type: Number, default: 80 },
        maxTechnicalDebt: { type: Number, default: 20 }
      }
    },
    
    // Default roles for this ERP category
    defaultRoles: [{
      name: String,
      roleType: {
        type: String,
        enum: ['developer', 'tech_lead', 'project_manager', 'client_manager', 'qa_engineer', 'devops_engineer', 'ui_ux_designer', 'business_analyst', 'scrum_master', 'product_owner', 'admin', 'owner']
      },
      level: {
        type: String,
        enum: ['junior', 'mid', 'senior', 'lead', 'manager', 'director']
      },
      hourlyRate: { type: Number, default: 0 },
      permissions: {
        projectAccess: {
          canView: { type: Boolean, default: true },
          canEdit: { type: Boolean, default: false },
          canDelete: { type: Boolean, default: false },
          canManage: { type: Boolean, default: false }
        },
        moduleAccess: {
          hr_management: { type: Boolean, default: true },
          finance: { type: Boolean, default: false },
          projects: { type: Boolean, default: true },
          operations: { type: Boolean, default: false },
          reports: { type: Boolean, default: false },
          time_attendance: { type: Boolean, default: true },
          communication: { type: Boolean, default: true },
          role_management: { type: Boolean, default: false },
          system_settings: { type: Boolean, default: false }
        }
      }
    }]
  },
  
  // Template Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Created by SupraAdmin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
erpTemplateSchema.index({ category: 1, isActive: 1 });
erpTemplateSchema.index({ isDefault: 1, category: 1 });

// Virtual for template summary
erpTemplateSchema.virtual('summary').get(function() {
  return {
    name: this.name,
    category: this.category,
    moduleCount: this.configuration.defaultModules.length,
    roleCount: this.configuration.defaultRoles.length,
    hasSoftwareHouseConfig: !!this.configuration.softwareHouseConfig
  };
});

// Method to apply template to tenant
erpTemplateSchema.methods.applyToTenant = function(tenantId) {
  return {
    erpCategory: this.category,
    erpModules: this.configuration.defaultModules,
    softwareHouseConfig: this.configuration.softwareHouseConfig || null
  };
};

// Method to create default roles from template
erpTemplateSchema.methods.createDefaultRoles = function(orgId, tenantId, createdBy) {
  return this.configuration.defaultRoles.map(role => ({
    orgId,
    tenantId,
    name: role.name,
    roleType: role.roleType,
    level: role.level,
    hourlyRate: role.hourlyRate,
    projectAccess: role.permissions.projectAccess,
    moduleAccess: role.permissions.moduleAccess,
    createdBy
  }));
};

module.exports = mongoose.model('ERPTemplate', erpTemplateSchema);
