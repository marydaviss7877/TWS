const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const fileService = require('../../../services/file.service');
// Chat model removed - messaging features have been removed
// const Chat = require('../../../models/Chat');
const File = require('../../../models/documents/File');
const fileProcessorQueue = require('../../../workers/fileProcessorQueue');

const router = express.Router();

// Configure multer for local file uploads (fallback)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const validation = fileService.validateFile(file.mimetype, file.size);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join(', ')), false);
    }
  }
});

// POST /api/files/presign - Generate presigned URL for S3 upload
router.post('/presign', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { filename, mimeType, size, chatId } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!filename || !mimeType || !size || !chatId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: filename, mimeType, size, chatId'
    });
  }

  // Validate file
  const validation = fileService.validateFile(mimeType, size);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'File validation failed',
      errors: validation.errors
    });
  }

  // Messaging features have been removed - chat validation disabled
  // NOTE: This endpoint may need to be updated for non-chat file uploads
  if (chatId) {
    return res.status(410).json({
      success: false,
      message: 'Chat-based file uploads are no longer supported. Messaging features have been removed.'
    });
  }

  try {
    // Create file record
    const fileKey = fileService.generateFileKey(filename, userId);
    const file = await fileService.createFile({
      chatId,
      uploaderId: userId,
      filename: path.basename(fileKey),
      originalName: filename,
      mimeType,
      size,
      s3Key: fileService.useS3 ? fileKey : null,
      localPath: !fileService.useS3 ? path.join(fileService.localUploadDir, fileKey) : null,
      status: 'uploading'
    });

    let uploadUrl = null;
    let uploadMethod = 'local';

    if (fileService.useS3) {
      // Generate presigned URL for S3
      uploadUrl = await fileService.generatePresignedUploadUrl(fileKey, mimeType);
      uploadMethod = 's3';
    }

    res.json({
      success: true,
      data: {
        fileId: file._id,
        uploadUrl,
        uploadMethod,
        fileKey,
        expiresIn: fileService.presignedUrlExpiry
      }
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload URL',
      error: error.message
    });
  }
}));

// POST /api/files/notify-upload - Notify server that upload is complete
router.post('/notify-upload', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { fileId } = req.body;
  const userId = req.user._id;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: 'fileId is required'
    });
  }

  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Verify user owns the file
    if (file.uploaderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify file exists in storage
    let fileExists = false;
    if (file.s3Key) {
      fileExists = await fileService.checkS3FileExists(file.s3Key);
    } else if (file.localPath) {
      try {
        await fs.access(file.localPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }
    }

    if (!fileExists) {
      await file.updateOne({ status: 'failed' });
      return res.status(400).json({
        success: false,
        message: 'File not found in storage'
      });
    }

    // Update file status
    await file.updateOne({ status: 'uploaded' });

    // Enqueue for processing (thumbnail generation, virus scan)
    await fileProcessorQueue.add('processFile', {
      fileId: file._id.toString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    res.json({
      success: true,
      message: 'Upload notification received',
      data: {
        fileId: file._id,
        status: 'uploaded'
      }
    });
  } catch (error) {
    console.error('Error processing upload notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process upload notification',
      error: error.message
    });
  }
}));

// POST /api/files/upload-local - Direct upload for local filesystem
router.post('/upload-local', authenticateToken, strictLimiter, upload.single('file'), ErrorHandler.asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  if (!chatId) {
    return res.status(400).json({
      success: false,
      message: 'chatId is required'
    });
  }

  // Messaging features have been removed - chat validation disabled
  // NOTE: This endpoint may need to be updated for non-chat file uploads
  if (chatId) {
    return res.status(410).json({
      success: false,
      message: 'Chat-based file uploads are no longer supported. Messaging features have been removed.'
    });
  }

  try {
    // Create file record
    const file = await fileService.createFile({
      chatId,
      uploaderId: userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      localPath: req.file.path,
      status: 'uploaded'
    });

    // Enqueue for processing
    await fileProcessorQueue.add('processFile', {
      fileId: file._id.toString()
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId: file._id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        status: file.status
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Error cleaning up file:', unlinkError);
    }

    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
}));

// GET /api/files/:id - Get file metadata and download URL
router.get('/:id', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const file = await fileService.getFileById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has access to the chat
    const chat = await Chat.findById(file.chatId);
    if (!chat || !chat.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get file metadata
    const metadata = await fileService.getFileMetadata(id);

    // Generate download URL if file is ready
    let downloadUrl = null;
    if (file.isReady()) {
      try {
        const downloadData = await fileService.getDownloadUrl(id, userId);
        downloadUrl = downloadData.url;
      } catch (error) {
        console.error('Error generating download URL:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...metadata,
        downloadUrl,
        isReady: file.isReady(),
        isBlocked: file.isBlocked()
      }
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file',
      error: error.message
    });
  }
}));

// GET /api/files/:id/download - Direct download endpoint
router.get('/:id/download', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const file = await fileService.getFileById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user has access to the chat
    const chat = await Chat.findById(file.chatId);
    if (!chat || !chat.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!file.isReady()) {
      return res.status(400).json({
        success: false,
        message: 'File is not ready for download',
        status: file.status
      });
    }

    if (file.isBlocked()) {
      return res.status(403).json({
        success: false,
        message: 'File is blocked'
      });
    }

    // For S3, redirect to presigned URL
    if (fileService.useS3 && file.s3Key) {
      const downloadUrl = await fileService.generatePresignedDownloadUrl(file.s3Key);
      return res.redirect(downloadUrl);
    }

    // For local files, stream the file
    if (file.localPath) {
      const filePath = file.localPath;
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }

      // Set headers
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.size);

      // Increment download count
      await file.incrementDownload();

      // Stream file
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file'
          });
        }
      });

      return;
    }

    res.status(404).json({
      success: false,
      message: 'File location not found'
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
}));

// GET /api/files/local/:path - Serve local files (for development)
router.get('/local/:path(*)', (req, res) => {
  if (fileService.useS3) {
    return res.status(404).json({
      success: false,
      message: 'Local file serving is disabled when using S3'
    });
  }

  const filePath = path.join(fileService.localUploadDir, req.params.path);
  
  // Security check - ensure path is within upload directory
  const resolvedPath = path.resolve(filePath);
  const uploadDir = path.resolve(fileService.localUploadDir);
  
  if (!resolvedPath.startsWith(uploadDir)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.sendFile(resolvedPath, (error) => {
    if (error) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  });
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const file = await fileService.getFileById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Messaging features have been removed - simplified access control
    // Only file owner can delete (chat admin check removed)
    const isOwner = file.uploaderId.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - only file owner can delete'
      });
    }

    await fileService.deleteFile(id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
}));

// GET /api/files/chat/:chatId - Get files for a chat
// NOTE: Messaging features removed - this endpoint returns error
router.get('/chat/:chatId', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Chat-based file listing is no longer supported. Messaging features have been removed.'
  });
}));

// GET /api/files/chat/:chatId/stats - Get storage stats for a chat
// NOTE: Messaging features removed - this endpoint returns error
router.get('/chat/:chatId/stats', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Chat-based file stats are no longer supported. Messaging features have been removed.'
  });
}));

module.exports = router;
