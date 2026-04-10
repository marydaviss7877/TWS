const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: String,
  
  // Contact Information
  contactInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      }
    }
  },
  
  // Business Information
  businessInfo: {
    industry: String,
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '1-10'
    },
    taxId: String,
    registrationNumber: String,
  },
  
  // ERP Configuration (Software House only)
  erpCategory: {
    type: String,
    enum: ['software_house', 'business', 'warehouse'],
    default: 'software_house'
  },
  // Legacy: kept for existing DB documents; not used for new tenants
  educationConfig: {
    _id: false, // Prevent Mongoose from creating _id for subdocuments
    institutionType: {
      type: String,
      enum: ['school', 'college', 'university']
      // Not required - validation handled in pre-save hook
    },
    // School-specific settings (Nursery to 8th Grade)
    schoolSettings: {
      gradeLevels: [String], // e.g., ['Nursery', 'KG', 'Grade 1', 'Grade 2', ..., 'Grade 8']
      sections: [String], // e.g., ['A', 'B', 'C']
      parentPortalEnabled: { type: Boolean, default: true },
      transportationEnabled: { type: Boolean, default: true },
      hostelEnabled: { type: Boolean, default: false }, // Usually not for younger kids
      playgroundEnabled: { type: Boolean, default: true },
      mealManagementEnabled: { type: Boolean, default: true },
      activityClubsEnabled: { type: Boolean, default: true }
    },
    // College-specific settings (9th to 12th Grade)
    collegeSettings: {
      gradeLevels: [String], // e.g., ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
      sections: [String], // e.g., ['A', 'B', 'C']
      streams: [String], // e.g., ['Science', 'Commerce', 'Arts', 'Vocational']
      boardExams: { type: Boolean, default: true }, // Board exam management
      parentPortalEnabled: { type: Boolean, default: true },
      transportationEnabled: { type: Boolean, default: true },
      hostelEnabled: { type: Boolean, default: true },
      careerGuidanceEnabled: { type: Boolean, default: true },
      collegeEntrancePrepEnabled: { type: Boolean, default: true },
      scholarshipManagementEnabled: { type: Boolean, default: true }
    },
    // University-specific settings (Higher Education)
    universitySettings: {
      degreePrograms: [String], // e.g., ['Bachelor of Science', 'Master of Arts', 'Ph.D.']
      academicLevels: [String], // e.g., ['Undergraduate', 'Graduate', 'Doctorate']
      departments: [String], // e.g., ['Computer Science', 'Mathematics', 'Physics']
      semesterSystem: { type: Boolean, default: true }, // true for semesters, false for quarters/trimesters
      gpaSystem: { type: String, enum: ['4.0', '5.0', '10.0', 'percentage'], default: '4.0' },
      creditSystem: { type: Boolean, default: true },
      researchEnabled: { type: Boolean, default: true },
      internshipEnabled: { type: Boolean, default: true },
      alumniPortalEnabled: { type: Boolean, default: true },
      financialAidEnabled: { type: Boolean, default: true },
      dormitoryEnabled: { type: Boolean, default: true },
      thesisManagementEnabled: { type: Boolean, default: true },
      academicAdvisingEnabled: { type: Boolean, default: true }
    }
  },
  // Healthcare-specific configuration (for healthcare ERP category)
  healthcareConfig: {
    facilityType: {
      type: String,
      enum: ['hospital', 'clinic', 'medical_center', 'pharmacy'],
      default: 'hospital'
    },
    licenseNumber: String,
    hipaaCompliant: {
      type: Boolean,
      default: true
    },
    ehrEnabled: {
      type: Boolean,
      default: true
    },
    // Hospital-specific settings
    hospitalSettings: {
      bedManagementEnabled: { type: Boolean, default: true },
      icuManagementEnabled: { type: Boolean, default: true },
      erManagementEnabled: { type: Boolean, default: true },
      surgeryManagementEnabled: { type: Boolean, default: true },
      wardManagementEnabled: { type: Boolean, default: true },
      dischargeManagementEnabled: { type: Boolean, default: true }
    },
    // Clinic-specific settings
    clinicSettings: {
      appointmentSchedulingEnabled: { type: Boolean, default: true },
      walkInEnabled: { type: Boolean, default: true },
      prescriptionManagementEnabled: { type: Boolean, default: true },
      basicLabEnabled: { type: Boolean, default: true }
    },
    // Pharmacy-specific settings
    pharmacySettings: {
      prescriptionFulfillmentEnabled: { type: Boolean, default: true },
      medicationTrackingEnabled: { type: Boolean, default: true }
    }
  },
  erpModules: [{
    type: String,
    enum: [
      // Common modules
      'hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles',
      // Healthcare modules
      'patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing',
      // Education modules (for schools)
      'students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions',
      // Education modules (for universities)
      'programs', 'departments', 'faculty', 'semesters', 'course_registration', 'gpa_tracking', 'research', 'alumni', 'financial_aid', 'dormitories',
      // Software house modules
      'development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'
    ]
  }],
  
  // Software House Specific Configuration (only for software_house industry)
  softwareHouseConfig: {
    // Development Methodologies
    defaultMethodology: {
      type: String,
      enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'],
      default: 'agile',
      required: false // Make optional
    },
    supportedMethodologies: [{
      type: String,
      enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid']
    }],
    
    // Technology Stack
    techStack: {
      frontend: [String],
      backend: [String],
      database: [String],
      cloud: [String],
      tools: [String]
    },
    
    // Project Types
    supportedProjectTypes: [{
      type: String,
      enum: ['web_application', 'mobile_app', 'api_development', 'system_integration', 'maintenance_support', 'consulting']
    }],
    
    // Development Settings
    developmentSettings: {
      defaultSprintDuration: { type: Number, default: 14 }, // days
      storyPointScale: {
        type: String,
        enum: ['fibonacci', 'linear', 'powers_of_2', 'shirt_sizes', 'custom'],
        default: 'fibonacci',
        required: false // Make optional
      },
      codeQualityTracking: { type: Boolean, default: true }
    },
    
    // Billing Configuration
    billingConfig: {
      defaultHourlyRate: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      billingCycle: { 
        type: String, 
        enum: ['weekly', 'monthly', 'quarterly'], 
        default: 'monthly',
        required: false // Make optional
      },
      invoiceTemplate: { type: String, default: 'standard' },
      autoInvoiceGeneration: { type: Boolean, default: false }
    },
    
    // Team Configuration
    teamConfig: {
      maxTeamSize: { type: Number, default: 50 },
      allowRemoteWork: { type: Boolean, default: true },
      requireTimeTracking: { type: Boolean, default: true },
      allowOvertime: { type: Boolean, default: true },
      maxOvertimeHours: { type: Number, default: 20 }
    },
    
    // Quality Assurance
    qualityConfig: {
      codeReviewRequired: { type: Boolean, default: true },
      testingRequired: { type: Boolean, default: true },
      documentationRequired: { type: Boolean, default: true },
      minCodeCoverage: { type: Number, default: 80 },
      maxTechnicalDebt: { type: Number, default: 20 } // hours
    }
  },
  
  // Additional Business Info
  foundedYear: Number,
  
  // Subscription & Billing
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'starter', 'growth', 'basic', 'professional', 'enterprise', 'custom'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled', 'past_due', 'trialing'],
      default: 'trialing'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    trialStartDate: Date,
    trialEndDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextBillingDate: Date,
    autoRenew: {
      type: Boolean,
      default: true
    },
    // Billing failure: set when payment fails; after 7-day grace, set readOnlyMode
    paymentFailedAt: Date,
    readOnlyMode: {
      type: Boolean,
      default: false
    },
    // Add-ons: effective limit = plan limit + addOn (only for Software House)
    addOns: {
      extraUsers: { type: Number, default: 0 },
      extraStorageGB: { type: Number, default: 0 },
      extraWorkspaces: { type: Number, default: 0 }
    }
  },
  
  // Features & Limits
  features: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxProjects: {
      type: Number,
      default: 5
    },
    maxStorage: {
      type: Number, // in GB
      default: 1
    },
    maxWorkspaces: {
      type: Number,
      default: 3
    },
    maxClientAccounts: {
      type: Number,
      default: 10
    },
    integrations: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    }
  },
  
  // Customization
  branding: {
    logo: String,
    primaryColor: {
      type: String,
      default: '#3B82F6'
    },
    secondaryColor: {
      type: String,
      default: '#1E40AF'
    },
    customDomain: String,
    favicon: String
  },
  
  // Settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    language: {
      type: String,
      default: 'en'
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      },
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }]
    }
  },
  
  // Status & Metadata
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'pending_setup'],
    default: 'pending_setup'
  },
  
  // Database & Infrastructure
  database: {
    name: String, // Separate database name for this tenant
    connectionString: String,
    lastBackup: Date,
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  
  // Analytics & Usage
  usage: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalProjects: {
      type: Number,
      default: 0
    },
    totalStorage: {
      type: Number, // in MB
      default: 0
    },
    lastActivity: Date,
    monthlyActiveUsers: {
      type: Number,
      default: 0
    }
  },
  
  // Onboarding
  onboarding: {
    completed: {
      type: Boolean,
      default: false
    },
    steps: [{
      step: String,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    welcomeEmailSent: {
      type: Boolean,
      default: false
    }
  },
  
  // Support & Notes
  supportNotes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupraAdmin'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tenant Owner Login Credentials (set by SupraAdmin)
  ownerCredentials: {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },

  // Created by SupraAdmin (or User for self-serve signups)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true
  },
  createdByModel: {
    type: String,
    enum: ['SupraAdmin', 'User', 'Organization'],
    default: 'User'
  },
  
  // Tenant ID (unique identifier for tenant)
  tenantId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // Organization reference (for multi-tenant setups)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false // Optional - some tenants may not have an organization
  }
}, {
  timestamps: true
});

// Index for performance
tenantSchema.index({ slug: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ 'subscription.plan': 1 });
tenantSchema.index({ createdBy: 1 });

// Pre-save middleware to hash owner password
tenantSchema.pre('save', async function(next) {
  if (this.ownerCredentials && this.isModified('ownerCredentials.password')) {
    const bcrypt = require('bcryptjs');
    this.ownerCredentials.password = await bcrypt.hash(this.ownerCredentials.password, 12);
  }
  
  // Remove softwareHouseConfig if erpCategory is not 'software_house'
  if (this.erpCategory !== 'software_house') {
    if (this.softwareHouseConfig !== undefined && this.softwareHouseConfig !== null) {
      this.set('softwareHouseConfig', undefined);
    }
  }
  
  // Remove educationConfig if erpCategory is not 'education'
  if (this.erpCategory !== 'education') {
    if (this.educationConfig !== undefined && this.educationConfig !== null) {
      this.set('educationConfig', undefined);
    }
  }
  
  // Remove healthcareConfig if erpCategory is not 'healthcare'
  if (this.erpCategory !== 'healthcare') {
    if (this.healthcareConfig !== undefined && this.healthcareConfig !== null) {
      this.set('healthcareConfig', undefined);
    }
  }
  
  next();
});

// Pre-validate middleware to handle industry-specific config validation
// This runs BEFORE Mongoose validates required fields
tenantSchema.pre('validate', function(next) {
  console.log('🔍 Pre-validate hook - erpCategory:', this.erpCategory);
  
  // Remove softwareHouseConfig entirely for non-software-house tenants
  if (this.erpCategory !== 'software_house') {
    if (this.softwareHouseConfig !== undefined && this.softwareHouseConfig !== null) {
      this.set('softwareHouseConfig', undefined);
      delete this.softwareHouseConfig;
    }
  }
  
  // Remove educationConfig entirely for non-education tenants
  // CRITICAL: This must happen before Mongoose validates required fields
  if (this.erpCategory !== 'education') {
    console.log('🗑️ Removing educationConfig for non-education tenant');
    // Remove from Mongoose's internal state
    this.set('educationConfig', undefined);
    // Also delete from the document object
    delete this.educationConfig;
  }
  
  // Remove healthcareConfig entirely for non-healthcare tenants
  if (this.erpCategory !== 'healthcare') {
    if (this.healthcareConfig !== undefined && this.healthcareConfig !== null) {
      this.set('healthcareConfig', undefined);
      delete this.healthcareConfig;
    }
  }
  
  next();
});

// Virtual for trial status
tenantSchema.virtual('isTrial').get(function() {
  return this.subscription.status === 'trialing' || this.subscription.plan === 'trial';
});

// Virtual for trial days remaining
tenantSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.isTrial || !this.subscription.trialEndDate) return 0;
  const now = new Date();
  const trialEnd = new Date(this.subscription.trialEndDate);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to check if tenant is active
tenantSchema.methods.isActive = function() {
  return this.status === 'active' && 
         ['active', 'trialing'].includes(this.subscription.status);
};

// Method to get subscription status
tenantSchema.methods.getSubscriptionStatus = function() {
  if (this.subscription.status === 'trialing') {
    return this.trialDaysRemaining > 0 ? 'trial' : 'trial_expired';
  }
  return this.subscription.status;
};

// Method to update usage
tenantSchema.methods.updateUsage = function(usageData) {
  Object.assign(this.usage, usageData);
  this.usage.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Tenant', tenantSchema);

