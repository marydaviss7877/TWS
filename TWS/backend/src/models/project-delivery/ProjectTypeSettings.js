const mongoose = require('mongoose');

/**
 * Project Type Settings Model
 * Defines integration requirements and rules for different project types
 */
const projectTypeSettingsSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  projectType: {
    type: String,
    enum: [
      // Standard project types (matches Project.projectType enum)
      'web_application',
      'mobile_app',
      'api_development',
      'system_integration',
      'maintenance_support',
      'consulting',
      'general',
      // Software-house specific types
      'app_development',
      'ai_tool_development',
      'low_ticket_client',
      'high_ticket_client',
      'media_buying',
      'ghl_project'
    ],
    required: true,
    default: 'general'
  },
  // Integration Requirements
  requiresSprint: {
    type: Boolean,
    default: false
  },
  requiresMilestone: {
    type: Boolean,
    default: false
  },
  requiresTimesheet: {
    type: Boolean,
    default: true
  },
  requiresGantt: {
    type: Boolean,
    default: false
  },
  // Sprint Configuration
  sprintDurationDays: {
    type: Number,
    default: 14,
    min: 1,
    max: 30
  },
  sprintCapacityHours: {
    type: Number,
    default: 320,
    min: 0
  },
  // Timesheet Configuration
  timesheetApprovalRequired: {
    type: Boolean,
    default: false
  },
  timesheetRequiredForTaskCompletion: {
    type: Boolean,
    default: false
  },
  timesheetOverBudgetThreshold: {
    type: Number,
    default: 20,
    min: 0,
    max: 100,
    comment: 'Percentage over estimated hours before alert'
  },
  // Billing Configuration
  billingEnabled: {
    type: Boolean,
    default: false
  },
  billableHoursRequired: {
    type: Boolean,
    default: false
  },
  // Task Configuration
  taskDependenciesEnforced: {
    type: Boolean,
    default: false
  },
  taskCompletionRequiresApproval: {
    type: Boolean,
    default: false
  },
  // Milestone Configuration
  milestoneSignOffRequired: {
    type: Boolean,
    default: false
  },
  milestoneAutoCalculateProgress: {
    type: Boolean,
    default: true
  },
  // Gantt Configuration
  ganttShowCriticalPath: {
    type: Boolean,
    default: true
  },
  ganttAutoUpdate: {
    type: Boolean,
    default: true
  },
  // Resource Management
  resourceAllocationTracking: {
    type: Boolean,
    default: false
  },
  preventResourceOverallocation: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index
projectTypeSettingsSchema.index({ orgId: 1, projectId: 1 }, { unique: true });
projectTypeSettingsSchema.index({ projectType: 1 });

module.exports = mongoose.model('ProjectTypeSettings', projectTypeSettingsSchema);
