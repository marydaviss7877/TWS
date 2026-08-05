const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const envConfig = require('./environment');

/**
 * AWS S3 Configuration for File Uploads
 * Supports homework submissions, documents, and other tenant materials
 */

// Initialize an AWS S3 or S3-compatible client (for example Railway Buckets).
const endpoint = envConfig.get('S3_ENDPOINT');
const s3Client = new S3Client({
  region: envConfig.get('AWS_REGION') || 'us-east-1',
  // Buckets created in a different region respond with x-amz-bucket-region and
  // PermanentRedirect. Let the SDK follow that hint instead of turning a valid
  // upload into a 500 (notably sheet autosaves, which write JSON directly).
  followRegionRedirects: true,
  ...(endpoint ? { endpoint } : {}),
  forcePathStyle: Boolean(envConfig.get('S3_FORCE_PATH_STYLE')),
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

const PORTFOLIO_MIME_EXTENSIONS = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/zip': ['.zip']
};

/**
 * Portfolio media uploader. Objects are private and UUID-named; original names
 * remain metadata only. MIME and extension must agree.
 */
const uploadPortfolioAsset = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => cb(null, {
      uploadedBy: String(req.user?._id || req.user?.id || 'unknown'),
      tenantId: String(req.tenantId || req.tenant?._id || 'unknown'),
      orgId: String(req.orgId || req.tenant?.organizationId || req.tenant?.orgId || 'unknown'),
      originalName: path.basename(file.originalname).slice(0, 255)
    }),
    key: (req, file, cb) => {
      const tenantId = String(req.tenantId || req.tenant?._id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
      const orgId = String(req.orgId || req.tenant?.organizationId || req.tenant?.orgId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${tenantId}/${orgId}/portfolio/${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = PORTFOLIO_MIME_EXTENSIONS[file.mimetype];
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      return cb(new Error('File type and extension do not match an allowed portfolio format'));
    }
    const categoryLimit = file.mimetype.startsWith('image/') ? 5 * 1024 * 1024
      : file.mimetype.startsWith('video/') ? 100 * 1024 * 1024
        : 25 * 1024 * 1024;
    file.portfolioSizeLimit = categoryLimit;
    cb(null, true);
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

function matchesPortfolioSignature(mimeType, bytes) {
  const ascii = bytes.toString('ascii');
  const hex = bytes.toString('hex');
  const startsHex = signature => hex.startsWith(signature.toLowerCase());
  switch (mimeType) {
    case 'image/jpeg': return startsHex('ffd8ff');
    case 'image/png': return startsHex('89504e470d0a1a0a');
    case 'image/gif': return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
    case 'image/webp': return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
    case 'application/pdf': return ascii.startsWith('%PDF');
    case 'application/zip':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return startsHex('504b0304') || startsHex('504b0506') || startsHex('504b0708');
    case 'application/msword':
    case 'application/vnd.ms-powerpoint':
      return startsHex('d0cf11e0a1b11ae1');
    case 'video/mp4':
    case 'video/quicktime':
      return ascii.slice(4, 8) === 'ftyp';
    case 'video/webm': return startsHex('1a45dfa3');
    case 'audio/mpeg': return ascii.startsWith('ID3') || startsHex('fffb') || startsHex('fff3') || startsHex('fff2');
    case 'audio/wav': return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE';
    default: return false;
  }
}

async function validatePortfolioObjectSignature(file) {
  if (!file?.key || !file?.mimetype) return false;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: file.key,
    Range: 'bytes=0-31'
  });
  const response = await s3Client.send(command);
  const byteArray = await response.Body.transformToByteArray();
  return matchesPortfolioSignature(file.mimetype, Buffer.from(byteArray));
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
  uploadPortfolioAsset,
  uploadLocal,
  generateSignedUrl,
  deleteFromS3,
  validatePortfolioObjectSignature,
  matchesPortfolioSignature,
  isS3Configured,
  s3Client,
  BUCKET_NAME
};
