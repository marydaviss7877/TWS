const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkIn: {
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number, // GPS accuracy in meters
      verified: {
        type: Boolean,
        default: false
      }
    },
    device: {
      type: String,
      userAgent: String,
      ipAddress: String,
      deviceId: String, // Unique device identifier
      browser: String,
      os: String,
      screenResolution: String
    },
    photoUrl: String,
    photoHash: String, // Hash for photo verification
    biometricData: {
      fingerprint: String,
      faceId: String,
      voicePrint: String
    },
    notes: String,
    verified: {
      type: Boolean,
      default: false
    },
    verificationMethod: {
      type: String,
      enum: ['photo', 'biometric', 'location', 'manual', 'system'],
      default: 'photo'
    }
  },
  checkOut: {
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number,
      verified: {
        type: Boolean,
        default: false
      }
    },
    device: {
      type: String,
      userAgent: String,
      ipAddress: String,
      deviceId: String,
      browser: String,
      os: String,
      screenResolution: String
    },
    photoUrl: String,
    photoHash: String,
    biometricData: {
      fingerprint: String,
      faceId: String,
      voicePrint: String
    },
    notes: String,
    verified: {
      type: Boolean,
      default: false
    },
    verificationMethod: {
      type: String,
      enum: ['photo', 'biometric', 'location', 'manual', 'system'],
      default: 'photo'
    }
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  breakTime: [{
    startTime: Date,
    endTime: Date,
    durationMinutes: Number,
    type: {
      type: String,
      enum: ['lunch', 'break', 'meeting', 'training', 'personal', 'other'],
      default: 'break'
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    notes: String,
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  overtimeApproved: {
    type: Boolean,
    default: false
  },
  overtimeApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overtimeApprovedAt: Date,
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'work-from-home', 'sick', 'vacation', 'holiday', 'on-leave'],
    default: 'present'
  },
  correctionRequests: [{
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    changes: {
      checkIn: Object,
      checkOut: Object,
      status: String,
      notes: String
    }
  }],
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceShift'
  },
  policyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendancePolicy'
  },
  workFromHome: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    enum: ['office', 'remote', 'client-site', 'other'],
    default: 'office'
  },
  // Security and compliance
  securityFlags: [{
    type: String,
    enum: [
      'unusual_location', 'unusual_time', 'rapid_checkin_checkout',
      'multiple_devices', 'suspicious_ip', 'missing_photo',
      'manual_override', 'after_hours_access', 'weekend_access',
      'holiday_access', 'proxy_detection', 'biometric_mismatch',
      'location_spoofing', 'time_manipulation'
    ]
  }],
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  // Attendance quality metrics
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  qualityFactors: [{
    factor: String,
    impact: Number, // -10 to +10
    description: String
  }],
  // Integration with payroll
  payrollProcessed: {
    type: Boolean,
    default: false
  },
  payrollProcessedAt: Date,
  payrollHours: Number,
  payrollRate: Number,
  // Cost allocation for profitability tracking
  costAllocation: {
    isBillable: {
      type: Boolean,
      default: true
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    costCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter'
    },
    taskType: {
      type: String,
      enum: ['development', 'design', 'testing', 'meeting', 'admin', 'research', 'other'],
      default: 'development'
    },
    overheadRate: {
      type: Number,
      default: 0.3 // 30% overhead by default
    }
  },
  // Integration with HR systems
  hrApproved: {
    type: Boolean,
    default: false
  },
  hrApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hrApprovedAt: Date,
  // Mobile app specific
  mobileAppVersion: String,
  appSessionId: String,
  // Real-time tracking
  isActive: {
    type: Boolean,
    default: false
  },
  lastActivity: Date,
  activityLog: [{
    timestamp: Date,
    action: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    device: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ organizationId: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ riskLevel: 1 });
attendanceSchema.index({ 'securityFlags': 1 });
attendanceSchema.index({ isActive: 1 });
attendanceSchema.index({ payrollProcessed: 1 });
attendanceSchema.index({ hrApproved: 1 });

// Compound indexes for complex queries
attendanceSchema.index({ userId: 1, date: -1, status: 1 });
attendanceSchema.index({ organizationId: 1, date: -1, riskLevel: 1 });
attendanceSchema.index({ 'checkIn.device.deviceId': 1, date: -1 });

// Pre-save middleware for calculations and security checks
attendanceSchema.pre('save', function(next) {
  // Calculate duration when checkOut is set
  if (this.checkIn.timestamp && this.checkOut.timestamp) {
    const durationMs = this.checkOut.timestamp - this.checkIn.timestamp;
    this.durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    // Calculate overtime (assuming 8 hours = 480 minutes is standard)
    const standardMinutes = 480;
    this.overtimeMinutes = Math.max(0, this.durationMinutes - standardMinutes);
  }

  // Calculate quality score
  this.calculateQualityScore();

  // Perform security checks
  this.performSecurityChecks();

  next();
});

// Method to calculate quality score
attendanceSchema.methods.calculateQualityScore = function() {
  let score = 100;
  const factors = [];

  // Check for photo verification
  if (!this.checkIn.photoUrl || !this.checkOut.photoUrl) {
    score -= 20;
    factors.push({ factor: 'Missing photos', impact: -20, description: 'No verification photos provided' });
  }

  // Check for location verification
  if (!this.checkIn.location.verified || !this.checkOut.location.verified) {
    score -= 15;
    factors.push({ factor: 'Unverified location', impact: -15, description: 'Location not verified' });
  }

  // Check for biometric verification
  if (!this.checkIn.biometricData.fingerprint && !this.checkIn.biometricData.faceId) {
    score -= 10;
    factors.push({ factor: 'No biometric verification', impact: -10, description: 'No biometric data provided' });
  }

  // Check for unusual patterns
  if (this.securityFlags.length > 0) {
    score -= this.securityFlags.length * 5;
    factors.push({ 
      factor: 'Security flags', 
      impact: -this.securityFlags.length * 5, 
      description: `${this.securityFlags.length} security concerns detected` 
    });
  }

  // Check for rapid check-in/check-out
  if (this.durationMinutes < 30) {
    score -= 25;
    factors.push({ factor: 'Short duration', impact: -25, description: 'Work duration less than 30 minutes' });
  }

  // Bonus for good practices
  if (this.checkIn.verified && this.checkOut.verified) {
    score += 10;
    factors.push({ factor: 'Verified attendance', impact: 10, description: 'Both check-in and check-out verified' });
  }

  this.qualityScore = Math.max(0, Math.min(100, score));
  this.qualityFactors = factors;
};

// Method to perform security checks
attendanceSchema.methods.performSecurityChecks = function() {
  const flags = [];
  let riskLevel = 'low';

  // Check for unusual location
  if (this.checkIn.location.latitude && this.checkOut.location.latitude) {
    const distance = this.calculateDistance(
      this.checkIn.location.latitude, this.checkIn.location.longitude,
      this.checkOut.location.latitude, this.checkOut.location.longitude
    );
    if (distance > 1000) { // More than 1km difference
      flags.push('unusual_location');
      riskLevel = 'medium';
    }
  }

  // Check for rapid check-in/check-out
  if (this.durationMinutes < 5) {
    flags.push('rapid_checkin_checkout');
    riskLevel = 'high';
  }

  // Check for after hours access
  const checkInHour = new Date(this.checkIn.timestamp).getHours();
  if (checkInHour < 6 || checkInHour > 22) {
    flags.push('after_hours_access');
    riskLevel = 'medium';
  }

  // Check for weekend access
  const dayOfWeek = new Date(this.date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    flags.push('weekend_access');
    riskLevel = 'medium';
  }

  // Check for missing photos
  if (!this.checkIn.photoUrl || !this.checkOut.photoUrl) {
    flags.push('missing_photo');
    riskLevel = 'medium';
  }

  // Check for multiple devices (guard for legacy/string device values)
  const checkInDeviceId = (this.checkIn && this.checkIn.device && typeof this.checkIn.device === 'object')
    ? this.checkIn.device.deviceId
    : null;
  const checkOutDeviceId = (this.checkOut && this.checkOut.device && typeof this.checkOut.device === 'object')
    ? this.checkOut.device.deviceId
    : null;
  if (checkInDeviceId && checkOutDeviceId && checkInDeviceId !== checkOutDeviceId) {
    flags.push('multiple_devices');
    riskLevel = 'high';
  }

  this.securityFlags = flags;
  this.riskLevel = riskLevel;
};

// Method to calculate distance between two coordinates
attendanceSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Method to log activity
attendanceSchema.methods.logActivity = function(action, location, device) {
  this.activityLog.push({
    timestamp: new Date(),
    action,
    location,
    device
  });
  this.lastActivity = new Date();
};

// Method to start break
attendanceSchema.methods.startBreak = function(type, location, notes) {
  const breakEntry = {
    startTime: new Date(),
    type: type || 'break',
    location,
    notes
  };
  this.breakTime.push(breakEntry);
  return breakEntry;
};

// Method to end break
attendanceSchema.methods.endBreak = function(breakIndex) {
  if (this.breakTime[breakIndex] && !this.breakTime[breakIndex].endTime) {
    this.breakTime[breakIndex].endTime = new Date();
    const durationMs = this.breakTime[breakIndex].endTime - this.breakTime[breakIndex].startTime;
    this.breakTime[breakIndex].durationMinutes = Math.floor(durationMs / (1000 * 60));
  }
};

// Virtual for formatted duration
attendanceSchema.virtual('formattedDuration').get(function() {
  if (!this.durationMinutes) return '0h 0m';
  
  const hours = Math.floor(this.durationMinutes / 60);
  const minutes = this.durationMinutes % 60;
  return `${hours}h ${minutes}m`;
});

// Virtual for total break time
attendanceSchema.virtual('totalBreakTime').get(function() {
  return this.breakTime.reduce((total, breakItem) => {
    return total + (breakItem.durationMinutes || 0);
  }, 0);
});

// Virtual for net working time
attendanceSchema.virtual('netWorkingTime').get(function() {
  return this.durationMinutes - this.totalBreakTime;
});

// Virtual for attendance status summary
attendanceSchema.virtual('statusSummary').get(function() {
  const summary = {
    checkedIn: !!this.checkIn.timestamp,
    checkedOut: !!this.checkOut.timestamp,
    duration: this.formattedDuration,
    breaks: this.breakTime.length,
    totalBreakTime: this.totalBreakTime,
    overtime: this.overtimeMinutes,
    riskLevel: this.riskLevel,
    qualityScore: this.qualityScore
  };
  return summary;
});

// Static method to get attendance statistics
attendanceSchema.statics.getStatistics = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        avgDuration: { $avg: '$durationMinutes' },
        avgOvertime: { $avg: '$overtimeMinutes' },
        avgQualityScore: { $avg: '$qualityScore' },
        riskDistribution: {
          $push: '$riskLevel'
        },
        statusDistribution: {
          $push: '$status'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to find suspicious activities
attendanceSchema.statics.findSuspiciousActivities = function(filters = {}) {
  const suspiciousFilters = {
    ...filters,
    $or: [
      { riskLevel: { $in: ['high', 'critical'] } },
      { 'securityFlags': { $exists: true, $ne: [] } },
      { qualityScore: { $lt: 70 } }
    ]
  };
  
  return this.find(suspiciousFilters)
    .populate('userId', 'fullName email')
    .sort({ date: -1 });
};

module.exports = mongoose.model('Attendance', attendanceSchema);
