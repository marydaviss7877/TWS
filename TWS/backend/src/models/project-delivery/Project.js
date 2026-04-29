const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  // @deprecated - Use primaryDepartmentId instead. Will be removed in v2.0
  // Kept for backward compatibility only
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false,
    index: false
  },
  // Primary department (for reporting & ownership)
  primaryDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: false,
    index: true
  },
  // Multi-department collaboration
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  /**
   * Per-department view and action config (Plan §8.2).
   * One project → many department views; filter APIs by this config.
   */
  projectDepartmentConfigs: [{
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    roleInProject: {
      type: String,
      enum: ['dev', 'design', 'qa', 'pm', 'finance_observer', 'sales_observer'],
      required: true
    },
    viewConfig: {
      canSeeTasks: { type: Boolean, default: false },
      canSeeInternalBugs: { type: Boolean, default: false },
      canSeeBudget: { type: Boolean, default: false },
      canSeeTeamMembers: { type: Boolean, default: false },
      canSeeClientDetails: { type: Boolean, default: false },
      canSeeTimeEntries: { type: Boolean, default: false },
      canSeeDeliverables: { type: Boolean, default: false },
      canSeeChangeRequests: { type: Boolean, default: false },
      canSeeInvoices: { type: Boolean, default: false },
      canExportData: { type: Boolean, default: false }
    },
    actionConfig: {
      canCreateTasks: { type: Boolean, default: false },
      canApproveTasks: { type: Boolean, default: false },
      canLogTime: { type: Boolean, default: false },
      canUploadFiles: { type: Boolean, default: false },
      canCommentInternally: { type: Boolean, default: false }
    }
  }],
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectClient',
    required: false // Made optional - projects can exist without a client initially
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: String,
  /** Custom logo for workspace header / branding (relative path, e.g. /uploads/project-logos/...) */
  logoUrl: {
    type: String,
    trim: true
  },
  // Software House Specific Project Type
  projectType: {
    type: String,
    enum: [
      'web_application', 
      'mobile_app', 
      'api_development', 
      'system_integration', 
      'maintenance_support', 
      'consulting', 
      'general'
    ],
    default: 'general'
  },
  // Development Methodology
  methodology: {
    type: String,
    enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'],
    default: 'agile'
  },
  // Technology Stack
  techStack: {
    frontend: [String],
    backend: [String],
    database: [String],
    cloud: [String],
    tools: [String]
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
    default: 'planning'
  },
  archived_at: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  budget: {
    total: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    spent: {
      type: Number,
      default: 0
    },
    remaining: {
      type: Number,
      default: 0
    }
  },
  timeline: {
    startDate: Date,
    endDate: Date,
    estimatedHours: Number,
    actualHours: {
      type: Number,
      default: 0
    }
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectTemplate'
  },
  settings: {
    allowClientAccess: {
      type: Boolean,
      default: true
    },
    clientCanComment: {
      type: Boolean,
      default: true
    },
    clientCanApprove: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    autoArchive: {
      type: Boolean,
      default: false
    },
    archiveAfterDays: {
      type: Number,
      default: 30
    },
    // Portal-specific settings
    portalSettings: {
      isPortalProject: {
        type: Boolean,
        default: false
      },
      portalVisibility: {
        type: String,
        enum: ['none', 'public', 'private', 'client_only', 'basic', 'detailed', 'full'],
        default: 'private'
      },
      allowClientPortal: {
        type: Boolean,
        default: false // SECURITY: Default to false (opt-in)
      },
      clientCanCreateCards: {
        type: Boolean,
        default: false
      },
      clientCanEditCards: {
        type: Boolean,
        default: true
      },
      requireClientApproval: {
        type: Boolean,
        default: false
      },
      autoNotifyClient: {
        type: Boolean,
        default: true
      },
      syncWithERP: {
        type: Boolean,
        default: true
      },
      // SECURITY: Feature toggles for granular access control
      features: {
        projectProgress: {
          type: Boolean,
          default: true
        },
        timeTracking: {
          type: Boolean,
          default: false
        },
        invoices: {
          type: Boolean,
          default: true
        },
        documents: {
          type: Boolean,
          default: true
        },
        communication: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  tags: [String],
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }],
  files: [{
    fileId: String,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['document', 'design', 'code', 'other']
    }
  }],
  metrics: {
    completionRate: {
      type: Number,
      default: 0
    },
    onTimeDelivery: {
      type: Boolean,
      default: true
    },
    clientSatisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    profitMargin: {
      type: Number,
      default: 0
    }
  },
  // Enhanced profitability tracking
  profitability: {
    budgetedRevenue: {
      type: Number,
      default: 0
    },
    actualRevenue: {
      type: Number,
      default: 0
    },
    budgetedCost: {
      type: Number,
      default: 0
    },
    actualCost: {
      type: Number,
      default: 0
    },
    margin: {
      type: Number,
      default: 0
    },
    marginPercentage: {
      type: Number,
      default: 0
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    billableHours: {
      type: Number,
      default: 0
    },
    nonBillableHours: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
projectSchema.index({ orgId: 1, clientId: 1 });
projectSchema.index({ orgId: 1, slug: 1 }, { unique: true });
projectSchema.index({ orgId: 1, status: 1 });
// Department-based indexes
projectSchema.index({ orgId: 1, primaryDepartmentId: 1 });
projectSchema.index({ orgId: 1, primaryDepartmentId: 1, status: 1 });
projectSchema.index({ orgId: 1, departments: 1 });
projectSchema.index({ orgId: 1, clientId: 1, status: 1 });
// Deprecated workspaceId index removed
projectSchema.index({ 'timeline.endDate': 1 });
// Indexes for client portal queries (performance optimization)
projectSchema.index({ 'settings.portalSettings.isPortalProject': 1 });
projectSchema.index({ 'settings.portalSettings.allowClientPortal': 1, tenantId: 1 });
projectSchema.index({ 'settings.portalSettings.allowClientPortal': 1, clientId: 1 });
projectSchema.index({ tenantId: 1, clientId: 1, 'settings.portalSettings.allowClientPortal': 1 });

module.exports = mongoose.model('Project', projectSchema);
