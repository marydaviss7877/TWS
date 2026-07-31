const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormTemplate',
    required: true,
    index: true
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormResponse',
    required: true,
    index: true
  },
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, required: true, lowercase: true, trim: true },
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, min: 15, max: 480, default: 60 },
  type: {
    type: String,
    enum: ['screening', 'technical', 'behavioral', 'panel', 'final'],
    default: 'technical'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },
  interviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: String,
  meetingUrl: String,
  notes: String,
  feedback: [{
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    recommendation: {
      type: String,
      enum: ['strong-hire', 'hire', 'hold', 'no-hire']
    },
    comments: String,
    submittedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

interviewSchema.index({ orgId: 1, scheduledAt: 1, status: 1 });
interviewSchema.index({ orgId: 1, applicationId: 1, scheduledAt: 1 }, { unique: true });

module.exports = mongoose.model('Interview', interviewSchema);
