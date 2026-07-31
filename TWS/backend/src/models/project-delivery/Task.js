const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  // Optional: for unique index tenantId_1_taskId_1 (legacy/integrations)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false,
    index: true
  },
  // Optional: external task id for integrations; when set with tenantId, must be unique per tenant
  taskId: {
    type: String,
    required: false,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // Department ownership (optional — tasks can exist without a department)
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: false,
    index: true
  },
  sprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    index: true
  },
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    index: true
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'under_review', 'completed', 'cancelled'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  type: {
    type: String,
    trim: true,
    default: 'task'
  },
  storyPoints: {
    type: Number,
    min: 0,
    default: null
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  estimatedDuration: {
    type: Number,
    min: 0,
    comment: 'Duration in days'
  },
  actualHours: {
    type: Number,
    default: 0,
    min: 0
  },
  actualDuration: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Actual duration in days (calculated from timesheet)'
  },
  blockedByTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  isOnCriticalPath: {
    type: Boolean,
    default: false,
    index: true
  },
  resourceOverallocated: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['planning', 'design', 'frontend', 'backend', 'integration', 'testing', 'deployment', 'documentation', 'optimization', 'other'],
    default: 'other'
  },
  labels: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
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
    }
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked_by', 'relates_to'],
      default: 'relates_to'
    }
  }],
  timeEntries: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hours: {
      type: Number,
      required: true,
      min: 0
    },
    description: String,
    date: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    notifyAssignee: {
      type: Boolean,
      default: true
    },
    autoArchive: {
      type: Boolean,
      default: false
    }
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ orgId: 1, projectId: 1 });
taskSchema.index({ orgId: 1, assignee: 1 });
taskSchema.index({ orgId: 1, status: 1 });
taskSchema.index({ orgId: 1, priority: 1 });
taskSchema.index({ orgId: 1, dueDate: 1 });
// Department-based indexes
taskSchema.index({ orgId: 1, departmentId: 1, status: 1 });
taskSchema.index({ orgId: 1, departmentId: 1, assignee: 1 });
taskSchema.index({ projectId: 1, departmentId: 1, status: 1 });
taskSchema.index({ projectId: 1, listId: 1, order: 1 });
taskSchema.index({ sprintId: 1, status: 1 });
taskSchema.index({ milestoneId: 1, status: 1 });
taskSchema.index({ projectId: 1, sprintId: 1 });
taskSchema.index({ projectId: 1, milestoneId: 1 });
taskSchema.index({ isOnCriticalPath: 1 });
taskSchema.index(
  { tenantId: 1, taskId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tenantId: { $type: 'objectId' },
      taskId: { $type: 'string' }
    }
  }
);

// Virtual for completion percentage based on subtasks
taskSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) {
    return this.progress;
  }
  const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Method to update actual hours from time entries
taskSchema.methods.updateActualHours = function() {
  this.actualHours = this.timeEntries.reduce((total, entry) => total + entry.hours, 0);
  return this.save();
};

// Method to add time entry
taskSchema.methods.addTimeEntry = function(userId, hours, description, date) {
  this.timeEntries.push({
    userId,
    hours,
    description,
    date: date || new Date()
  });
  return this.updateActualHours();
};

// Method to update status and set completion date
taskSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
    this.progress = 100;
  } else if (newStatus !== 'completed' && this.completedDate) {
    this.completedDate = null;
  }
  return this.save();
};

// Pre-save middleware to update progress based on subtasks
taskSchema.pre('save', function(next) {
  if (this.subtasks.length > 0) {
    const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
    this.progress = Math.round((completedSubtasks / this.subtasks.length) * 100);
  }
  next();
});

// Post-save hook: Auto-calculate deliverable progress when task status changes
taskSchema.post('save', async function() {
  // Only trigger if status changed and task is linked to a deliverable/milestone
  if (this.isModified('status') && this.milestoneId) {
    try {
      const nucleusAutoCalc = require('../services/nucleusAutoCalculationService');
      await nucleusAutoCalc.onTaskStatusChange(this._id);
    } catch (error) {
      console.error('Error auto-calculating deliverable progress:', error);
      // Don't throw - progress calculation is non-critical and shouldn't break task save
    }
  }
});

module.exports = mongoose.model('Task', taskSchema);
