const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ChangeRequest Model - Nucleus Project OS Specification
 * Tracks scope changes with PM evaluation and client decision workflow
 */
const ChangeRequestSchema = new Schema({
  deliverable_id: {
    type: Schema.Types.ObjectId,
    ref: 'Deliverable',
    required: true,
    index: true
  },
  submitted_by: {
    type: String, // client email
    required: true,
    index: true
  },
  submitted_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['submitted', 'acknowledged', 'evaluated', 'accepted', 'rejected', 'negotiating'],
    default: 'submitted',
    index: true
  },
  // PM evaluation fields
  pm_notes: {
    type: String
  },
  effort_days: {
    type: Number,
    min: 0
  },
  cost_impact: {
    type: Number,
    min: 0
  },
  date_impact_days: {
    type: Number,
    min: 0
  },
  pm_recommendation: {
    type: String,
    enum: ['accept', 'reject', 'negotiate']
  },
  evaluated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluated_at: {
    type: Date
  },
  // Client decision
  client_decision: {
    type: String,
    enum: ['accept', 'reject']
  },
  decided_at: {
    type: Date
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
  }
}, {
  timestamps: true
});

// Indexes
ChangeRequestSchema.index({ deliverable_id: 1, status: 1 });
ChangeRequestSchema.index({ workspaceId: 1, status: 1 }); // Nucleus: Workspace isolation
ChangeRequestSchema.index({ submitted_by: 1 });
ChangeRequestSchema.index({ orgId: 1, status: 1 });
ChangeRequestSchema.index({ tenantId: 1, status: 1 });

/**
 * Method to acknowledge change request (PM action)
 * Note: evaluated_by / evaluated_at are intentionally left for the evaluate() step.
 * The audit trail (ChangeRequestAudit) records who acknowledged and when.
 */
ChangeRequestSchema.methods.acknowledge = async function(acknowledgedBy) {
  this.status = 'acknowledged';
  return this.save();
};

/**
 * Method to evaluate change request (PM action)
 */
ChangeRequestSchema.methods.evaluate = async function(evaluatedBy, evaluation) {
  this.status = 'evaluated';
  this.evaluated_by = evaluatedBy;
  this.evaluated_at = new Date();
  this.pm_notes = evaluation.pm_notes;
  this.effort_days = evaluation.effort_days;
  this.cost_impact = evaluation.cost_impact;
  this.date_impact_days = evaluation.date_impact_days;
  this.pm_recommendation = evaluation.pm_recommendation;
  return this.save();
};

/**
 * Method to decide on change request (Client action)
 */
ChangeRequestSchema.methods.decide = async function(decision) {
  this.status = decision === 'accept' ? 'accepted' : 'rejected';
  this.client_decision = decision;
  this.decided_at = new Date();
  
  // If accepted, update deliverable target date
  if (decision === 'accept' && this.date_impact_days) {
    const Deliverable = mongoose.model('Deliverable');
    const Milestone = mongoose.model('Milestone');
    
    // Try Deliverable first, fallback to Milestone
    let deliverable = await Deliverable.findById(this.deliverable_id);
    if (!deliverable) {
      deliverable = await Milestone.findById(this.deliverable_id);
    }
    
    if (deliverable && deliverable.target_date) {
      const newDate = new Date(deliverable.target_date);
      newDate.setDate(newDate.getDate() + this.date_impact_days);
      deliverable.target_date = newDate;
      if (deliverable.dueDate) {
        deliverable.dueDate = newDate;
      }
      await deliverable.save();
    }
  }
  
  return this.save();
};

/**
 * Pre-save hook: Automatically set workspaceId from deliverable
 */
ChangeRequestSchema.pre('save', async function(next) {
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

module.exports = mongoose.model('ChangeRequest', ChangeRequestSchema);
