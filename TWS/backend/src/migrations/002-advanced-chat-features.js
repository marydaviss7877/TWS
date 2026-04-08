const mongoose = require('mongoose');

// Migration for advanced chat features
// This migration adds threading, pinning, archiving, and moderation features

const migration = {
  version: '002',
  description: 'Add advanced chat features: threading, pinning, archiving, moderation',
  
  async up(db) {
    console.log('Starting migration 002: Advanced chat features');
    
    // Update Messages collection
    console.log('Updating Messages collection...');
    
    // Add new fields to existing messages
    await db.collection('messages').updateMany(
      {},
      {
        $set: {
          // Threading fields
          parentMessageId: null,
          threadRootId: null,
          threadCount: 0,
          
          // Pinning fields
          pinned: false,
          pinnedAt: null,
          pinnedBy: null,
          
          // Moderation fields
          flagged: false,
          flaggedBy: [],
          moderationStatus: 'active',
          deletedBy: null
        }
      }
    );
    
    // Create indexes for Messages
    console.log('Creating indexes for Messages...');
    
    // Threading indexes
    await db.collection('messages').createIndex({ parentMessageId: 1 });
    await db.collection('messages').createIndex({ threadRootId: 1 });
    await db.collection('messages').createIndex({ chatId: 1, parentMessageId: 1, createdAt: 1 });
    
    // Pinning indexes
    await db.collection('messages').createIndex({ chatId: 1, pinned: 1, pinnedAt: -1 });
    
    // Moderation indexes
    await db.collection('messages').createIndex({ flagged: 1, 'flaggedBy.flaggedAt': -1 });
    await db.collection('messages').createIndex({ moderationStatus: 1 });
    await db.collection('messages').createIndex({ deleted: 1, deletedAt: -1 });
    
    // Update Chats collection
    console.log('Updating Chats collection...');
    
    await db.collection('chats').updateMany(
      {},
      {
        $set: {
          // Archiving fields
          archivedAt: null,
          archivedBy: null,
          
          // Moderation fields
          muted: false,
          mutedBy: null,
          mutedAt: null,
          muteReason: null
        }
      }
    );
    
    // Create AuditLog collection (skip if already exists, e.g. different options)
    console.log('Creating AuditLog collection...');
    const auditLogsExists = await db.listCollections({ name: 'auditlogs' }).hasNext();
    if (!auditLogsExists) {
      await db.createCollection('auditlogs', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['action', 'performedBy', 'organization'],
            properties: {
              action: { bsonType: 'string' },
              performedBy: { bsonType: 'objectId' },
              targetUser: { bsonType: ['objectId', 'null'] },
              targetMessage: { bsonType: ['objectId', 'null'] },
              targetChat: { bsonType: ['objectId', 'null'] },
              reason: { bsonType: ['string', 'null'] },
              details: { bsonType: 'object' },
              organization: { bsonType: 'objectId' },
              ipAddress: { bsonType: ['string', 'null'] },
              userAgent: { bsonType: ['string', 'null'] },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' }
            }
          }
        }
      });
    } else {
      console.log('  auditlogs collection already exists, skipping create.');
    }
    
    // Create indexes for AuditLog
    await db.collection('auditlogs').createIndex({ action: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ performedBy: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ targetUser: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ organization: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ createdAt: -1 });
    
    // Create UserBan collection
    console.log('Creating UserBan collection...');
    
    const userBanSchema = {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
      bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      reason: { type: String, required: true },
      banType: { type: String, enum: ['temporary', 'permanent'], default: 'temporary' },
      duration: { type: Number, default: 24 },
      expiresAt: Date,
      isActive: { type: Boolean, default: true },
      revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      revokedAt: Date,
      revokeReason: String,
      ipAddress: String,
      userAgent: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    };
    
    const userbansExists = await db.listCollections({ name: 'userbans' }).hasNext();
    if (!userbansExists) {
      await db.createCollection('userbans', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['user', 'organization', 'bannedBy', 'reason'],
            properties: {
              user: { bsonType: 'objectId' },
              organization: { bsonType: 'objectId' },
              bannedBy: { bsonType: 'objectId' },
              reason: { bsonType: 'string' },
              banType: { bsonType: 'string', enum: ['temporary', 'permanent'] },
              duration: { bsonType: 'number' },
              expiresAt: { bsonType: ['date', 'null'] },
              isActive: { bsonType: 'bool' },
              revokedBy: { bsonType: ['objectId', 'null'] },
              revokedAt: { bsonType: ['date', 'null'] },
              revokeReason: { bsonType: ['string', 'null'] },
              ipAddress: { bsonType: ['string', 'null'] },
              userAgent: { bsonType: ['string', 'null'] },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' }
            }
          }
        }
      });
    } else {
      console.log('  userbans collection already exists, skipping create.');
    }
    
    // Create indexes for UserBan
    await db.collection('userbans').createIndex({ user: 1, organization: 1, isActive: 1 });
    await db.collection('userbans').createIndex({ bannedBy: 1, createdAt: -1 });
    await db.collection('userbans').createIndex({ expiresAt: 1 });
    await db.collection('userbans').createIndex({ organization: 1, isActive: 1, createdAt: -1 });
    
    console.log('Migration 002 completed successfully');
  },
  
  async down(db) {
    console.log('Rolling back migration 002: Advanced chat features');
    
    // Remove new fields from Messages
    console.log('Removing new fields from Messages...');
    
    await db.collection('messages').updateMany(
      {},
      {
        $unset: {
          parentMessageId: '',
          threadRootId: '',
          threadCount: '',
          pinned: '',
          pinnedAt: '',
          pinnedBy: '',
          flagged: '',
          flaggedBy: '',
          moderationStatus: '',
          deletedBy: ''
        }
      }
    );
    
    // Drop new indexes from Messages
    console.log('Dropping new indexes from Messages...');
    
    try {
      await db.collection('messages').dropIndex({ parentMessageId: 1 });
      await db.collection('messages').dropIndex({ threadRootId: 1 });
      await db.collection('messages').dropIndex({ chatId: 1, parentMessageId: 1, createdAt: 1 });
      await db.collection('messages').dropIndex({ chatId: 1, pinned: 1, pinnedAt: -1 });
      await db.collection('messages').dropIndex({ flagged: 1, 'flaggedBy.flaggedAt': -1 });
      await db.collection('messages').dropIndex({ moderationStatus: 1 });
      await db.collection('messages').dropIndex({ deleted: 1, deletedAt: -1 });
    } catch (error) {
      console.log('Some indexes may not exist:', error.message);
    }
    
    // Remove new fields from Chats
    console.log('Removing new fields from Chats...');
    
    await db.collection('chats').updateMany(
      {},
      {
        $unset: {
          archivedAt: '',
          archivedBy: '',
          muted: '',
          mutedBy: '',
          mutedAt: '',
          muteReason: ''
        }
      }
    );
    
    // Drop new collections
    console.log('Dropping new collections...');
    
    try {
      await db.collection('auditlogs').drop();
      await db.collection('userbans').drop();
    } catch (error) {
      console.log('Collections may not exist:', error.message);
    }
    
    console.log('Migration 002 rollback completed');
  }
};

module.exports = migration;
