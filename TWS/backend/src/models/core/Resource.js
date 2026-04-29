const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    category: {
      type: String,
      enum: ['technical', 'soft', 'language', 'certification', 'other'],
      default: 'technical'
    }
  }],
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'unavailable', 'on_leave'],
      default: 'available'
    },
    weeklyHours: {
      type: Number,
      default: 40,
      min: 0,
      max: 80
    },
    currentAllocation: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    maxAllocation: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  workload: {
    currentProjects: [{
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
      },
      role: {
        type: String,
        required: true,
        trim: true
      },
      allocation: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date,
      hourlyRate: Number,
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    totalAllocatedHours: {
      type: Number,
      default: 0
    },
    availableHours: {
      type: Number,
      default: 40
    }
  },
  timeTracking: {
    hoursThisWeek: {
      type: Number,
      default: 0
    },
    hoursThisMonth: {
      type: Number,
      default: 0
    },
    hoursThisYear: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    goals: [{
      title: String,
      description: String,
      targetDate: Date,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
        default: 'not_started'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    achievements: [{
      title: String,
      description: String,
      date: {
        type: Date,
        default: Date.now
      },
      category: {
        type: String,
        enum: ['project', 'skill', 'certification', 'other']
      }
    }]
  },
  preferences: {
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    communication: {
      preferredMethod: {
        type: String,
        enum: ['email', 'teams', 'phone', 'in_person'],
        default: 'email'
      },
      notificationSettings: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        }
      }
    },
    projectTypes: [{
      type: String,
      enum: ['web_development', 'mobile_development', 'data_analysis', 'design', 'marketing', 'other']
    }],
    maxConcurrentProjects: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },
  cost: {
    hourlyRate: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    costCenter: String,
    budgetAllocation: {
      type: Number,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active'
  },
  metadata: {
    hireDate: Date,
    lastLogin: Date,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes for performance
resourceSchema.index({ orgId: 1, userId: 1 }, { unique: true });
resourceSchema.index({ orgId: 1, department: 1 });
resourceSchema.index({ orgId: 1, 'availability.status': 1 });
resourceSchema.index({ orgId: 1, 'workload.currentProjects.projectId': 1 });
resourceSchema.index({ orgId: 1, status: 1 });

// Virtual for utilization percentage
resourceSchema.virtual('utilizationPercentage').get(function() {
  return Math.round((this.availability.currentAllocation / this.availability.maxAllocation) * 100);
});

// Virtual for availability status
resourceSchema.virtual('isAvailable').get(function() {
  return this.availability.status === 'available' && 
         this.availability.currentAllocation < this.availability.maxAllocation;
});

// Method to update workload allocation
resourceSchema.methods.updateAllocation = function() {
  const totalAllocation = this.workload.currentProjects
    .filter(project => project.isActive)
    .reduce((total, project) => total + project.allocation, 0);
  
  this.availability.currentAllocation = Math.min(totalAllocation, 100);
  this.workload.availableHours = Math.max(0, 
    (this.availability.weeklyHours * (100 - this.availability.currentAllocation)) / 100
  );
  
  return this.save();
};

// Method to add project allocation
resourceSchema.methods.addProject = function(projectId, role, allocation, startDate, endDate, hourlyRate) {
  // Check if already allocated to this project
  const existingProject = this.workload.currentProjects.find(
    project => project.projectId.toString() === projectId.toString()
  );
  
  if (existingProject) {
    throw new Error('Resource is already allocated to this project');
  }
  
  // Check if adding this allocation would exceed max allocation
  const newTotalAllocation = this.availability.currentAllocation + allocation;
  if (newTotalAllocation > this.availability.maxAllocation) {
    throw new Error('Adding this project would exceed maximum allocation');
  }
  
  this.workload.currentProjects.push({
    projectId,
    role,
    allocation,
    startDate,
    endDate,
    hourlyRate,
    isActive: true
  });
  
  return this.updateAllocation();
};

// Method to remove project allocation
resourceSchema.methods.removeProject = function(projectId) {
  this.workload.currentProjects = this.workload.currentProjects.filter(
    project => project.projectId.toString() !== projectId.toString()
  );
  
  return this.updateAllocation();
};

// Method to update project allocation
resourceSchema.methods.updateProjectAllocation = function(projectId, newAllocation) {
  const project = this.workload.currentProjects.find(
    project => project.projectId.toString() === projectId.toString()
  );
  
  if (!project) {
    throw new Error('Project not found in resource allocation');
  }
  
  // Check if new allocation would exceed max allocation
  const otherProjectsAllocation = this.availability.currentAllocation - project.allocation;
  const newTotalAllocation = otherProjectsAllocation + newAllocation;
  
  if (newTotalAllocation > this.availability.maxAllocation) {
    throw new Error('New allocation would exceed maximum allocation');
  }
  
  project.allocation = newAllocation;
  return this.updateAllocation();
};

// Method to update time tracking
resourceSchema.methods.updateTimeTracking = function(hours, period = 'week') {
  const now = new Date();
  
  switch (period) {
    case 'week':
      this.timeTracking.hoursThisWeek += hours;
      break;
    case 'month':
      this.timeTracking.hoursThisMonth += hours;
      break;
    case 'year':
      this.timeTracking.hoursThisYear += hours;
      break;
  }
  
  this.timeTracking.lastUpdated = now;
  return this.save();
};

// Pre-save middleware to update allocation
resourceSchema.pre('save', function(next) {
  if (this.isModified('workload.currentProjects')) {
    this.updateAllocation();
  }
  next();
});

module.exports = mongoose.model('Resource', resourceSchema);
