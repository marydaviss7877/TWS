const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  department: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  skills: [{
    type: String,
    trim: true
  }],
  capacity: {
    type: Number,
    default: 0
  },
  utilization: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for performance
teamSchema.index({ name: 1 });
teamSchema.index({ teamLead: 1 });
teamSchema.index({ status: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Method to add member
teamSchema.methods.addMember = function(employeeId) {
  if (!this.members.includes(employeeId)) {
    this.members.push(employeeId);
  }
  return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(employeeId) {
  this.members = this.members.filter(id => !id.equals(employeeId));
  return this.save();
};

module.exports = mongoose.model('Team', teamSchema);
