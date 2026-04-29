const mongoose = require('mongoose');

/**
 * Equity & Cap Table Models
 * Comprehensive equity management for software house ERP
 */

// Share Class Schema
const shareClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['common', 'preferred_a', 'preferred_b', 'preferred_c', 'options', 'rsu', 'warrant', 'convertible_note'],
    required: true
  },
  description: String,
  rights: {
    voting: {
      type: Boolean,
      default: true
    },
    dividend: {
      type: Boolean,
      default: false
    },
    liquidationPreference: {
      type: Number,
      default: 1.0 // Multiplier (1x, 2x, etc.)
    },
    participation: {
      type: Boolean,
      default: false
    },
    antiDilution: {
      type: String,
      enum: ['none', 'full_ratchet', 'weighted_average'],
      default: 'none'
    }
  },
  conversionRatio: {
    type: Number,
    default: 1.0 // For convertible instruments
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Equity Holder Schema
const equityHolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['founder', 'cofounder', 'employee', 'investor', 'advisor', 'consultant', 'other'],
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  contactInfo: {
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  taxId: String, // SSN, EIN, etc.
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// Share Issuance Schema (tracks each issuance of shares)
const shareIssuanceSchema = new mongoose.Schema({
  issuanceNumber: {
    type: String,
    required: true,
    unique: true
  },
  holderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  shareClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareClass',
    required: true
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 0
  },
  issuePrice: {
    type: Number,
    default: 0
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  vestingScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VestingSchedule'
  },
  status: {
    type: String,
    enum: ['issued', 'vested', 'exercised', 'cancelled', 'transferred'],
    default: 'issued'
  },
  certificateNumber: String,
  notes: String,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date
}, {
  timestamps: true
});

// Vesting Schedule Schema
const vestingScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  holderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  issuanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareIssuance'
  },
  grantDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  cliffMonths: {
    type: Number,
    default: 0,
    min: 0
  },
  vestingMonths: {
    type: Number,
    required: true,
    min: 1
  },
  vestingType: {
    type: String,
    enum: ['linear', 'monthly', 'quarterly', 'yearly', 'custom'],
    default: 'monthly'
  },
  totalShares: {
    type: Number,
    required: true,
    min: 0
  },
  vestedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  accelerationClauses: {
    singleTrigger: {
      type: Boolean,
      default: false
    },
    doubleTrigger: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'accelerated'],
    default: 'active'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  customVestingDates: [{
    date: Date,
    shares: Number
  }]
}, {
  timestamps: true
});

// Option Pool Schema
const optionPoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  poolSize: {
    type: Number,
    required: true,
    min: 0
  },
  reservedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  grantedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  availableShares: {
    type: Number,
    default: function() {
      return this.poolSize - this.reservedShares - this.grantedShares;
    }
  },
  shareClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareClass',
    required: true
  },
  creationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expirationDate: Date,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// Option Grant Schema (employee stock options)
const optionGrantSchema = new mongoose.Schema({
  grantNumber: {
    type: String,
    required: true,
    unique: true
  },
  holderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  optionPoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OptionPool',
    required: true
  },
  numberOfOptions: {
    type: Number,
    required: true,
    min: 0
  },
  strikePrice: {
    type: Number,
    required: true,
    min: 0
  },
  grantDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: true
  },
  vestingScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VestingSchedule',
    required: true
  },
  status: {
    type: String,
    enum: ['granted', 'vesting', 'exercised', 'expired', 'cancelled'],
    default: 'granted'
  },
  exercisedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  exercisePrice: Number,
  exerciseDate: Date,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Convertible Instrument Schema (SAFE, convertible notes)
const convertibleInstrumentSchema = new mongoose.Schema({
  instrumentNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['safe', 'convertible_note', 'kiss'],
    required: true
  },
  holderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  valuationCap: Number,
  discountRate: {
    type: Number,
    min: 0,
    max: 100
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0
  },
  maturityDate: Date,
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  conversionTrigger: {
    type: String,
    enum: ['equity_round', 'sale', 'ipo', 'maturity'],
    default: 'equity_round'
  },
  status: {
    type: String,
    enum: ['issued', 'converted', 'repaid', 'matured'],
    default: 'issued'
  },
  convertedShareClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareClass'
  },
  convertedShares: Number,
  conversionDate: Date,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Share Transfer Schema (audit log for transfers)
const shareTransferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  fromHolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  toHolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquityHolder',
    required: true
  },
  issuanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareIssuance',
    required: true
  },
  numberOfShares: {
    type: Number,
    required: true,
    min: 0
  },
  transferPrice: Number,
  transferDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  transferType: {
    type: String,
    enum: ['sale', 'gift', 'inheritance', 'forfeiture', 'exercise', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Company Equity Structure Schema (authorized shares, etc.)
const companyEquityStructureSchema = new mongoose.Schema({
  authorizedShares: {
    type: Number,
    required: true,
    min: 0
  },
  issuedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingShares: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedShares: {
    type: Number,
    default: 0,
    min: 0
  },
  parValue: {
    type: Number,
    default: 0.0001
  },
  lastValuation: {
    amount: Number,
    date: Date,
    valuationType: {
      type: String,
      enum: ['pre_money', 'post_money', '409a', 'other']
    }
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
shareClassSchema.index({ orgId: 1, isActive: 1 });
equityHolderSchema.index({ orgId: 1, type: 1 });
equityHolderSchema.index({ userId: 1 });
equityHolderSchema.index({ email: 1 });
shareIssuanceSchema.index({ orgId: 1, holderId: 1 });
shareIssuanceSchema.index({ orgId: 1, shareClassId: 1 });
shareIssuanceSchema.index({ issuanceNumber: 1 });
vestingScheduleSchema.index({ orgId: 1, holderId: 1 });
vestingScheduleSchema.index({ grantDate: 1 });
optionPoolSchema.index({ orgId: 1, isActive: 1 });
optionGrantSchema.index({ orgId: 1, holderId: 1 });
optionGrantSchema.index({ grantNumber: 1 });
optionGrantSchema.index({ expirationDate: 1 });
convertibleInstrumentSchema.index({ orgId: 1, holderId: 1 });
convertibleInstrumentSchema.index({ instrumentNumber: 1 });
shareTransferSchema.index({ orgId: 1 });
shareTransferSchema.index({ transferNumber: 1 });

module.exports = {
  ShareClass: mongoose.model('ShareClass', shareClassSchema),
  EquityHolder: mongoose.model('EquityHolder', equityHolderSchema),
  ShareIssuance: mongoose.model('ShareIssuance', shareIssuanceSchema),
  VestingSchedule: mongoose.model('VestingSchedule', vestingScheduleSchema),
  OptionPool: mongoose.model('OptionPool', optionPoolSchema),
  OptionGrant: mongoose.model('OptionGrant', optionGrantSchema),
  ConvertibleInstrument: mongoose.model('ConvertibleInstrument', convertibleInstrumentSchema),
  ShareTransfer: mongoose.model('ShareTransfer', shareTransferSchema),
  CompanyEquityStructure: mongoose.model('CompanyEquityStructure', companyEquityStructureSchema)
};

