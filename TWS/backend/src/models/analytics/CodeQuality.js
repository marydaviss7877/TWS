const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const codeQualitySchema = new mongoose.Schema({
  orgId: { 
    type: ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  projectId: { 
    type: ObjectId, 
    ref: 'Project', 
    required: true,
    index: true
  },
  repository: String, // Repository name/URL
  branch: { 
    type: String, 
    default: 'main' 
  },
  commitHash: String,
  commitMessage: String,
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  // Test Coverage
  testCoverage: {
    lines: { type: Number, min: 0, max: 100 },
    functions: { type: Number, min: 0, max: 100 },
    branches: { type: Number, min: 0, max: 100 },
    statements: { type: Number, min: 0, max: 100 }
  },
  // Code Quality Metrics
  qualityMetrics: {
    codeSmells: { type: Number, default: 0 },
    bugs: { type: Number, default: 0 },
    vulnerabilities: { type: Number, default: 0 },
    securityHotspots: { type: Number, default: 0 },
    technicalDebt: { type: Number, default: 0 }, // in minutes
    maintainabilityRating: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      default: 'A'
    }
  },
  // Code Review Metrics
  codeReview: {
    pullRequests: { type: Number, default: 0 },
    reviewsCompleted: { type: Number, default: 0 },
    averageReviewTime: { type: Number, default: 0 }, // in hours
    comments: { type: Number, default: 0 },
    approvals: { type: Number, default: 0 }
  },
  // Quality Gates
  qualityGates: {
    passed: { type: Boolean, default: false },
    conditions: [{
      metric: String,
      operator: String,
      threshold: Number,
      status: { 
        type: String, 
        enum: ['passed', 'failed'] 
      }
    }]
  },
  // Integration Info
  integration: {
    source: { 
      type: String, 
      enum: ['sonarqube', 'codeclimate', 'custom'], 
      default: 'custom' 
    },
    sourceId: String,
    importedAt: Date
  }
}, { 
  timestamps: true 
});

// Indexes
codeQualitySchema.index({ orgId: 1, projectId: 1, timestamp: -1 });
codeQualitySchema.index({ orgId: 1, timestamp: -1 });
codeQualitySchema.index({ projectId: 1, timestamp: -1 });

module.exports = mongoose.model('CodeQuality', codeQualitySchema);