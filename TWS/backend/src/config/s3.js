const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const envConfig = require('./environment');

/**
 * AWS S3 Configuration for File Uploads
 * Supports homework submissions, documents, and other tenant materials
 */

// Initialize S3 Client
const s3Client = new S3Client({
  region: envConfig.get('AWS_REGION') || 'us-east-1',
  credentials: {
    accessKeyId: envConfig.get('AWS_ACCESS_KEY_ID') || 'dummy-key',
    secretAccessKey: envConfig.get('AWS_SECRET_ACCESS_KEY') || 'dummy-secret'
  }
});

const BUCKET_NAME = envConfig.get('AWS_S3_BUCKET') || 'tws-files';

/**
 * File upload configuration with S3
 * Streams files directly to S3 without loading into memory
 */
const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: 'private', // Files are private by default
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        uploadedBy: req.user?._id?.toString() || 'unknown',
        uploadedAt: new Date().toISOString(),
        tenantId: req.user?.tenantId || 'unknown',
        orgId: req.user?.orgId?.toString() || 'unknown'
      });
    },
    key: (req, file, cb) => {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${req.user?.tenantId || 'public'}/${req.user?.orgId || 'files'}/${timestamp}-${sanitizedName}`;
      cb(null, uniqueFilename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Max 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types for homework submissions
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, TXT, ZIP, RAR`));
    }
  }
});

/**
 * Generate signed URL for downloading private files
 * URLs expire after 1 hour
 */
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

async function generateSignedUrl(fileKey) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 */
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

async function deleteFromS3(fileKey) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
}

/**
 * Local file upload fallback (if S3 not configured)
 * Saves files to local disk
 */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  }
});

const uploadLocal = multer({
  storage: localStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Check if S3 is configured
const isS3Configured = () => {
  const accessKey = envConfig.get('AWS_ACCESS_KEY_ID');
  const secretKey = envConfig.get('AWS_SECRET_ACCESS_KEY');
  return accessKey && secretKey && accessKey !== 'dummy-key';
};

module.exports = {
  uploadToS3,
  uploadLocal,
  generateSignedUrl,
  deleteFromS3,
  isS3Configured,
  s3Client,
  BUCKET_NAME
};

