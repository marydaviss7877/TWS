/**
 * Usage Tracker Service
 * Tracks system usage and tenant resource counts for plan limits.
 * Policy: sum usage across all organizations belonging to the tenant (see plan 1c).
 * Active projects = status not in ['cancelled', 'archived'] (see plan 1b).
 */

const mongoose = require('mongoose');
const Organization = require('../models/org/Organization');
const TenantUser = require('../models/tenant/TenantUser');
const Project = require('../models/project-delivery/Project');
const Workspace = require('../models/org/Workspace');
const Client = require('../models/industry/Client');
const OrgDocument = require('../models/documents/OrgDocument');
const OrgSheet = require('../models/sheets/OrgSheet');

class UsageTrackerService {
  constructor() {
    this.initialized = false;
    this.usageData = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Resolve tenant's organization IDs (sum-across-orgs policy).
   * @param {string|ObjectId} tenantId
   * @returns {Promise<ObjectId[]>}
   */
  async _getTenantOrgIds(tenantId) {
    const id = typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const orgs = await Organization.find({ tenantId: id }).select('_id').lean();
    return orgs.map(o => o._id);
  }

  /**
   * Get current usage for a single metric (DB-backed).
   * @param {string|ObjectId} tenantId - Tenant _id
   * @param {string} metric - 'users' | 'projects' | 'workspaces' | 'clientAccounts' | 'storage'
   * @returns {Promise<number>}
   */
  async getCurrentUsage(tenantId, metric) {
    if (!tenantId) return 0;
    const id = typeof tenantId === 'string' ? new mongoose.Types.ObjectId(tenantId) : tenantId;

    switch (metric) {
      case 'users': {
        const n = await TenantUser.countDocuments({ tenantId: id, status: 'active' });
        return n;
      }
      case 'projects': {
        const orgIds = await this._getTenantOrgIds(id);
        if (orgIds.length === 0) return 0;
        const n = await Project.countDocuments({
          orgId: { $in: orgIds },
          status: { $nin: ['cancelled', 'archived'] }
        });
        return n;
      }
      case 'workspaces': {
        const orgIds = await this._getTenantOrgIds(id);
        if (orgIds.length === 0) return 0;
        const n = await Workspace.countDocuments({ orgId: { $in: orgIds }, status: 'active' });
        return n;
      }
      case 'clientAccounts': {
        const orgIds = await this._getTenantOrgIds(id);
        if (orgIds.length === 0) return 0;
        const n = await Client.countDocuments({ orgId: { $in: orgIds } });
        return n;
      }
      case 'storage': {
        const [documentTotal, sheetTotal] = await Promise.all([
          OrgDocument.aggregate([
            { $match: { tenantId: id } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$fileSize', 0] } } } }
          ]),
          // Sheets: uploaded files (fileSize) + in-app editable content persisted to S3 (contentSize)
          OrgSheet.aggregate([
            { $match: { tenantId: id } },
            { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$fileSize', 0] }, { $ifNull: ['$contentSize', 0] }] } } } }
          ])
        ]);
        const documentBytes = (documentTotal[0] && documentTotal[0].total) ? documentTotal[0].total : 0;
        const sheetBytes = (sheetTotal[0] && sheetTotal[0].total) ? sheetTotal[0].total : 0;
        return documentBytes + sheetBytes;
      }
      default:
        return 0;
    }
  }

  /**
   * Get all current usage metrics for a tenant (for 80% warning / subscription info).
   * @param {string|ObjectId} tenantId
   * @returns {Promise<{ users: number, projects: number, workspaces: number, clientAccounts: number, storage: number }>}
   */
  async getAllCurrentUsage(tenantId) {
    const [users, projects, workspaces, clientAccounts, storage] = await Promise.all([
      this.getCurrentUsage(tenantId, 'users'),
      this.getCurrentUsage(tenantId, 'projects'),
      this.getCurrentUsage(tenantId, 'workspaces'),
      this.getCurrentUsage(tenantId, 'clientAccounts'),
      this.getCurrentUsage(tenantId, 'storage')
    ]);
    return { users, projects, workspaces, clientAccounts, storage };
  }

  /**
   * No-op for backward compatibility with featureGate (rate limit tracking).
   */
  async trackUsage(tenantId, metric, amount = 1) {
    return;
  }

  /**
   * No-op; featureGate may call this for rate limit checks.
   */
  async getRateLimitUsage(tenantId, path) {
    return 0;
  }

  /**
   * No-op; featureGate may call this.
   */
  async trackRateLimitUsage(tenantId, path, windowMs) {
    return;
  }

  async trackActivity(userId, activity, metadata = {}) {
    if (!this.initialized) return;
    const activityData = { userId, activity, metadata, timestamp: new Date().toISOString() };
    if (!this.usageData.has(userId)) this.usageData.set(userId, []);
    this.usageData.get(userId).push(activityData);
    return activityData;
  }

  async getUsageStats(userId = null) {
    if (userId) {
      return {
        userId,
        activities: this.usageData.get(userId) || [],
        totalActivities: (this.usageData.get(userId) || []).length
      };
    }
    return {
      totalUsers: this.usageData.size,
      totalActivities: Array.from(this.usageData.values()).reduce((sum, activities) => sum + activities.length, 0),
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck() {
    return this.initialized;
  }

  async getMetrics() {
    return {
      status: 'active',
      initialized: this.initialized,
      trackedUsers: this.usageData.size,
      totalActivities: Array.from(this.usageData.values()).reduce((sum, activities) => sum + activities.length, 0)
    };
  }

  shutdown() {
    this.usageData.clear();
    this.initialized = false;
  }
}

module.exports = new UsageTrackerService();
