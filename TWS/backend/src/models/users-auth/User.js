const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: [
      // Platform & Business Roles
      'super_admin', 'org_manager', 'owner', 'admin', 'ceo', 'cfo', 'pmo', 'project_manager',
      'department_lead', 'hr', 'finance', 'manager', 'employee', 'contributor',
      'developer', 'engineer', 'programmer', 'contractor', 'auditor', 'client', 'reseller',
      // Education Roles (Extended)
      'principal', 'head_teacher', 'teacher', 'student',
      // New Faculty Roles
      'lab_instructor',      // Lab/workshop instructors
      'counselor',           // Student counselors (privacy-sensitive)
      'academic_coordinator', // Academic program coordinators
      'assistant_teacher',   // Teaching assistants
      'librarian',           // Library staff
      'sports_coach',        // Sports coaching
      'admin_staff'          // Administrative staff (non-teaching)
    ],
    default: 'employee'
  },
  // Multi-role support: Users can have multiple roles (e.g., teacher + sports_coach)
  roles: [{
    role: {
      type: String,
      enum: [
        // Education Roles
        'principal', 'head_teacher', 'teacher', 'student',
        'lab_instructor', 'counselor', 'academic_coordinator',
        'assistant_teacher', 'librarian', 'sports_coach', 'admin_staff'
      ]
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'pending_approval', 'inactive'],
      default: 'pending_approval' // Manual approval required
    }
  }],
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  teamIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'inactive'],
    default: 'active'
  },
  twoFAEnabled: {
    type: Boolean,
    default: false
  },
  twoFASecret: {
    type: String,
    select: false
  },
  lastLogin: {
    type: Date
  },
  profilePicUrl: {
    type: String
  },
  phone: {
    type: String
  },
  department: {
    type: String
  },
  jobTitle: {
    type: String
  },
  hireDate: {
    type: Date
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d'
    }
  }],
  // Software House Role Reference
  softwareHouseRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SoftwareHouseRole'
  },
  // Supra Admin Portal Responsibility (for assigning users to handle Supra Admin portal areas)
  // Note: Users are created through Software House portal. Supra Admin can only assign existing users.
  supraAdminPortalResponsibility: {
    type: String,
    enum: ['finance', 'hr', 'admin', 'support', null],
    default: null
  },
  supraAdminPortalAssignedAt: {
    type: Date
  },
  supraAdminPortalAssignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin'
  },
  supraAdminPortalRemovedAt: {
    type: Date
  },
  supraAdminPortalRemovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TWSAdmin'
  },
  // Push notification settings
  expoPushToken: {
    type: String
  },
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date
  },
  // Signup metadata
  signupMetadata: {
    source: String, // Landing page identifier
    landingPage: String,
    industry: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ orgId: 1 }); // Index for tenant-level data isolation
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ orgId: 1, status: 1 }); // Compound index for common queries

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  delete user.twoFASecret;
  return user;
};

module.exports = mongoose.model('User', userSchema);
