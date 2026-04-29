const mongoose = require('mongoose');

const attendancePolicySchema = new mongoose.Schema({
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
  // Working hours configuration
  workingHours: {
    standardHoursPerDay: {
      type: Number,
      default: 8,
      min: 1,
      max: 24
    },
    standardDaysPerWeek: {
      type: Number,
      default: 5,
      min: 1,
      max: 7
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    dailySchedule: {
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
      breakDuration: {
        type: Number,
        default: 60, // minutes
        min: 0
      }
    }
  },
  // Late arrival and early departure policies
  tolerance: {
    lateArrivalTolerance: {
      type: Number,
      default: 15, // minutes
      min: 0
    },
    earlyDepartureTolerance: {
      type: Number,
      default: 15, // minutes
      min: 0
    },
    gracePeriod: {
      type: Number,
      default: 5, // minutes
      min: 0
    }
  },
  // Overtime policies
  overtime: {
    enabled: {
      type: Boolean,
      default: true
    },
    minimumHoursForOvertime: {
      type: Number,
      default: 8,
      min: 0
    },
    overtimeMultiplier: {
      type: Number,
      default: 1.5,
      min: 1
    },
    weekendMultiplier: {
      type: Number,
      default: 2.0,
      min: 1
    },
    holidayMultiplier: {
      type: Number,
      default: 2.5,
      min: 1
    }
  },
  // Location and remote work policies
  locationPolicy: {
    requireLocation: {
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
      },
      type: {
        type: String,
        enum: ['office', 'client-site', 'remote', 'other'],
        default: 'office'
      }
    }],
    allowRemoteWork: {
      type: Boolean,
      default: false
    },
    remoteWorkDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  // Biometric and security requirements
  security: {
    requirePhoto: {
      type: Boolean,
      default: true
    },
    requireBiometric: {
      type: Boolean,
      default: false
    },
    allowProxyCheckIn: {
      type: Boolean,
      default: false
    },
    requireManagerApproval: {
      type: Boolean,
      default: false
    }
  },
  // Attendance tracking features
  tracking: {
    enableBreakTracking: {
      type: Boolean,
      default: true
    },
    enableIdleTimeTracking: {
      type: Boolean,
      default: false
    },
    enableActivityLogging: {
      type: Boolean,
      default: false
    },
    autoCheckoutAfterHours: {
      type: Number,
      default: 12, // hours
      min: 1
    }
  },
  // Penalties and rewards
  penalties: {
    lateArrivalPenalty: {
      type: Number,
      default: 0, // minutes deducted from pay
      min: 0
    },
    earlyDeparturePenalty: {
      type: Number,
      default: 0,
      min: 0
    },
    absentPenalty: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Notification settings
  notifications: {
    lateArrivalAlert: {
      type: Boolean,
      default: true
    },
    earlyDepartureAlert: {
      type: Boolean,
      default: true
    },
    absentAlert: {
      type: Boolean,
      default: true
    },
    overtimeAlert: {
      type: Boolean,
      default: true
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
attendancePolicySchema.index({ organizationId: 1, isActive: 1 });
attendancePolicySchema.index({ 'applicableTo.roles': 1 });
attendancePolicySchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Virtual for checking if policy is currently effective
attendancePolicySchema.virtual('isCurrentlyEffective').get(function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveFrom <= now && 
         (!this.effectiveTo || this.effectiveTo >= now);
});

module.exports = mongoose.model('AttendancePolicy', attendancePolicySchema);
