const mongoose = require('mongoose');

const attendanceShiftSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Shift timing
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  // Break configuration
  breaks: [{
    name: {
      type: String,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 1
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    isMandatory: {
      type: Boolean,
      default: true
    }
  }],
  // Shift type and category
  type: {
    type: String,
    enum: ['regular', 'overtime', 'night', 'weekend', 'holiday', 'emergency', 'on-call'],
    default: 'regular'
  },
  category: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'intern'],
    default: 'full-time'
  },
  // Working days
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  }],
  // Overtime configuration
  overtime: {
    enabled: {
      type: Boolean,
      default: true
    },
    multiplier: {
      type: Number,
      default: 1.5,
      min: 1
    },
    minimumHours: {
      type: Number,
      default: 8,
      min: 0
    }
  },
  // Location requirements
  location: {
    required: {
      type: Boolean,
      default: true
    },
    allowedLocations: [{
      name: String,
      latitude: Number,
      longitude: Number,
      radius: {
        type: Number,
        default: 100 // meters
      }
    }],
    allowRemoteWork: {
      type: Boolean,
      default: false
    }
  },
  // Applicable to specific roles/departments
  applicableTo: {
    roles: [{
      type: String,
      enum: ['employee', 'manager', 'hr', 'admin', 'owner']
    }],
    departments: [String],
    employees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }]
  },
  // Shift rotation (if applicable)
  rotation: {
    enabled: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    duration: {
      type: Number, // in days/weeks/months
      default: 1
    }
  },
  // Minimum staffing requirements
  minimumStaff: {
    type: Number,
    default: 1,
    min: 1
  },
  maximumStaff: {
    type: Number,
    min: 1
  },
  // Color coding for UI
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  // Effective dates
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
attendanceShiftSchema.index({ organizationId: 1, isActive: 1 });
attendanceShiftSchema.index({ 'applicableTo.roles': 1 });
attendanceShiftSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Virtual for checking if shift is currently effective
attendanceShiftSchema.virtual('isCurrentlyEffective').get(function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveFrom <= now && 
         (!this.effectiveTo || this.effectiveTo >= now);
});

// Calculate total break time
attendanceShiftSchema.virtual('totalBreakTime').get(function() {
  return this.breaks.reduce((total, breakItem) => total + breakItem.duration, 0);
});

// Calculate net working time (excluding breaks)
attendanceShiftSchema.virtual('netWorkingTime').get(function() {
  return this.duration - this.totalBreakTime;
});

module.exports = mongoose.model('AttendanceShift', attendanceShiftSchema);
