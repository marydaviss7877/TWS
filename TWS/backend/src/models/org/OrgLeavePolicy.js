const mongoose = require('mongoose');

const leaveTypePolicySchema = new mongoose.Schema({
  daysPerYear: { type: Number, required: true, min: 0, default: 0 },
  carryForwardAllowed: { type: Boolean, default: false },
  maxCarryForward: { type: Number, min: 0, default: 0 }
}, { _id: false });

const orgLeavePolicySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  name: {
    type: String,
    trim: true,
    default: 'Default Leave Policy'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  annual: { type: leaveTypePolicySchema, default: () => ({ daysPerYear: 20, carryForwardAllowed: false, maxCarryForward: 0 }) },
  sick: { type: leaveTypePolicySchema, default: () => ({ daysPerYear: 10, carryForwardAllowed: false, maxCarryForward: 0 }) },
  personal: { type: leaveTypePolicySchema, default: () => ({ daysPerYear: 5, carryForwardAllowed: false, maxCarryForward: 0 }) },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('OrgLeavePolicy', orgLeavePolicySchema);
