const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true,
    lowercase: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  s3Key: {
    type: String,
    sparse: true, // Only for S3 uploads
    index: true
  },
  localPath: {
    type: String,
    sparse: true // Only for local filesystem uploads
  },
  url: {
    type: String,
    required: false // Will be generated on demand
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  thumbnailS3Key: {
    type: String,
    sparse: true
  },
  thumbnailLocalPath: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['uploading', 'uploaded', 'processing', 'scanned', 'blocked', 'ready', 'failed'],
    default: 'uploading',
    index: true
  },
  scanResult: {
    provider: String, // 'clamav', 'virustotal', etc.
    result: String, // 'clean', 'infected', 'error'
    details: mongoose.Schema.Types.Mixed,
    scannedAt: Date
  },
  metadata: {
    width: Number, // For images/videos
    height: Number, // For images/videos
    duration: Number, // For videos/audio
    pages: Number, // For PDFs
    encoding: String,
    bitrate: Number
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
fileSchema.index({ chatId: 1, createdAt: -1 });
fileSchema.index({ uploaderId: 1, createdAt: -1 });
fileSchema.index({ status: 1, createdAt: -1 });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ size: 1 });

// Virtual for file type category
fileSchema.virtual('category').get(function() {
  if (!this.mimeType) return 'unknown';
  
  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType.includes('pdf')) return 'document';
  if (this.mimeType.includes('document') || this.mimeType.includes('sheet') || this.mimeType.includes('presentation')) return 'document';
  if (this.mimeType.includes('text/') || this.mimeType.includes('json') || this.mimeType.includes('xml')) return 'text';
  if (this.mimeType.includes('zip') || this.mimeType.includes('rar') || this.mimeType.includes('tar')) return 'archive';
  
  return 'other';
});

// Virtual for human readable file size
fileSchema.virtual('humanSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Method to check if file needs thumbnail
fileSchema.methods.needsThumbnail = function() {
  const thumbnailTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/avi', 'video/mov',
    'application/pdf'
  ];
  return thumbnailTypes.includes(this.mimeType);
};

// Method to check if file is ready for download
fileSchema.methods.isReady = function() {
  return ['scanned', 'ready'].includes(this.status);
};

// Method to check if file is blocked
fileSchema.methods.isBlocked = function() {
  return this.status === 'blocked';
};

// Method to increment download count
fileSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save();
};

// Static method to find files by chat
fileSchema.statics.findByChatId = function(chatId, options = {}) {
  const { page = 1, limit = 20, status = 'ready' } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    chatId, 
    status: status === 'all' ? { $ne: 'uploading' } : status 
  })
    .populate('uploaderId', 'fullName email profilePicUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get storage stats
fileSchema.statics.getStorageStats = function(chatId) {
  return this.aggregate([
    { $match: { chatId: new mongoose.Types.ObjectId(chatId) } },
    {
      $group: {
        _id: '$category',
        totalSize: { $sum: '$size' },
        count: { $sum: 1 },
        avgSize: { $avg: '$size' }
      }
    },
    { $sort: { totalSize: -1 } }
  ]);
};

// Pre-save middleware to set filename if not provided
fileSchema.pre('save', function(next) {
  if (!this.filename && this.originalName) {
    // Generate unique filename
    const ext = this.originalName.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    this.filename = `${timestamp}-${random}.${ext}`;
  }
  next();
});

// Pre-remove middleware to clean up S3/local files
fileSchema.pre('remove', async function(next) {
  try {
    const fileService = require('../services/file.service');
    
    // Delete main file
    if (this.s3Key) {
      await fileService.deleteFromS3(this.s3Key);
    } else if (this.localPath) {
      await fileService.deleteFromLocal(this.localPath);
    }
    
    // Delete thumbnail
    if (this.thumbnailS3Key) {
      await fileService.deleteFromS3(this.thumbnailS3Key);
    } else if (this.thumbnailLocalPath) {
      await fileService.deleteFromLocal(this.thumbnailLocalPath);
    }
    
    next();
  } catch (error) {
    console.error('Error cleaning up file:', error);
    next(); // Don't fail the deletion if cleanup fails
  }
});

module.exports = mongoose.model('File', fileSchema);
