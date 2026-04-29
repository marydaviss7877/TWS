const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  /** Link to User for client portal login (optional). When set, role 'client' user can access this client's projects. */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['individual', 'company'],
    default: 'company'
  },
  contact: {
    primary: {
      name: String,
      email: {
        type: String,
        lowercase: true,
        trim: true
      },
      phone: String,
      title: String
    },
    billing: {
      name: String,
      email: {
        type: String,
        lowercase: true,
        trim: true
      },
      phone: String
    },
    technical: {
      name: String,
      email: {
        type: String,
        lowercase: true,
        trim: true
      },
      phone: String
    }
  },
  company: {
    name: String,
    website: String,
    industry: String,
    size: String,
    description: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billing: {
    currency: {
      type: String,
      default: 'USD'
    },
    paymentTerms: {
      type: String,
      enum: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'],
      default: 'net_30'
    },
    taxRate: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    }
  },
  portal: {
    enabled: {
      type: Boolean,
      default: true
    },
    accessLevel: {
      type: String,
      enum: ['view_only', 'comment', 'approve', 'full_access'],
      default: 'approve'
    },
    customDomain: String,
    branding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String
    }
  },
  notes: String,
  tags: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect'],
    default: 'active'
  },
  lastContact: Date,
  totalProjects: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for performance
clientSchema.index({ orgId: 1, slug: 1 }, { unique: true });
clientSchema.index({ orgId: 1, status: 1 });
clientSchema.index({ 'contact.primary.email': 1 });
clientSchema.index({ orgId: 1, userId: 1 }, { sparse: true });

module.exports = mongoose.model('ProjectClient', clientSchema);
