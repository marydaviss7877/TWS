const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 80 },
  context: { type: String, trim: true, maxlength: 240, default: '' }
}, { _id: true });

const assetSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', 'archive', 'other'],
    required: true
  },
  key: { type: String, required: true },
  originalName: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 120 },
  size: { type: Number, required: true, min: 0 },
  altText: { type: String, trim: true, maxlength: 300, default: '' },
  caption: { type: String, trim: true, maxlength: 500, default: '' },
  width: { type: Number, min: 1, default: null },
  height: { type: Number, min: 1, default: null },
  duration: { type: Number, min: 0, default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const blockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'heading', 'quote', 'image', 'video', 'gallery', 'embed', 'document', 'divider', 'cta'],
    required: true
  },
  title: { type: String, trim: true, maxlength: 300, default: '' },
  body: { type: String, maxlength: 12000, default: '' },
  assetIds: [{ type: mongoose.Schema.Types.ObjectId }],
  embed: {
    provider: { type: String, enum: ['loom', 'youtube', 'vimeo', 'figma', 'other'], default: 'other' },
    url: { type: String, maxlength: 2048, default: '' },
    embedUrl: { type: String, maxlength: 2048, default: '' }
  },
  cta: {
    label: { type: String, maxlength: 80, default: '' },
    url: { type: String, maxlength: 2048, default: '' }
  },
  order: { type: Number, min: 0, default: 0 }
}, { _id: true });

const portfolioItemSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  summary: { type: String, trim: true, maxlength: 600, default: '' },
  type: {
    type: String,
    enum: ['case_study', 'project', 'showcase', 'testimonial', 'resource'],
    default: 'case_study',
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  visibility: {
    scope: {
      type: String,
      enum: ['sales', 'organization'],
      default: 'sales',
      index: true
    },
    visibleFrom: { type: Date, default: null },
    visibleUntil: { type: Date, default: null }
  },
  client: {
    name: { type: String, trim: true, maxlength: 180, default: '' },
    industry: { type: String, trim: true, maxlength: 120, default: '' },
    website: { type: String, trim: true, maxlength: 2048, default: '' },
    logoAssetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    confidential: { type: Boolean, default: false }
  },
  services: [{ type: String, trim: true, maxlength: 100 }],
  technologies: [{ type: String, trim: true, maxlength: 100 }],
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 80 }],
  challenge: { type: String, maxlength: 6000, default: '' },
  approach: { type: String, maxlength: 10000, default: '' },
  solution: { type: String, maxlength: 10000, default: '' },
  outcome: { type: String, maxlength: 6000, default: '' },
  metrics: { type: [metricSchema], default: [] },
  testimonial: {
    quote: { type: String, maxlength: 2000, default: '' },
    author: { type: String, trim: true, maxlength: 120, default: '' },
    role: { type: String, trim: true, maxlength: 160, default: '' }
  },
  assets: { type: [assetSchema], default: [] },
  blocks: { type: [blockSchema], default: [] },
  coverAssetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  featured: { type: Boolean, default: false, index: true },
  sortOrder: { type: Number, default: 0, index: true },
  projectDate: { type: Date, default: null },
  publishedAt: { type: Date, default: null, index: true },
  seo: {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    shareAssetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    noIndex: { type: Boolean, default: false }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

portfolioItemSchema.index({ orgId: 1, slug: 1 }, {
  unique: true,
  partialFilterExpression: { deletedAt: null }
});
portfolioItemSchema.index({ orgId: 1, status: 1, featured: -1, sortOrder: 1, publishedAt: -1 });
portfolioItemSchema.index({ orgId: 1, 'visibility.scope': 1, 'visibility.visibleFrom': 1, 'visibility.visibleUntil': 1 });
portfolioItemSchema.index({ orgId: 1, title: 'text', summary: 'text', tags: 'text', services: 'text' });

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);
