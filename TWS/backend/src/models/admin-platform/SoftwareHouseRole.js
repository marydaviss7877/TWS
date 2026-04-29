const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Software House Specific Role Schema
const SoftwareHouseRoleSchema = new mongoose.Schema({
  // Basic Info
  orgId: { type: ObjectId, ref: 'Organization', required: true },
  tenantId: { type: ObjectId, ref: 'Tenant' },
  
  // Role Details
  name: { type: String, required: true },
  description: String,
  level: {
    type: String,
    enum: ['junior', 'mid', 'senior', 'lead', 'manager', 'director'],
    required: true
  },
  
  // Software House Specific Role Type
  roleType: {
    type: String,
    enum: [
      'developer',
      'tech_lead',
      'project_manager',
      'client_manager',
      'qa_engineer',
      'devops_engineer',
      'ui_ux_designer',
      'business_analyst',
      'scrum_master',
      'product_owner',
      'admin',
      'owner'
    ],
    required: true
  },
  
  // Project Access Permissions
  projectAccess: {
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canAssign: { type: Boolean, default: false },
    canViewAll: { type: Boolean, default: false },
    canViewAssigned: { type: Boolean, default: true }
  },
  
  // Sprint Management Permissions
  sprintAccess: {
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canStart: { type: Boolean, default: false },
    canComplete: { type: Boolean, default: false },
    canManageBacklog: { type: Boolean, default: false }
  },
  
  // Task Management Permissions
  taskAccess: {
    canCreate: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: false },
    canAssign: { type: Boolean, default: false },
    canViewAll: { type: Boolean, default: false },
    canViewAssigned: { type: Boolean, default: true }
  },
  
  // Time Tracking Permissions
  timeTrackingAccess: {
    canLogTime: { type: Boolean, default: true },
    canEditTime: { type: Boolean, default: true },
    canViewAllTime: { type: Boolean, default: false },
    canApproveTime: { type: Boolean, default: false },
    canSetRates: { type: Boolean, default: false }
  },
  
  // Client Management Permissions
  clientAccess: {
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canViewAll: { type: Boolean, default: false },
    canViewAssigned: { type: Boolean, default: true },
    canManageContracts: { type: Boolean, default: false }
  },
  
  // Financial Permissions
  financialAccess: {
    canViewBudget: { type: Boolean, default: false },
    canEditBudget: { type: Boolean, default: false },
    canViewInvoices: { type: Boolean, default: false },
    canCreateInvoices: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false }
  },
  
  // Analytics Permissions
  analyticsAccess: {
    canViewProjectAnalytics: { type: Boolean, default: false },
    canViewTeamAnalytics: { type: Boolean, default: false },
    canViewClientAnalytics: { type: Boolean, default: false },
    canViewFinancialAnalytics: { type: Boolean, default: false },
    canExportReports: { type: Boolean, default: false }
  },
  
  // HR Permissions
  hrAccess: {
    canViewTeam: { type: Boolean, default: true },
    canManageTeam: { type: Boolean, default: false },
    canViewPerformance: { type: Boolean, default: false },
    canManagePerformance: { type: Boolean, default: false }
  },
  
  // System Permissions
  systemAccess: {
    canManageUsers: { type: Boolean, default: false },
    canManageRoles: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canViewLogs: { type: Boolean, default: false }
  },
  
  // Module Access (ERP Modules) - All 14 Modules for Software House
  moduleAccess: {
    // Core ERP Modules (10)
    hr_management: { type: Boolean, default: true },
    finance: { type: Boolean, default: false },
    projects: { type: Boolean, default: true },
    operations: { type: Boolean, default: false },
    reports: { type: Boolean, default: false },
    time_attendance: { type: Boolean, default: true },
    communication: { type: Boolean, default: true },
    role_management: { type: Boolean, default: false },
    system_settings: { type: Boolean, default: false },
    // Software House Specific Modules (1 additional)
    clients: { type: Boolean, default: false }
  },
  
  // Technology Stack Access
  techStackAccess: {
    frontend: [String], // Technologies they can work with
    backend: [String],
    database: [String],
    cloud: [String],
    tools: [String]
  },
  
  // Project Type Access
  projectTypeAccess: {
    web_application: { type: Boolean, default: true },
    mobile_app: { type: Boolean, default: true },
    api_development: { type: Boolean, default: true },
    system_integration: { type: Boolean, default: false },
    maintenance_support: { type: Boolean, default: true },
    consulting: { type: Boolean, default: false }
  },
  
  // Hourly Rate (for billing)
  hourlyRate: {
    type: Number,
    default: 0
  },
  
  // Role Hierarchy
  reportsTo: { type: ObjectId, ref: 'SoftwareHouseRole' },
  manages: [{ type: ObjectId, ref: 'SoftwareHouseRole' }],
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Metadata
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
SoftwareHouseRoleSchema.index({ orgId: 1, roleType: 1 });
SoftwareHouseRoleSchema.index({ tenantId: 1, isActive: 1 });
SoftwareHouseRoleSchema.index({ level: 1, roleType: 1 });

// Virtual for role hierarchy level
SoftwareHouseRoleSchema.virtual('hierarchyLevel').get(function() {
  const levels = {
    'junior': 1,
    'mid': 2,
    'senior': 3,
    'lead': 4,
    'manager': 5,
    'director': 6
  };
  return levels[this.level] || 0;
});

// Virtual for permissions summary
SoftwareHouseRoleSchema.virtual('permissionsSummary').get(function() {
  return {
    canManageProjects: this.projectAccess.canCreate || this.projectAccess.canEdit,
    canManageSprints: this.sprintAccess.canCreate || this.sprintAccess.canStart,
    canManageTasks: this.taskAccess.canCreate || this.taskAccess.canEdit,
    canManageClients: this.clientAccess.canCreate || this.clientAccess.canEdit,
    canViewAnalytics: this.analyticsAccess.canViewProjectAnalytics || this.analyticsAccess.canViewTeamAnalytics,
    canManageTeam: this.hrAccess.canManageTeam,
    canManageSystem: this.systemAccess.canManageUsers || this.systemAccess.canManageSettings
  };
});

// Pre-save middleware
SoftwareHouseRoleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set default permissions based on role type
  if (this.isNew) {
    this.setDefaultPermissions();
  }
  
  next();
});

// Method to set default permissions based on role type
SoftwareHouseRoleSchema.methods.setDefaultPermissions = function() {
  const roleDefaults = {
    'developer': {
      projectAccess: { canViewAssigned: true },
      taskAccess: { canCreate: true, canEdit: true, canViewAssigned: true },
      timeTrackingAccess: { canLogTime: true, canEditTime: true },
      clientAccess: { canViewAssigned: true },
      moduleAccess: { projects: true, time_attendance: true, communication: true }
    },
    'tech_lead': {
      projectAccess: { canEdit: true, canAssign: true, canViewAll: true },
      sprintAccess: { canCreate: true, canEdit: true, canStart: true, canManageBacklog: true },
      taskAccess: { canCreate: true, canEdit: true, canAssign: true, canViewAll: true },
      timeTrackingAccess: { canLogTime: true, canEditTime: true, canViewAllTime: true, canApproveTime: true },
      clientAccess: { canViewAll: true },
      analyticsAccess: { canViewProjectAnalytics: true, canViewTeamAnalytics: true },
      hrAccess: { canViewTeam: true, canViewPerformance: true },
      moduleAccess: { projects: true, time_attendance: true, communication: true, reports: true }
    },
    'project_manager': {
      projectAccess: { canCreate: true, canEdit: true, canAssign: true, canViewAll: true },
      sprintAccess: { canCreate: true, canEdit: true, canStart: true, canComplete: true, canManageBacklog: true },
      taskAccess: { canCreate: true, canEdit: true, canAssign: true, canViewAll: true },
      timeTrackingAccess: { canLogTime: true, canEditTime: true, canViewAllTime: true, canApproveTime: true },
      clientAccess: { canCreate: true, canEdit: true, canViewAll: true, canManageContracts: true },
      financialAccess: { canViewBudget: true, canEditBudget: true, canViewInvoices: true, canViewReports: true },
      analyticsAccess: { canViewProjectAnalytics: true, canViewTeamAnalytics: true, canViewClientAnalytics: true, canExportReports: true },
      hrAccess: { canViewTeam: true, canManageTeam: true, canViewPerformance: true },
      moduleAccess: { projects: true, finance: true, time_attendance: true, communication: true, reports: true }
    },
    'client_manager': {
      projectAccess: { canViewAll: true },
      taskAccess: { canViewAll: true },
      timeTrackingAccess: { canViewAllTime: true },
      clientAccess: { canCreate: true, canEdit: true, canViewAll: true, canManageContracts: true },
      financialAccess: { canViewBudget: true, canViewInvoices: true, canCreateInvoices: true, canViewReports: true },
      analyticsAccess: { canViewClientAnalytics: true, canViewFinancialAnalytics: true, canExportReports: true },
      moduleAccess: { projects: true, finance: true, communication: true, reports: true }
    },
    'admin': {
      projectAccess: { canCreate: true, canEdit: true, canDelete: true, canAssign: true, canViewAll: true },
      sprintAccess: { canCreate: true, canEdit: true, canStart: true, canComplete: true, canManageBacklog: true },
      taskAccess: { canCreate: true, canEdit: true, canDelete: true, canAssign: true, canViewAll: true },
      timeTrackingAccess: { canLogTime: true, canEditTime: true, canViewAllTime: true, canApproveTime: true, canSetRates: true },
      clientAccess: { canCreate: true, canEdit: true, canDelete: true, canViewAll: true, canManageContracts: true },
      financialAccess: { canViewBudget: true, canEditBudget: true, canViewInvoices: true, canCreateInvoices: true, canViewReports: true },
      analyticsAccess: { canViewProjectAnalytics: true, canViewTeamAnalytics: true, canViewClientAnalytics: true, canViewFinancialAnalytics: true, canExportReports: true },
      hrAccess: { canViewTeam: true, canManageTeam: true, canViewPerformance: true, canManagePerformance: true },
      systemAccess: { canManageUsers: true, canManageRoles: true, canManageSettings: true, canViewLogs: true },
      moduleAccess: { hr_management: true, finance: true, projects: true, operations: true, reports: true, time_attendance: true, communication: true, role_management: true, system_settings: true, clients: true }
    }
  };
  
  const defaults = roleDefaults[this.roleType];
  if (defaults) {
    Object.assign(this, defaults);
  }
};

module.exports = mongoose.model('SoftwareHouseRole', SoftwareHouseRoleSchema);
