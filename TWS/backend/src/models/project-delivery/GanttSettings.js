const mongoose = require('mongoose');

/**
 * GanttSettings Model
 * Stores user-specific Gantt chart display preferences and settings
 */
const ganttSettingsSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  showCriticalPath: {
    type: Boolean,
    default: true
  },
  showMilestones: {
    type: Boolean,
    default: true
  },
  showResourceAllocation: {
    type: Boolean,
    default: false
  },
  showProgressIndicator: {
    type: Boolean,
    default: true
  },
  showDependencies: {
    type: Boolean,
    default: true
  },
  showBaseline: {
    type: Boolean,
    default: false
  },
  showWeekends: {
    type: Boolean,
    default: true
  },
  showNonWorkingDays: {
    type: Boolean,
    default: true
  },
  workingDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5], // Monday to Friday
    validate: {
      validator: function(v) {
        return v.every(day => day >= 0 && day <= 6);
      },
      message: 'Working days must be numbers between 0 (Sunday) and 6 (Saturday)'
    }
  },
  workingHours: {
    start: {
      type: Number,
      default: 9,
      min: 0,
      max: 23
    },
    end: {
      type: Number,
      default: 17,
      min: 0,
      max: 23
    }
  },
  colorScheme: {
    type: String,
    enum: ['default', 'priority', 'status', 'resource', 'custom'],
    default: 'default'
  },
  taskHeight: {
    type: Number,
    default: 30,
    min: 20,
    max: 60
  },
  rowHeight: {
    type: Number,
    default: 40,
    min: 30,
    max: 80
  },
  autoSchedule: {
    type: Boolean,
    default: false
  },
  autoCalculateCriticalPath: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for user-specific project settings
ganttSettingsSchema.index({ orgId: 1, projectId: 1, userId: 1 }, { unique: true });
ganttSettingsSchema.index({ projectId: 1, userId: 1 });

module.exports = mongoose.model('GanttSettings', ganttSettingsSchema);
