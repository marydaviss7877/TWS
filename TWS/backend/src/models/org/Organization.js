const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: String,
  logo: String,
  website: String,
  industry: String,
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    default: '1-10'
  },
  billingInfo: {
    companyName: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    taxId: String,
    billingEmail: String,
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'paypal'],
      default: 'credit_card'
    }
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      },
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }]
    },
    features: {
      timeTracking: {
        type: Boolean,
        default: true
      },
      invoicing: {
        type: Boolean,
        default: false
      },
      integrations: {
        type: Boolean,
        default: false
      },
      aiFeatures: {
        type: Boolean,
        default: false
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'trialing'],
      default: 'trialing'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    trialEndsAt: Date
  },
  // Link to tenant (optional - for multi-tenant scenarios)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  }
}, {
  timestamps: true
});

// Index for performance
organizationSchema.index({ slug: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ 'subscription.status': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
