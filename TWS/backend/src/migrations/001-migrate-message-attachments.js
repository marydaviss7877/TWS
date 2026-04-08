const mongoose = require('mongoose');

/**
 * Migration: Convert legacy message attachments to new File model.
 * Skips gracefully if Message/File models do not exist (e.g. messaging feature removed).
 */
let Message;
let File;
try {
  Message = require('../models/Message');
  File = require('../models/File');
} catch (e) {
  Message = null;
  File = null;
}

const migration = {
  version: '001',
  name: 'migrate-message-attachments',
  description: 'Convert legacy message attachments to File model',

  async up(db) {
    if (!Message || !File) {
      console.log('  Message/File models not found (messaging may be removed), skipping.');
      return;
    }
    console.log('Running migration: Convert legacy message attachments to File model');
    const messagesWithAttachments = await Message.find({
      'attachments.0': { $exists: true },
      'attachments.fileId': { $exists: false }
    });
    console.log(`  Found ${messagesWithAttachments.length} messages with legacy attachments`);
    let migratedCount = 0;
    for (const message of messagesWithAttachments) {
      try {
        const newAttachments = [];
        for (const attachment of message.attachments) {
          if (attachment.fileId) {
            newAttachments.push(attachment);
            continue;
          }
          const file = new File({
            chatId: message.chatId,
            uploaderId: message.sender,
            filename: attachment.filename || 'unknown',
            originalName: attachment.filename || 'unknown',
            mimeType: attachment.mimeType || 'application/octet-stream',
            size: attachment.size || 0,
            status: 'ready',
            metadata: { legacyUrl: attachment.url, migratedFrom: 'legacy_attachment', migratedAt: new Date() }
          });
          if (attachment.mimeType) {
            if (attachment.mimeType.startsWith('image/')) file.metadata.category = 'image';
            else if (attachment.mimeType.startsWith('video/')) file.metadata.category = 'video';
            else if (attachment.mimeType.startsWith('audio/')) file.metadata.category = 'audio';
            else if (attachment.mimeType.includes('pdf') || attachment.mimeType.includes('document')) file.metadata.category = 'document';
          }
          await file.save();
          newAttachments.push({
            type: file.metadata.category || 'file',
            fileId: file._id,
            filename: attachment.filename,
            url: attachment.url,
            size: attachment.size,
            mimeType: attachment.mimeType
          });
        }
        await Message.findByIdAndUpdate(message._id, { attachments: newAttachments });
        migratedCount++;
      } catch (error) {
        console.error(`  Error migrating message ${message._id}:`, error.message);
      }
    }
    console.log(`  Migrated ${migratedCount} messages`);
  },

  async down(db) {
    if (!Message || !File) {
      console.log('  Message/File models not found, skipping rollback.');
      return;
    }
    console.log('Rollback: Restore legacy message attachments');
    const messagesWithFileAttachments = await Message.find({ 'attachments.fileId': { $exists: true } });
    console.log(`  Found ${messagesWithFileAttachments.length} messages with File attachments`);
    let rolledBackCount = 0;
    for (const message of messagesWithFileAttachments) {
      try {
        const legacyAttachments = [];
        for (const attachment of message.attachments) {
          if (attachment.fileId) {
            const file = await File.findById(attachment.fileId);
            if (file && file.metadata && file.metadata.legacyUrl) {
              legacyAttachments.push({
                filename: file.originalName,
                url: file.metadata.legacyUrl,
                size: file.size,
                mimeType: file.mimeType
              });
              if (file.metadata.migratedFrom === 'legacy_attachment') await File.findByIdAndDelete(file._id);
            } else {
              legacyAttachments.push(attachment);
            }
          } else {
            legacyAttachments.push(attachment);
          }
        }
        await Message.findByIdAndUpdate(message._id, { attachments: legacyAttachments });
        rolledBackCount++;
      } catch (error) {
        console.error(`  Error rolling back message ${message._id}:`, error.message);
      }
    }
    console.log(`  Rolled back ${rolledBackCount} messages`);
  }
};

module.exports = migration;
