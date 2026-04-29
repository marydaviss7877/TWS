/**
 * Generate Encryption Keys
 * Run: node scripts/generate-encryption-keys.js
 */

const crypto = require('crypto');

console.log('🔐 Generating Encryption Keys\n');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('Add these to your .env file:\n');
console.log('# Encryption');
console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);
console.log('⚠️  IMPORTANT: Keep these keys secure and never commit them to version control!');
