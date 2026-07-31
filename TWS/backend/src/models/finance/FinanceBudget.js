const mongoose = require('mongoose');

const financeBudgetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual', 'custom'],
    default: 'annual'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  categories: [{
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
  }],
  description: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true,
  collection: 'finance_budgets'
});

financeBudgetSchema.index({ orgId: 1, startDate: -1 });
financeBudgetSchema.index({ orgId: 1, department: 1, status: 1 });

module.exports = mongoose.model('FinanceBudget', financeBudgetSchema);
