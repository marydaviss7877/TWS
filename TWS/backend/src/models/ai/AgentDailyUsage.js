const mongoose = require('mongoose');

const agentDailyUsageSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Date, required: true },
  tokens: { type: Number, default: 0, min: 0 },
  calls: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

agentDailyUsageSchema.index({ orgId: 1, userId: 1, day: 1 }, { unique: true });
agentDailyUsageSchema.index({ day: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 35 });

module.exports = mongoose.model('AgentDailyUsage', agentDailyUsageSchema);
