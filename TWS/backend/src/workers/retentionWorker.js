/**
 * Retention Worker — BullMQ removed, replaced with node-cron.
 * Schedules data-retention enforcement for all active organizations.
 */
const cron = require('node-cron');

let retentionService, auditService, Organization;

function loadDeps() {
  if (!retentionService) {
    retentionService = require('../services/compliance/retention.service');
    Organization     = require('../models/org/Organization');
    try { auditService = require('../../services/compliance/audit.service'); } catch (_) {}
  }
}

async function _runJob(orgId, jobType) {
  loadDeps();
  try {
    let result;
    switch (jobType) {
      case 'soft_delete':       result = await retentionService.softDeleteExpiredMessages(orgId); break;
      case 'purge':             result = await retentionService.purgeDeletedMessages(orgId); break;
      case 'full_enforcement':  result = await retentionService.enforceRetentionPolicy(orgId); break;
      default: throw new Error(`Unknown retention job type: ${jobType}`);
    }
    if (auditService) {
      await auditService.logAdminEvent(
        auditService.auditActions?.DATA_PURGE,
        null, orgId,
        { reason: `Automated retention job completed: ${jobType}`, details: { jobType, result } }
      );
    }
    console.log(`✅ Retention [${jobType}] completed for org ${orgId}`);
    return result;
  } catch (error) {
    console.error(`❌ Retention [${jobType}] failed for org ${orgId}:`, error.message);
    if (auditService) {
      await auditService.logAdminEvent(
        auditService.auditActions?.DATA_PURGE,
        null, orgId,
        { reason: `Automated retention job failed: ${jobType}`, details: { jobType, error: error.message }, severity: 'error' }
      ).catch(() => {});
    }
  }
}

async function _runAllOrgs(jobType) {
  loadDeps();
  try {
    const orgs = await Organization.find({ status: 'active' }).select('_id');
    for (const org of orgs) await _runJob(org._id, jobType);
  } catch (error) {
    console.error(`Retention cron [${jobType}] error:`, error.message);
  }
}

// Daily soft-delete at 2 AM
cron.schedule('0 2 * * *', () => _runAllOrgs('soft_delete'));

// Weekly purge — Sunday 3 AM
cron.schedule('0 3 * * 0', () => _runAllOrgs('purge'));

// Monthly full enforcement — 1st of month 4 AM
cron.schedule('0 4 1 * *', () => _runAllOrgs('full_enforcement'));

console.log('✅ Retention worker started (node-cron: daily/weekly/monthly)');

module.exports = {
  retentionWorker: null, // no Worker object — kept for API compatibility
  scheduleRetentionJobs: async () => { /* handled by cron at startup */ },
  runImmediateEnforcement: async (orgId, jobType = 'full_enforcement') => _runJob(orgId, jobType),
  getJobStatus: async () => []
};
