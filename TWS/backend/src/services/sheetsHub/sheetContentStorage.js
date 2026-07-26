/**
 * Sheets Hub – S3-backed content blob storage for Univer IWorkbookData JSON.
 *
 * Content is deliberately never stored inline in Mongo (see OrgSheet.contentKey comment) —
 * this module is the only place that reads/writes those JSON blobs. Uses the same S3
 * client/bucket as the rest of the app (config/s3.js), not the separate USE_S3-gated
 * client in file.service.js, to stay consistent with how the Documents module is wired.
 */
const crypto = require('crypto');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../../config/s3');

/** Hard cap on a single sheet's serialized content size, regardless of storage backend. */
const MAX_CONTENT_BYTES = 30 * 1024 * 1024; // 30MB

function contentKeyFor(tenantId, orgId, sheetId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${tenantId}/${orgId}/sheets/${sheetId}/content-${timestamp}-${random}.json`;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * @returns {{ sizeBytes: number }}
 * @throws {Error & { code: 'CONTENT_TOO_LARGE' }} if the serialized payload exceeds MAX_CONTENT_BYTES
 */
async function putSheetContent(key, workbookData) {
  const body = JSON.stringify(workbookData ?? {});
  const sizeBytes = Buffer.byteLength(body, 'utf8');
  if (sizeBytes > MAX_CONTENT_BYTES) {
    const err = new Error(`Sheet content exceeds the ${MAX_CONTENT_BYTES / (1024 * 1024)}MB limit`);
    err.code = 'CONTENT_TOO_LARGE';
    throw err;
  }
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'application/json'
  }));
  return { sizeBytes };
}

async function getSheetContent(key) {
  if (!key) return null;
  const result = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  const buffer = await streamToBuffer(result.Body);
  return JSON.parse(buffer.toString('utf8'));
}

async function deleteSheetContent(key) {
  if (!key) return;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (err) {
    // Best-effort: an orphaned blob is a storage-cost issue, not a correctness issue — never fail the request over it.
    console.error('Error deleting sheet content blob from S3:', err);
  }
}

module.exports = {
  MAX_CONTENT_BYTES,
  contentKeyFor,
  putSheetContent,
  getSheetContent,
  deleteSheetContent
};
