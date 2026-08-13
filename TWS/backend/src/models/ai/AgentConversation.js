const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'tool'], required: true },
  content: { type: String, required: true, maxlength: 12000 },
  toolName: { type: String, maxlength: 128 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const pendingActionSchema = new mongoose.Schema({
  toolName: { type: String, required: true, maxlength: 128 },
  arguments: { type: mongoose.Schema.Types.Mixed, required: true },
  summary: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  result: mongoose.Schema.Types.Mixed
});

const agentConversationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, default: 'New conversation' },
  messages: { type: [messageSchema], default: [] },
  pendingActions: { type: [pendingActionSchema], default: [] },
  lastModel: { type: String, maxlength: 80 },
  totalTokens: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

agentConversationSchema.index({ orgId: 1, userId: 1, updatedAt: -1 });
agentConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('AgentConversation', agentConversationSchema);
