const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Project-Based Access Control Schema
const ProjectAccessSchema = new mongoose.Schema({
  // Basic Info
  projectId: { type: ObjectId, ref: 'Project', required: true },
  orgId: { type: ObjectId, ref: 'Organization', required: true },
  tenantId: { type: ObjectId, ref: 'Tenant' },
  
  // User/Team Access
  userId: { type: ObjectId, ref: 'User' },
  teamId: { type: ObjectId, ref: 'Team' },
  roleId: { type: ObjectId, ref: 'SoftwareHouseRole' },
  
  // Access Type
  accessType: {
    type: String,
    enum: ['user', 'team', 'role'],
    required: true
  },
  
  // Project Permissions
  permissions: {
    // Project Management
    canView: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canManage: { type: Boolean, default: false },
    
    // Task Management
    canCreateTasks: { type: Boolean, default: true },
    canEditTasks: { type: Boolean, default: true },
    canDeleteTasks: { type: Boolean, default: false },
    canAssignTasks: { type: Boolean, default: false },
    canViewAllTasks: { type: Boolean, default: false },
    canViewAssignedTasks: { type: Boolean, default: true },
    
    // Sprint Management
    canCreateSprints: { type: Boolean, default: false },
    canEditSprints: { type: Boolean, default: false },
    canStartSprints: { type: Boolean, default: false },
    canCompleteSprints: { type: Boolean, default: false },
    canManageSprintBacklog: { type: Boolean, default: false },
    
    // Time Tracking
    canLogTime: { type: Boolean, default: true },
    canEditTime: { type: Boolean, default: true },
    canViewAllTime: { type: Boolean, default: false },
    canApproveTime: { type: Boolean, default: false },
    canSetHourlyRates: { type: Boolean, default: false },
    
    // Client Communication
    canCommunicateWithClient: { type: Boolean, default: false },
    canViewClientInfo: { type: Boolean, default: true },
    canManageClientContracts: { type: Boolean, default: false },
    
    // Financial Access
    canViewBudget: { type: Boolean, default: false },
    canEditBudget: { type: Boolean, default: false },
    canViewInvoices: { type: Boolean, default: false },
    canCreateInvoices: { type: Boolean, default: false },
    
    // Analytics Access
    canViewProjectAnalytics: { type: Boolean, default: false },
    canViewTeamAnalytics: { type: Boolean, default: false },
    canExportReports: { type: Boolean, default: false },
    
    // File Management
    canUploadFiles: { type: Boolean, default: true },
    canDownloadFiles: { type: Boolean, default: true },
    canDeleteFiles: { type: Boolean, default: false },
    canManageFiles: { type: Boolean, default: false },
    
    // Comments and Communication
    canAddComments: { type: Boolean, default: true },
    canEditComments: { type: Boolean, default: true },
    canDeleteComments: { type: Boolean, default: false },
    canMentionUsers: { type: Boolean, default: true },
    
    // Notifications
    canReceiveNotifications: { type: Boolean, default: true },
    canManageNotifications: { type: Boolean, default: false }
  },
  
  // Project Role
  projectRole: {
    type: String,
    enum: [
      'owner',
      'project_manager',
      'tech_lead',
      'developer',
      'qa_engineer',
      'ui_ux_designer',
      'business_analyst',
      'client_representative',
      'stakeholder',
      'observer'
    ],
    default: 'developer'
  },
  
  // Access Level
  accessLevel: {
    type: String,
    enum: ['read_only', 'contributor', 'developer', 'lead', 'manager', 'owner'],
    default: 'contributor'
  },
  
  // Project Phase Access
  phaseAccess: {
    planning: { type: Boolean, default: true },
    development: { type: Boolean, default: true },
    testing: { type: Boolean, default: true },
    deployment: { type: Boolean, default: false },
    maintenance: { type: Boolean, default: false }
  },
  
  // Technology Stack Access
  techStackAccess: {
    frontend: [String],
    backend: [String],
    database: [String],
    cloud: [String],
    tools: [String]
  },
  
  // Time Allocation
  timeAllocation: {
    percentage: { type: Number, default: 100, min: 0, max: 100 },
    hoursPerWeek: { type: Number, default: 40 },
    startDate: Date,
    endDate: Date
  },
  
  // Hourly Rate (project-specific)
  hourlyRate: {
    type: Number,
    default: 0
  },
  
  // Access Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  
  // Access Restrictions
  restrictions: {
    ipWhitelist: [String],
    timeRestrictions: {
      startTime: String, // HH:MM format
      endTime: String,   // HH:MM format
      daysOfWeek: [Number] // 0-6 (Sunday-Saturday)
    },
    locationRestrictions: {
      allowedCountries: [String],
      allowedCities: [String]
    }
  },
  
  // Audit Trail
  grantedBy: { type: ObjectId, ref: 'User', required: true },
  grantedAt: { type: Date, default: Date.now },
  lastAccessed: Date,
  accessCount: { type: Number, default: 0 },
  
  // Expiration
  expiresAt: Date,
  isPermanent: { type: Boolean, default: true },
  
  // Metadata
  notes: String,
  tags: [String],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
ProjectAccessSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectAccessSchema.index({ projectId: 1, teamId: 1 });
ProjectAccessSchema.index({ projectId: 1, roleId: 1 });
ProjectAccessSchema.index({ orgId: 1, status: 1 });
ProjectAccessSchema.index({ userId: 1, status: 1 });
ProjectAccessSchema.index({ expiresAt: 1 });

// Virtual for access summary
ProjectAccessSchema.virtual('accessSummary').get(function() {
  return {
    canManage: this.permissions.canManage,
    canEdit: this.permissions.canEdit,
    canCreateTasks: this.permissions.canCreateTasks,
    canManageSprints: this.permissions.canCreateSprints || this.permissions.canStartSprints,
    canViewAnalytics: this.permissions.canViewProjectAnalytics || this.permissions.canViewTeamAnalytics,
    canManageBudget: this.permissions.canEditBudget,
    canCommunicateWithClient: this.permissions.canCommunicateWithClient
  };
});

// Virtual for permission level
ProjectAccessSchema.virtual('permissionLevel').get(function() {
  if (this.permissions.canManage) return 'manager';
  if (this.permissions.canEdit) return 'editor';
  if (this.permissions.canCreateTasks) return 'contributor';
  return 'viewer';
});

// Pre-save middleware
ProjectAccessSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set default permissions based on project role
  if (this.isNew) {
    this.setDefaultPermissions();
  }
  
  next();
});

// Method to set default permissions based on project role
ProjectAccessSchema.methods.setDefaultPermissions = function() {
  const roleDefaults = {
    'owner': {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canCreateSprints: true,
      canEditSprints: true,
      canStartSprints: true,
      canCompleteSprints: true,
      canManageSprintBacklog: true,
      canViewAllTime: true,
      canApproveTime: true,
      canSetHourlyRates: true,
      canCommunicateWithClient: true,
      canManageClientContracts: true,
      canViewBudget: true,
      canEditBudget: true,
      canViewInvoices: true,
      canCreateInvoices: true,
      canViewProjectAnalytics: true,
      canViewTeamAnalytics: true,
      canExportReports: true,
      canManageFiles: true,
      canDeleteComments: true,
      canManageNotifications: true
    },
    'project_manager': {
      canView: true,
      canEdit: true,
      canManage: true,
      canCreateTasks: true,
      canEditTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canCreateSprints: true,
      canEditSprints: true,
      canStartSprints: true,
      canCompleteSprints: true,
      canManageSprintBacklog: true,
      canViewAllTime: true,
      canApproveTime: true,
      canCommunicateWithClient: true,
      canViewBudget: true,
      canEditBudget: true,
      canViewInvoices: true,
      canViewProjectAnalytics: true,
      canViewTeamAnalytics: true,
      canExportReports: true,
      canManageFiles: true
    },
    'tech_lead': {
      canView: true,
      canEdit: true,
      canCreateTasks: true,
      canEditTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canCreateSprints: true,
      canEditSprints: true,
      canStartSprints: true,
      canManageSprintBacklog: true,
      canViewAllTime: true,
      canApproveTime: true,
      canViewBudget: true,
      canViewProjectAnalytics: true,
      canViewTeamAnalytics: true,
      canManageFiles: true
    },
    'developer': {
      canView: true,
      canCreateTasks: true,
      canEditTasks: true,
      canViewAssignedTasks: true,
      canLogTime: true,
      canEditTime: true,
      canUploadFiles: true,
      canDownloadFiles: true,
      canAddComments: true,
      canEditComments: true,
      canMentionUsers: true,
      canReceiveNotifications: true
    },
    'qa_engineer': {
      canView: true,
      canCreateTasks: true,
      canEditTasks: true,
      canViewAssignedTasks: true,
      canLogTime: true,
      canEditTime: true,
      canUploadFiles: true,
      canDownloadFiles: true,
      canAddComments: true,
      canEditComments: true,
      canMentionUsers: true,
      canReceiveNotifications: true
    },
    'client_representative': {
      canView: true,
      canViewAssignedTasks: true,
      canCommunicateWithClient: true,
      canViewClientInfo: true,
      canDownloadFiles: true,
      canAddComments: true,
      canMentionUsers: true,
      canReceiveNotifications: true
    },
    'observer': {
      canView: true,
      canViewAssignedTasks: true,
      canDownloadFiles: true,
      canReceiveNotifications: true
    }
  };
  
  const defaults = roleDefaults[this.projectRole];
  if (defaults) {
    Object.assign(this.permissions, defaults);
  }
};

// Method to check if user has specific permission
ProjectAccessSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Method to check if user can access project phase
ProjectAccessSchema.methods.canAccessPhase = function(phase) {
  return this.phaseAccess[phase] === true;
};

// Method to check if access is expired
ProjectAccessSchema.methods.isExpired = function() {
  if (this.isPermanent) return false;
  return this.expiresAt && new Date() > this.expiresAt;
};

// Method to update last accessed
ProjectAccessSchema.methods.updateLastAccessed = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

module.exports = mongoose.model('ProjectAccess', ProjectAccessSchema);
