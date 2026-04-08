const mongoose = require('mongoose');

// Master ERP Template Schema for different industries
const masterERPSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  industry: {
    type: String,
    enum: ['software_house', 'education', 'healthcare', 'finance'],
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Master ERP Configuration
  configuration: {
    // Core modules that all industries get
    coreModules: [{
      type: String,
      enum: ['hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles']
    }],
    
    // Industry-specific modules
    industryModules: [{
      type: String,
      enum: [
        // Education specific
        'students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions',
        // Healthcare specific
        'patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing',
        // Software house specific
        'development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'
      ]
    }],
    
    // Default roles for this industry
    defaultRoles: [{
      name: String,
      description: String,
      permissions: mongoose.Schema.Types.Mixed,
      isDefault: { type: Boolean, default: true }
    }],
    
    // Default departments for this industry
    defaultDepartments: [{
      name: String,
      description: String,
      budget: Number,
      isDefault: { type: Boolean, default: true }
    }],
    
    // Default settings
    defaultSettings: {
      timezone: { type: String, default: 'UTC' },
      currency: { type: String, default: 'USD' },
      language: { type: String, default: 'en' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }]
      }
    },
    
    // Industry-specific configurations
    industryConfig: {
      // Education specific
      education: {
        academicYear: {
          startMonth: { type: String, default: 'September' },
          endMonth: { type: String, default: 'June' },
          semesters: { type: Number, default: 2 }
        },
        gradingSystem: {
          type: { type: String, enum: ['percentage', 'letter', 'gpa'], default: 'percentage' },
          scale: { type: Number, default: 100 }
        },
        classManagement: {
          maxStudentsPerClass: { type: Number, default: 30 },
          allowMultipleSections: { type: Boolean, default: true }
        }
      },
      
      // Healthcare specific
      healthcare: {
        appointmentSystem: {
          slotDuration: { type: Number, default: 30 }, // minutes
          advanceBookingDays: { type: Number, default: 30 },
          allowOnlineBooking: { type: Boolean, default: true }
        },
        patientManagement: {
          requireInsurance: { type: Boolean, default: true },
          allowWalkIns: { type: Boolean, default: true },
          maxPatientsPerDay: { type: Number, default: 50 }
        },
        medicalRecords: {
          encryptionRequired: { type: Boolean, default: true },
          retentionYears: { type: Number, default: 7 },
          allowPatientAccess: { type: Boolean, default: true }
        }
      },
      
      // Software house specific (current TWS)
      softwareHouse: {
        developmentMethodology: {
          defaultMethodology: { type: String, enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'], default: 'agile' },
          supportedMethodologies: [{ type: String, enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid'] }],
          sprintDuration: { type: Number, default: 14 } // days
        },
        techStack: {
          frontend: [String],
          backend: [String],
          database: [String],
          cloud: [String],
          tools: [String]
        },
        projectTypes: [{
          type: String,
          enum: ['web_application', 'mobile_app', 'api_development', 'system_integration', 'maintenance_support', 'consulting']
        }],
        billingConfig: {
          defaultHourlyRate: { type: Number, default: 0 },
          currency: { type: String, default: 'USD' },
          billingCycle: { type: String, enum: ['weekly', 'monthly', 'quarterly'], default: 'monthly' },
          autoInvoiceGeneration: { type: Boolean, default: false }
        }
      }
    }
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
masterERPSchema.index({ industry: 1, isActive: 1 });
masterERPSchema.index({ name: 1 });
masterERPSchema.index({ usageCount: -1 });

// Instance methods
masterERPSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

masterERPSchema.methods.getIndustryConfig = function() {
  return this.configuration.industryConfig[this.industry] || {};
};

masterERPSchema.methods.getDefaultModules = function() {
  return [...this.configuration.coreModules, ...this.configuration.industryModules];
};

// Static methods
masterERPSchema.statics.findByIndustry = function(industry) {
  return this.findOne({ industry, isActive: true });
};

masterERPSchema.statics.getActiveTemplates = function() {
  return this.find({ isActive: true }).sort({ usageCount: -1 });
};

module.exports = mongoose.model('MasterERP', masterERPSchema);
