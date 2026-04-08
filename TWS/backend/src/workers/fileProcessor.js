const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const fileService = require('../services/file.service');
const File = require('../models/File');

class FileProcessor {
  constructor() {
    this.thumbnailWidth = 300;
    this.thumbnailHeight = 300;
    this.thumbnailQuality = 80;
    this.clamavEnabled = process.env.CLAMAV_ENABLED === 'true';
    this.virusTotalEnabled = process.env.VIRUSTOTAL_ENABLED === 'true';
    this.virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;
  }

  async processFile(jobOrData) {
    const { fileId } = jobOrData?.data ?? jobOrData;
    
    try {
      console.log(`Processing file: ${fileId}`);
      
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error(`File ${fileId} not found`);
      }

      // Update status to processing
      await file.updateOne({ status: 'processing' });

      // Step 1: Generate thumbnail if needed
      if (file.needsThumbnail()) {
        await this.generateThumbnail(file);
      }

      // Step 2: Virus scan
      const scanResult = await this.performVirusScan(file);
      
      // Update file with scan results
      const updateData = {
        scanResult,
        status: scanResult.result === 'clean' ? 'scanned' : 'blocked'
      };

      await file.updateOne(updateData);

      // Step 3: Final status update
      if (scanResult.result === 'clean') {
        await file.updateOne({ status: 'ready' });
      }

      return {
        success: true,
        fileId,
        status: scanResult.result === 'clean' ? 'ready' : 'blocked',
        thumbnailGenerated: file.needsThumbnail(),
        scanResult
      };

    } catch (error) {
      console.error(`Error processing file ${fileId}:`, error);
      
      // Update file status to failed
      try {
        await File.findByIdAndUpdate(fileId, { 
          status: 'failed',
          scanResult: {
            provider: 'system',
            result: 'error',
            details: { error: error.message },
            scannedAt: new Date()
          }
        });
      } catch (updateError) {
        console.error('Error updating file status to failed:', updateError);
      }

      throw error;
    }
  }

  async generateThumbnail(file) {
    try {
      console.log(`Generating thumbnail for file: ${file._id}`);

      let inputBuffer;
      let thumbnailBuffer;

      // Get file content
      if (file.s3Key && fileService.useS3) {
        inputBuffer = await fileService.downloadFromS3(file.s3Key);
      } else if (file.localPath) {
        inputBuffer = await fileService.readFromLocal(file.localPath);
      } else {
        throw new Error('File location not found');
      }

      // Generate thumbnail based on file type
      if (file.mimeType.startsWith('image/')) {
        thumbnailBuffer = await this.generateImageThumbnail(inputBuffer);
      } else if (file.mimeType.startsWith('video/')) {
        thumbnailBuffer = await this.generateVideoThumbnail(file, inputBuffer);
      } else if (file.mimeType === 'application/pdf') {
        thumbnailBuffer = await this.generatePdfThumbnail(inputBuffer);
      } else {
        // Generate a generic thumbnail
        thumbnailBuffer = await this.generateGenericThumbnail(file.mimeType);
      }

      // Save thumbnail
      const thumbnailKey = fileService.generateThumbnailKey(file.s3Key || file.filename);
      
      if (fileService.useS3) {
        // Upload thumbnail to S3
        await fileService.uploadToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg');
        
        // Update file with thumbnail S3 key
        await file.updateOne({
          thumbnailS3Key: thumbnailKey,
          thumbnailUrl: `https://${fileService.bucketName}.s3.amazonaws.com/${thumbnailKey}`
        });
      } else {
        // Save thumbnail locally
        const thumbnailPath = path.join(fileService.localThumbnailDir, thumbnailKey);
        const thumbnailDir = path.dirname(thumbnailPath);
        
        await fs.mkdir(thumbnailDir, { recursive: true });
        await fs.writeFile(thumbnailPath, thumbnailBuffer);
        
        // Update file with thumbnail local path
        await file.updateOne({
          thumbnailLocalPath: thumbnailPath,
          thumbnailUrl: `/api/files/local/thumbnails/${path.relative(fileService.localThumbnailDir, thumbnailPath)}`
        });
      }

      console.log(`Thumbnail generated successfully for file: ${file._id}`);
      return true;

    } catch (error) {
      console.error(`Error generating thumbnail for file ${file._id}:`, error);
      // Don't fail the entire job if thumbnail generation fails
      return false;
    }
  }

  async generateImageThumbnail(inputBuffer) {
    return sharp(inputBuffer)
      .resize(this.thumbnailWidth, this.thumbnailHeight, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: this.thumbnailQuality })
      .toBuffer();
  }

  async generateVideoThumbnail(file, inputBuffer) {
    return new Promise((resolve, reject) => {
      // Create temporary file for ffmpeg
      const tempInputPath = path.join('/tmp', `temp-${file._id}-input`);
      const tempOutputPath = path.join('/tmp', `temp-${file._id}-thumb.jpg`);

      // Write buffer to temp file
      fs.writeFile(tempInputPath, inputBuffer)
        .then(() => {
          ffmpeg(tempInputPath)
            .screenshots({
              timestamps: ['10%'],
              filename: path.basename(tempOutputPath),
              folder: path.dirname(tempOutputPath),
              size: `${this.thumbnailWidth}x${this.thumbnailHeight}`
            })
            .on('end', async () => {
              try {
                const thumbnailBuffer = await fs.readFile(tempOutputPath);
                
                // Clean up temp files
                await fs.unlink(tempInputPath).catch(() => {});
                await fs.unlink(tempOutputPath).catch(() => {});
                
                resolve(thumbnailBuffer);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', async (error) => {
              // Clean up temp files
              await fs.unlink(tempInputPath).catch(() => {});
              await fs.unlink(tempOutputPath).catch(() => {});
              reject(error);
            });
        })
        .catch(reject);
    });
  }

  async generatePdfThumbnail(inputBuffer) {
    // For PDF thumbnails, we'll create a simple placeholder
    // In production, you might want to use pdf2pic or similar
    const placeholderSvg = `
      <svg width="${this.thumbnailWidth}" height="${this.thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="20" y="20" width="${this.thumbnailWidth - 40}" height="${this.thumbnailHeight - 40}" fill="white" stroke="#d1d5db" stroke-width="2"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="24" font-weight="bold">PDF</text>
        <text x="50%" y="70%" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">Document</text>
      </svg>
    `;

    return sharp(Buffer.from(placeholderSvg))
      .png()
      .toBuffer();
  }

  async generateGenericThumbnail(mimeType) {
    let icon = '📄';
    let label = 'File';

    if (mimeType.startsWith('audio/')) {
      icon = '🎵';
      label = 'Audio';
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      icon = '📦';
      label = 'Archive';
    } else if (mimeType.includes('text/')) {
      icon = '📝';
      label = 'Text';
    }

    const placeholderSvg = `
      <svg width="${this.thumbnailWidth}" height="${this.thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f9fafb"/>
        <rect x="20" y="20" width="${this.thumbnailWidth - 40}" height="${this.thumbnailHeight - 40}" fill="white" stroke="#e5e7eb" stroke-width="2" rx="8"/>
        <text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle" font-size="48">${icon}</text>
        <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="600">${label}</text>
      </svg>
    `;

    return sharp(Buffer.from(placeholderSvg))
      .png()
      .toBuffer();
  }

  async performVirusScan(file) {
    const scanResult = {
      provider: 'none',
      result: 'clean', // Default to clean if no scanning is configured
      details: {},
      scannedAt: new Date()
    };

    try {
      // Try ClamAV first if enabled
      if (this.clamavEnabled) {
        const clamavResult = await this.scanWithClamAV(file);
        if (clamavResult) {
          return clamavResult;
        }
      }

      // Try VirusTotal if enabled
      if (this.virusTotalEnabled && this.virusTotalApiKey) {
        const virusTotalResult = await this.scanWithVirusTotal(file);
        if (virusTotalResult) {
          return virusTotalResult;
        }
      }

      // If no scanning is configured, return clean result
      return scanResult;

    } catch (error) {
      console.error('Error during virus scan:', error);
      
      // Fail-safe: if scan fails, mark as blocked
      return {
        provider: 'system',
        result: 'blocked',
        details: { error: error.message },
        scannedAt: new Date()
      };
    }
  }

  async scanWithClamAV(file) {
    return new Promise((resolve, reject) => {
      try {
        let filePath;
        
        if (file.localPath) {
          filePath = file.localPath;
        } else {
          // For S3 files, we'd need to download them first
          // This is a simplified implementation
          resolve(null);
          return;
        }

        const clamav = spawn('clamscan', ['--no-summary', filePath]);
        let output = '';
        let errorOutput = '';

        clamav.stdout.on('data', (data) => {
          output += data.toString();
        });

        clamav.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        clamav.on('close', (code) => {
          const scanResult = {
            provider: 'clamav',
            result: code === 0 ? 'clean' : 'infected',
            details: {
              exitCode: code,
              output: output.trim(),
              error: errorOutput.trim()
            },
            scannedAt: new Date()
          };

          resolve(scanResult);
        });

        clamav.on('error', (error) => {
          console.error('ClamAV scan error:', error);
          resolve(null); // Return null to try next scanner
        });

      } catch (error) {
        console.error('Error setting up ClamAV scan:', error);
        resolve(null);
      }
    });
  }

  async scanWithVirusTotal(file) {
    try {
      // This is a placeholder for VirusTotal integration
      // In production, you'd implement the actual VirusTotal API calls
      console.log('VirusTotal scanning not implemented yet');
      return null;
    } catch (error) {
      console.error('VirusTotal scan error:', error);
      return null;
    }
  }
}

const fileProcessor = new FileProcessor();

// Export processFile so fileProcessorQueue can call it directly
async function processFile(data) {
  return fileProcessor.processFile(data);
}

module.exports = { fileProcessor, processFile };
