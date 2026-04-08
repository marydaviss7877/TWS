const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Approval Model - Sequential State Machine for Deliverable Approvals
 * Implements Nucleus Project OS approval workflow:
 * Step 1: Dev Lead → Step 2: QA Lead → Step 3: Security → Step 4: Client
 */
const ApprovalSchema = new Schema({
  deliverable_id: {
    type: Schema.Types.ObjectId,
    ref: 'Deliverable',
    required: true,
    index: true
  },
  step_number: {
    type: Number,
    required: true,
    enum: [1, 2, 3, 4],
    index: true
  },
  approver_type: {
    type: String,
    required: true,
    enum: ['dev_lead', 'qa_lead', 'security', 'client']
  },
  approver_id: {
    type: String, // user._id if internal, email if client
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  signature_timestamp: {
    type: Date
  },
  rejection_reason: {
    type: String
  },
  can_proceed: {
    type: Boolean,
    default: false,
    index: true
  },
  // Nucleus: Workspace isolation (through deliverable → project → workspace)
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  
  // Multi-tenancy fields
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  // Notes/comments from approver
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for fast queries
ApprovalSchema.index({ deliverable_id: 1, step_number: 1 }, { unique: true });
ApprovalSchema.index({ workspaceId: 1, status: 1 }); // Nucleus: Workspace isolation
ApprovalSchema.index({ status: 1, approver_type: 1 });
ApprovalSchema.index({ orgId: 1, status: 1 });
ApprovalSchema.index({ tenantId: 1, deliverable_id: 1 });

/**
 * Static method to check if previous step is approved
 */
ApprovalSchema.statics.isPreviousStepApproved = async function(deliverableId, stepNumber) {
  if (stepNumber === 1) {
    return true; // First step has no previous step
  }
  
  const previousApproval = await this.findOne({
    deliverable_id: deliverableId,
    step_number: stepNumber - 1,
    status: 'approved'
  });
  
  return !!previousApproval;
};

/**
 * Static method to get all approvals for a deliverable
 */
ApprovalSchema.statics.getApprovalsForDeliverable = async function(deliverableId) {
  return this.find({ deliverable_id: deliverableId })
    .sort({ step_number: 1 });
};

/**
 * Static method to check if all internal steps are approved
 * Handles optional security step: counts how many internal steps actually exist,
 * then checks all of them are approved (avoids hardcoded === 3 that broke when
 * security step was omitted from createApprovalChain).
 */
ApprovalSchema.statics.areAllInternalStepsApproved = async function(deliverableId) {
  const existingCount = await this.countDocuments({
    deliverable_id: deliverableId,
    step_number: { $in: [1, 2, 3] }
  });

  if (existingCount === 0) return false;

  const approvedCount = await this.countDocuments({
    deliverable_id: deliverableId,
    step_number: { $in: [1, 2, 3] },
    status: 'approved'
  });

  return approvedCount === existingCount;
};

/**
 * Instance method to approve this step
 */
ApprovalSchema.methods.approve = async function(notes = null) {
  // Check if previous step is approved (unless this is step 1)
  if (this.step_number > 1) {
    const previousApproved = await this.constructor.isPreviousStepApproved(
      this.deliverable_id,
      this.step_number
    );
    
    if (!previousApproved) {
      throw new Error('Previous step must be approved first');
    }
  }
  
  this.status = 'approved';
  this.signature_timestamp = new Date();
  this.can_proceed = true;
  if (notes) {
    this.notes = notes;
  }
  
  return this.save();
};

/**
 * Instance method to reject this step
 */
ApprovalSchema.methods.reject = async function(reason) {
  this.status = 'rejected';
  this.rejection_reason = reason;
  this.signature_timestamp = new Date();
  this.can_proceed = false;
  
  // Reset all subsequent approvals
  await this.constructor.updateMany(
    {
      deliverable_id: this.deliverable_id,
      step_number: { $gt: this.step_number }
    },
    {
      status: 'pending',
      can_proceed: false,
      signature_timestamp: null,
      rejection_reason: null,
      notes: null
    }
  );
  
  return this.save();
};

/**
 * Static method to create approval chain for a deliverable
 * Now includes workspaceId for proper isolation
 */
ApprovalSchema.statics.createApprovalChain = async function(deliverableId, orgId, tenantId, workspaceId, config = {}) {
  const {
    devLeadId,
    qaLeadId,
    securityId,
    clientEmail
  } = config;
  
  const approvals = [];
  
  // Step 1: Dev Lead (always required)
  if (devLeadId) {
    approvals.push({
      deliverable_id: deliverableId,
      step_number: 1,
      approver_type: 'dev_lead',
      approver_id: devLeadId,
      workspaceId, // Nucleus: Workspace isolation
      orgId,
      tenantId,
      status: 'pending',
      can_proceed: true // First step can always proceed
    });
  }
  
  // Step 2: QA Lead (always required)
  if (qaLeadId) {
    approvals.push({
      deliverable_id: deliverableId,
      step_number: 2,
      approver_type: 'qa_lead',
      approver_id: qaLeadId,
      workspaceId, // Nucleus: Workspace isolation
      orgId,
      tenantId,
      status: 'pending',
      can_proceed: false // Can only proceed after step 1
    });
  }
  
  // Step 3: Security (optional, if needed)
  if (securityId) {
    approvals.push({
      deliverable_id: deliverableId,
      step_number: 3,
      approver_type: 'security',
      approver_id: securityId,
      workspaceId, // Nucleus: Workspace isolation
      orgId,
      tenantId,
      status: 'pending',
      can_proceed: false
    });
  }
  
  // Step 4: Client (always required)
  if (clientEmail) {
    approvals.push({
      deliverable_id: deliverableId,
      step_number: 4,
      approver_type: 'client',
      approver_id: clientEmail,
      workspaceId, // Nucleus: Workspace isolation
      orgId,
      tenantId,
      status: 'pending',
      can_proceed: false // Can only proceed after all internal steps
    });
  }
  
  return this.insertMany(approvals);
};

/**
 * Pre-save hook: Automatically set workspaceId from deliverable
 */
ApprovalSchema.pre('save', async function(next) {
  // If workspaceId is not set, get it from deliverable
  if (!this.workspaceId && this.deliverable_id) {
    const Deliverable = mongoose.model('Deliverable');
    const deliverable = await Deliverable.findById(this.deliverable_id).select('workspaceId');
    if (deliverable && deliverable.workspaceId) {
      this.workspaceId = deliverable.workspaceId;
    }
  }
  next();
});

module.exports = mongoose.model('Approval', ApprovalSchema);
