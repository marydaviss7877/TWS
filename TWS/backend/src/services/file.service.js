const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const File = require('../models/documents/File');

class FileService {
  constructor() {
    this.useS3 = process.env.USE_S3 === 'true';
    this.localUploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
    this.localThumbnailDir = process.env.LOCAL_THUMBNAIL_DIR || './uploads/thumbnails';
    
    // S3 Configuration
    if (this.useS3) {
      // Reuse the application-wide client so custom S3 endpoints (Railway,
      // R2, MinIO) behave exactly like Sheets, Documents, and Portfolio.
      this.s3Client = s3Client;
      this.bucketName = BUCKET_NAME;
    }
    
    // File validation configuration
    this.allowedMimeTypes = (process.env.ALLOWED_MIME_TYPES || 
      'image/jpeg,image/jpg,image/png,image/gif,image/webp,' +
      'video/mp4,video/webm,video/avi,video/mov,' +
      'audio/mp3,audio/wav,audio/ogg,' +
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
      'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
      'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
      'text/plain,text/csv,application/json,' +
      'application/zip,application/x-rar-compressed'
    ).split(',');
    
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
    this.presignedUrlExpiry = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 3600; // 1 hour
    this.downloadUrlExpiry = parseInt(process.env.DOWNLOAD_URL_EXPIRY) || 300; // 5 minutes
    
    // Ensure local directories exist
    this.ensureLocalDirectories();
  }
  
  async ensureLocalDirectories() {
    if (!this.useS3) {
      try {
        await fs.mkdir(this.localUploadDir, { recursive: true });
        await fs.mkdir(this.localThumbnailDir, { recursive: true });
      } catch (error) {
        console.error('Error creating local directories:', error);
      }
    }
  }
  
  // Validation methods
  validateMimeType(mimeType) {
    return this.allowedMimeTypes.includes(mimeType.toLowerCase());
  }
  
  validateFileSize(size) {
    return size <= this.maxFileSize;
  }
  
  validateFile(mimeType, size) {
    const errors = [];
    
    if (!this.validateMimeType(mimeType)) {
      errors.push(`File type ${mimeType} is not allowed`);
    }
    
    if (!this.validateFileSize(size)) {
      errors.push(`File size ${size} exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Generate unique file key/path
  generateFileKey(originalName, uploaderId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `files/${uploaderId}/${timestamp}-${random}${ext}`;
  }
  
  generateThumbnailKey(fileKey) {
    const parsed = path.parse(fileKey);
    return `thumbnails/${parsed.dir.replace('files/', '')}/${parsed.name}-thumb.jpg`;
  }
  
  // S3 Methods
  async generatePresignedUploadUrl(fileKey, mimeType) {
    if (!this.useS3) {
      throw new Error('S3 is not configured');
    }
    
    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Expires: this.presignedUrlExpiry,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256'
    };
    
    const command = new PutObjectCommand(params);
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
  
  async generatePresignedDownloadUrl(fileKey) {
    if (!this.useS3) {
      throw new Error('S3 is not configured');
    }
    
    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Expires: this.downloadUrlExpiry,
      ResponseContentDisposition: 'attachment'
    };
    
    const command = new GetObjectCommand(params);
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
  
  async checkS3FileExists(fileKey) {
    if (!this.useS3) return false;
    
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async deleteFromS3(fileKey) {
    if (!this.useS3) return;
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw error;
    }
  }
  
  async uploadToS3(fileKey, buffer, mimeType) {
    if (!this.useS3) {
      throw new Error('S3 is not configured');
    }
    
    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256'
    };
    
    const command = new PutObjectCommand(params);
    return await this.s3Client.send(command);
  }
  
  async downloadFromS3(fileKey) {
    if (!this.useS3) {
      throw new Error('S3 is not configured');
    }
    
    const params = {
      Bucket: this.bucketName,
      Key: fileKey
    };
    
    const command = new GetObjectCommand(params);
    const result = await this.s3Client.send(command);
    return result.Body;
  }
  
  // Local filesystem methods
  async saveToLocal(fileKey, buffer) {
    const filePath = path.join(this.localUploadDir, fileKey);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, buffer);
    return filePath;
  }
  
  async deleteFromLocal(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error deleting local file:', error);
        throw error;
      }
    }
  }
  
  async readFromLocal(filePath) {
    return fs.readFile(filePath);
  }
  
  getLocalFileUrl(filePath) {
    const relativePath = path.relative(this.localUploadDir, filePath);
    return `/api/files/local/${encodeURIComponent(relativePath)}`;
  }
  
  // Thumbnail generation
  async generateImageThumbnail(inputBuffer, maxWidth = 300, maxHeight = 300) {
    return sharp(inputBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
  
  async generateVideoThumbnail(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '300x300'
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }
  
  async generatePdfThumbnail(inputBuffer) {
    // This would require pdf2pic or similar library
    // For now, return a placeholder
    const placeholderSvg = `
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#f3f4f6"/>
        <text x="150" y="150" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="24">PDF</text>
      </svg>
    `;
    return Buffer.from(placeholderSvg);
  }
  
  // Main file operations
  async createFile(fileData) {
    const file = new File(fileData);
    return file.save();
  }
  
  async getFileById(fileId) {
    return File.findById(fileId).populate('uploaderId', 'fullName email');
  }
  
  async updateFileStatus(fileId, status, additionalData = {}) {
    return File.findByIdAndUpdate(
      fileId,
      { status, ...additionalData },
      { new: true }
    );
  }
  
  async getDownloadUrl(fileId, userId) {
    const file = await this.getFileById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    if (!file.isReady()) {
      throw new Error('File is not ready for download');
    }
    
    // Check permissions (implement based on your chat access logic)
    // This is a placeholder - you should implement proper permission checking
    
    // Increment download count
    await file.incrementDownload();
    
    if (this.useS3 && file.s3Key) {
      return {
        url: await this.generatePresignedDownloadUrl(file.s3Key),
        filename: file.originalName,
        mimeType: file.mimeType,
        size: file.size
      };
    } else if (file.localPath) {
      return {
        url: this.getLocalFileUrl(file.localPath),
        filename: file.originalName,
        mimeType: file.mimeType,
        size: file.size
      };
    }
    
    throw new Error('File location not found');
  }
  
  async deleteFile(fileId) {
    const file = await this.getFileById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    // Delete from storage
    if (file.s3Key) {
      await this.deleteFromS3(file.s3Key);
    }
    if (file.localPath) {
      await this.deleteFromLocal(file.localPath);
    }
    
    // Delete thumbnails
    if (file.thumbnailS3Key) {
      await this.deleteFromS3(file.thumbnailS3Key);
    }
    if (file.thumbnailLocalPath) {
      await this.deleteFromLocal(file.thumbnailLocalPath);
    }
    
    // Delete from database
    await file.remove();
    
    return true;
  }
  
  // Get file metadata without download URL
  async getFileMetadata(fileId) {
    const file = await this.getFileById(fileId);
    
    if (!file) {
      throw new Error('File not found');
    }
    
    return {
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      humanSize: file.humanSize,
      category: file.category,
      status: file.status,
      thumbnailUrl: file.thumbnailUrl,
      uploaderId: file.uploaderId,
      createdAt: file.createdAt,
      metadata: file.metadata
    };
  }
  
  // Cleanup expired files
  async cleanupExpiredFiles() {
    const expiredFiles = await File.find({
      expiresAt: { $lt: new Date() }
    });
    
    for (const file of expiredFiles) {
      try {
        await this.deleteFile(file._id);
      } catch (error) {
        console.error(`Error deleting expired file ${file._id}:`, error);
      }
    }
    
    return expiredFiles.length;
  }
}

module.exports = new FileService();
