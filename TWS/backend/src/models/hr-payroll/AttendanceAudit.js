const mongoose = require('mongoose');

const attendanceAuditSchema = new mongoose.Schema({
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: [
      'checkin', 'checkout', 'break_start', 'break_end', 
      'correction_request', 'correction_approve', 'correction_reject',
      'manual_edit', 'system_auto_checkout', 'location_update',
      'photo_update', 'status_change', 'overtime_approval'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Previous values (for tracking changes)
  previousValues: {
    checkIn: {
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      device: {
        type: String,
        userAgent: String,
        ipAddress: String
      },
      photoUrl: String,
      notes: String
    },
    checkOut: {
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      device: {
        type: String,
        userAgent: String,
        ipAddress: String
      },
      photoUrl: String,
      notes: String
    },
    status: String,
    durationMinutes: Number,
    overtimeMinutes: Number
  },
  // New values (for tracking changes)
  newValues: {
    checkIn: {
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      device: {
        type: String,
        userAgent: String,
        ipAddress: String
      },
      photoUrl: String,
      notes: String
    },
    checkOut: {
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      device: {
        type: String,
        userAgent: String,
        ipAddress: String
      },
      photoUrl: String,
      notes: String
    },
    status: String,
    durationMinutes: Number,
    overtimeMinutes: Number
  },
  // Audit metadata
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByRole: {
    type: String,
    enum: ['employee', 'manager', 'hr', 'admin', 'owner', 'system'],
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  comments: {
    type: String,
    trim: true
  },
  // Security and device information
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browser: String,
    os: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  },
  // Risk assessment
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  riskFactors: [{
    type: String,
    enum: [
      'unusual_location', 'unusual_time', 'rapid_checkin_checkout',
      'multiple_devices', 'suspicious_ip', 'missing_photo',
      'manual_override', 'after_hours_access', 'weekend_access',
      'holiday_access', 'proxy_detection', 'biometric_mismatch'
    ]
  }],
  // Approval workflow
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalComments: String,
  // Compliance tracking
  complianceFlags: [{
    type: String,
    enum: [
      'policy_violation', 'overtime_limit_exceeded', 'break_violation',
      'location_policy_violation', 'time_fraud_suspected', 'proxy_usage',
      'unauthorized_access', 'data_integrity_issue'
    ]
  }],
  // Integration with external systems
  externalSystemSync: {
    synced: {
      type: Boolean,
      default: false
    },
    syncedAt: Date,
    syncStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'retry']
    },
    syncError: String
  }
}, {
  timestamps: true
});

// Indexes for performance and querying
attendanceAuditSchema.index({ attendanceId: 1, timestamp: -1 });
attendanceAuditSchema.index({ userId: 1, timestamp: -1 });
attendanceAuditSchema.index({ employeeId: 1, timestamp: -1 });
attendanceAuditSchema.index({ action: 1, timestamp: -1 });
attendanceAuditSchema.index({ performedBy: 1, timestamp: -1 });
attendanceAuditSchema.index({ riskLevel: 1, timestamp: -1 });
attendanceAuditSchema.index({ 'deviceInfo.ipAddress': 1 });
attendanceAuditSchema.index({ timestamp: -1 });

// Compound indexes for complex queries
attendanceAuditSchema.index({ userId: 1, action: 1, timestamp: -1 });
attendanceAuditSchema.index({ riskLevel: 1, timestamp: -1 });
attendanceAuditSchema.index({ 'complianceFlags': 1, timestamp: -1 });

// Virtual for formatted timestamp
attendanceAuditSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Virtual for risk score calculation
attendanceAuditSchema.virtual('riskScore').get(function() {
  let score = 0;
  
  // Base score by risk level
  const riskScores = { low: 1, medium: 3, high: 5, critical: 10 };
  score += riskScores[this.riskLevel] || 0;
  
  // Additional score for risk factors
  score += this.riskFactors.length * 2;
  
  // Additional score for compliance flags
  score += this.complianceFlags.length * 3;
  
  return Math.min(score, 20); // Cap at 20
});

// Static method to get audit trail for an attendance record
attendanceAuditSchema.statics.getAuditTrail = function(attendanceId) {
  return this.find({ attendanceId })
    .populate('performedBy', 'fullName email')
    .populate('approvedBy', 'fullName email')
    .sort({ timestamp: -1 });
};

// Static method to get risk reports
attendanceAuditSchema.statics.getRiskReport = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$riskLevel',
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' }
      }
    },
    { $sort: { count: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('AttendanceAudit', attendanceAuditSchema);
