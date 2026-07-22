const cron = require('node-cron');
const Tenant = require('../models/tenant/Tenant');
const Organization = require('../models/org/Organization');
const EmployeeMetrics = require('../models/hr-payroll/EmployeeMetrics');
const Employee = require('../models/hr-payroll/Employee');
const Project = require('../models/project-delivery/Project');
const Client = require('../models/industry/Client');
const usageTrackerService = require('../services/usageTrackerService');
const projectProfitabilityService = require('../services/projectProfitabilityService');
const hrPerformanceService = require('../services/hrPerformanceService');
const clientHealthService = require('../services/clientHealthService');
const billingEngineService = require('../services/finance/billing-engine.service');
const emailService = require('../services/integrations/email.service');
const logger = require('../utils/logger');
const { Invoice } = require('../models/finance/Finance');
const NotificationService = require('../services/notifications/notification.service');
const documentHubService = require('../services/documentHub/documentHub.service');

/**
 * Resolve the Organization ObjectIds that belong to a tenant.
 * Tenant.tenantId is a string slug, NOT the FK other collections use —
 * every tenant-scoped collection's orgId points at Organization._id, and
 * Organization.tenantId points at Tenant._id. Never filter orgId by tenant.tenantId directly.
 */
async function resolveOrgIdsForTenant(tenant) {
  return Organization.find({ tenantId: tenant._id }).distinct('_id');
}

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.runningJobNames = new Set();
  }

  /**
   * Wrap a job body so a slow-running execution can't overlap with its own next tick.
   * In-process only: Redis is a stubbed in-memory mock in this codebase (src/config/redis.js),
   * so this does not protect against multiple replicas. Fine today (single Railway instance);
   * revisit with a real distributed lock before scaling out.
   */
  async runExclusive(jobName, fn) {
    if (this.runningJobNames.has(jobName)) {
      logger.warn(`Skipping ${jobName}: previous run still in progress`);
      return;
    }
    this.runningJobNames.add(jobName);
    try {
      await fn();
    } finally {
      this.runningJobNames.delete(jobName);
    }
  }

  /**
   * Start the job scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Job scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting job scheduler...');

    // Usage aggregation, analytics rollups, AI insights generation, and backup jobs
    // were removed here (not just disabled) — each called into a feature that was
    // never actually built:
    //   - usage aggregation: no persisted usage-rollup model exists anywhere
    //   - analytics rollups: wrote to a TenantAnalyticsSummary model that was never created
    //   - AI insights: no real LLM integration exists; the "real" method returned hardcoded mock text
    //   - backups: handler was a log line, no backup routine of any kind
    // Re-add them once the underlying feature (persisted usage/analytics model, real
    // AI integration, real backup target) actually exists.
    this.scheduleInvoiceGeneration();
    this.scheduleProfitabilityCalculations();
    this.scheduleHRPerformanceUpdates();
    this.scheduleClientHealthUpdates();
    this.scheduleTenantHealthChecks();
    this.scheduleDataCleanup();
    this.scheduleNotificationJobs();
    this.scheduleDocumentReviewTimeout();
    this.scheduleReadOnlyEnforcement();
    this.scheduleContractorAccessExpiry();

    logger.info('Job scheduler started successfully');
  }

  /**
   * Stop the job scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Job scheduler is not running');
      return;
    }

    this.isRunning = false;

    // Stop all scheduled jobs
    this.jobs.forEach((job, name) => {
      job.destroy();
      logger.info(`Stopped job: ${name}`);
    });

    this.jobs.clear();
    logger.info('Job scheduler stopped');
  }

  /**
   * Schedule invoice generation job (runs daily at 9 AM)
   */
  scheduleInvoiceGeneration() {
    const job = cron.schedule('0 9 * * *', async () => {
      if (process.env.JOBS_INVOICE_GENERATION_ENABLED === 'false') {
        logger.debug('Invoice generation job skipped (JOBS_INVOICE_GENERATION_ENABLED=false)');
        return;
      }
      await this.runExclusive('invoiceGeneration', async () => {
        try {
          logger.info('Starting invoice generation job...');
          await this.runInvoiceGeneration();
          logger.info('Invoice generation job completed successfully');
        } catch (error) {
          logger.error('Invoice generation job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('invoiceGeneration', job);
    job.start();
    logger.info('Scheduled invoice generation job (daily at 9 AM)');
  }

  /**
   * Schedule profitability calculations job (runs every 6 hours)
   */
  scheduleProfitabilityCalculations() {
    const job = cron.schedule('0 */6 * * *', async () => {
      await this.runExclusive('profitabilityCalculations', async () => {
        try {
          logger.info('Starting profitability calculations job...');
          await this.runProfitabilityCalculations();
          logger.info('Profitability calculations job completed successfully');
        } catch (error) {
          logger.error('Profitability calculations job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('profitabilityCalculations', job);
    job.start();
    logger.info('Scheduled profitability calculations job (every 6 hours)');
  }

  /**
   * Schedule HR performance updates job (runs daily at 1 AM)
   */
  scheduleHRPerformanceUpdates() {
    const job = cron.schedule('0 1 * * *', async () => {
      await this.runExclusive('hrPerformanceUpdates', async () => {
        try {
          logger.info('Starting HR performance updates job...');
          await this.runHRPerformanceUpdates();
          logger.info('HR performance updates job completed successfully');
        } catch (error) {
          logger.error('HR performance updates job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('hrPerformanceUpdates', job);
    job.start();
    logger.info('Scheduled HR performance updates job (daily at 1 AM)');
  }

  /**
   * Schedule client health updates job (runs every 4 hours)
   */
  scheduleClientHealthUpdates() {
    const job = cron.schedule('0 */4 * * *', async () => {
      await this.runExclusive('clientHealthUpdates', async () => {
        try {
          logger.info('Starting client health updates job...');
          await this.runClientHealthUpdates();
          logger.info('Client health updates job completed successfully');
        } catch (error) {
          logger.error('Client health updates job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('clientHealthUpdates', job);
    job.start();
    logger.info('Scheduled client health updates job (every 4 hours)');
  }

  /**
   * Schedule tenant health checks job (runs every 30 minutes)
   */
  scheduleTenantHealthChecks() {
    const job = cron.schedule('*/30 * * * *', async () => {
      await this.runExclusive('tenantHealthChecks', async () => {
        try {
          logger.info('Starting tenant health checks job...');
          await this.runTenantHealthChecks();
          logger.info('Tenant health checks job completed successfully');
        } catch (error) {
          logger.error('Tenant health checks job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('tenantHealthChecks', job);
    job.start();
    logger.info('Scheduled tenant health checks job (every 30 minutes)');
  }

  /**
   * Schedule data cleanup job (runs weekly on Sunday at 4 AM)
   */
  scheduleDataCleanup() {
    const job = cron.schedule('0 4 * * 0', async () => {
      await this.runExclusive('dataCleanup', async () => {
        try {
          logger.info('Starting data cleanup job...');
          await this.runDataCleanup();
          logger.info('Data cleanup job completed successfully');
        } catch (error) {
          logger.error('Data cleanup job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('dataCleanup', job);
    job.start();
    logger.info('Scheduled data cleanup job (weekly on Sunday at 4 AM)');
  }

  /**
   * Schedule notification jobs (runs every 15 minutes)
   */
  scheduleNotificationJobs() {
    const job = cron.schedule('*/15 * * * *', async () => {
      await this.runExclusive('notificationJobs', async () => {
        try {
          logger.info('Starting notification job...');
          await this.runNotificationJobs();
          logger.info('Notification job completed successfully');
        } catch (error) {
          logger.error('Notification job failed:', error);
        }
      });
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('notificationJobs', job);
    job.start();
    logger.info('Scheduled notification job (every 15 minutes)');
  }

  /**
   * Schedule document review timeout (FR26): 7/14-day reminders for documents in review. Run daily.
   */
  scheduleDocumentReviewTimeout() {
    const job = cron.schedule('0 8 * * *', async () => {
      await this.runExclusive('documentReviewTimeout', async () => {
        try {
          logger.info('Starting document review timeout job...');
          await documentHubService.runDocumentReviewTimeoutJob();
          logger.info('Document review timeout job completed');
        } catch (error) {
          logger.error('Document review timeout job failed:', error);
        }
      });
    }, { scheduled: false, timezone: 'UTC' });
    this.jobs.set('documentReviewTimeout', job);
    job.start();
    logger.info('Scheduled document review timeout job (daily 08:00 UTC)');
  }

  /**
   * Schedule job: set readOnlyMode for tenants with paymentFailedAt > 7 days ago (Software House billing).
   */
  scheduleReadOnlyEnforcement() {
    const job = cron.schedule('0 */6 * * *', async () => {
      await this.runExclusive('readOnlyEnforcement', async () => {
        try {
          await this.runReadOnlyEnforcement();
        } catch (error) {
          logger.error('Read-only enforcement job failed:', error);
        }
      });
    }, { scheduled: false, timezone: 'UTC' });
    this.jobs.set('readOnlyEnforcement', job);
    job.start();
    logger.info('Scheduled read-only enforcement job (every 6 hours)');
  }

  /**
   * Contractor/auditor access expiry (UPR Phase 4.1).
   * Every 10 min: mark expired TenantDepartmentAccess, invalidate cache + revocation list.
   */
  scheduleContractorAccessExpiry() {
    const job = cron.schedule('*/10 * * * *', async () => {
      await this.runExclusive('contractorAccessExpiry', async () => {
        try {
          await this.runContractorAccessExpiry();
        } catch (error) {
          logger.error('Contractor access expiry job failed:', error);
        }
      });
    }, { scheduled: false, timezone: 'UTC' });
    this.jobs.set('contractorAccessExpiry', job);
    job.start();
    logger.info('Scheduled contractor access expiry job (every 10 minutes)');
  }

  async runContractorAccessExpiry() {
    const TenantDepartmentAccess = require('../models/tenant/TenantDepartmentAccess');
    const { invalidateResolvedPermissions } = require('../services/tenant/permissionResolver.service');
    const toExpire = await TenantDepartmentAccess.find({
      status: 'active',
      expiresAt: { $lt: new Date() }
    })
      .select('tenantId userId')
      .lean();
    if (toExpire.length === 0) return;
    const seen = new Set();
    const pairs = [];
    for (const r of toExpire) {
      const t = r.tenantId?.toString?.();
      const u = r.userId?.toString?.();
      if (t && u) {
        const key = t + ':' + u;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ tenantId: t, userId: u });
        }
      }
    }
    const result = await TenantDepartmentAccess.cleanupExpired();
    for (const { tenantId, userId } of pairs) {
      await invalidateResolvedPermissions(tenantId, userId, { addRevoked: true });
    }
    if (result.modifiedCount > 0) {
      logger.info(`Contractor access expiry: marked ${result.modifiedCount} record(s) expired, invalidated ${pairs.length} user(s)`);
    }
  }

  async runReadOnlyEnforcement() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await Tenant.updateMany(
      {
        erpCategory: 'software_house',
        'subscription.paymentFailedAt': { $exists: true, $ne: null, $lte: sevenDaysAgo },
        'subscription.readOnlyMode': { $ne: true }
      },
      { $set: { 'subscription.readOnlyMode': true } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Read-only mode enabled for ${result.modifiedCount} tenant(s) (payment failed >7 days ago)`);
    }
  }

  /**
   * Run invoice generation for all active tenants' orgs, via the existing
   * (previously unused) billing engine — it builds schema-valid invoices,
   * unlike the hand-rolled version this replaced.
   */
  async runInvoiceGeneration() {
    const tenants = await Tenant.find({
      status: 'active',
      'subscription.status': { $in: ['active', 'trialing'] }
    });

    for (const tenant of tenants) {
      try {
        const orgIds = await resolveOrgIdsForTenant(tenant);
        for (const orgId of orgIds) {
          const generated = await billingEngineService.processRecurringInvoices(orgId);
          if (generated?.length) {
            logger.debug(`Generated ${generated.length} invoice(s) for org ${orgId} (tenant ${tenant.tenantId})`);
          }
        }
      } catch (error) {
        logger.error(`Failed to generate invoices for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run profitability calculations for active projects belonging to active tenants
   */
  async runProfitabilityCalculations() {
    const tenants = await Tenant.find({ status: 'active' });
    const orgIdLists = await Promise.all(tenants.map(t => resolveOrgIdsForTenant(t)));
    const orgIds = orgIdLists.flat();
    const projects = await Project.find({ status: 'active', orgId: { $in: orgIds } });

    for (const project of projects) {
      try {
        await projectProfitabilityService.calculateProjectProfitability(project._id);
        logger.debug(`Profitability calculated for project: ${project._id}`);
      } catch (error) {
        logger.error(`Failed to calculate profitability for project ${project._id}:`, error);
      }
    }
  }

  /**
   * Run HR performance updates: compute each active tenant's employees' metrics
   * and upsert a daily EmployeeMetrics snapshot (previously computed but never persisted).
   */
  async runHRPerformanceUpdates() {
    const tenants = await Tenant.find({ status: 'active' });

    for (const tenant of tenants) {
      try {
        const orgIds = await resolveOrgIdsForTenant(tenant);
        const employees = await Employee.find({ orgId: { $in: orgIds }, userId: { $exists: true } })
          .populate('userId', 'fullName email');

        for (const employee of employees) {
          const metrics = await hrPerformanceService.calculateEmployeeMetrics(employee, employee.orgId);
          if (metrics.error) {
            logger.warn(`Skipping metrics persist for employee ${employee.employeeId}: ${metrics.error}`);
            continue;
          }
          await this.persistEmployeeMetrics(employee, metrics);
        }

        logger.debug(`HR performance updated for tenant: ${tenant.tenantId} (${employees.length} employee(s))`);
      } catch (error) {
        logger.error(`Failed to update HR performance for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Upsert a daily EmployeeMetrics snapshot from hrPerformanceService's computed metrics.
   */
  async persistEmployeeMetrics(employee, metrics) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    await EmployeeMetrics.findOneAndUpdate(
      { employeeId: employee.employeeId, 'period.type': 'daily', 'period.startDate': startDate },
      {
        employeeId: employee.employeeId,
        userId: employee.userId._id,
        orgId: employee.orgId,
        period: {
          type: 'daily',
          startDate,
          endDate,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate()
        },
        attendance: {
          totalHoursWorked: metrics.totalHours
        },
        productivity: {
          overallScore: metrics.productivityScore,
          billableUtilization: metrics.billableUtilization,
          billableHours: metrics.billableHours
        },
        projectPerformance: {
          activeProjects: metrics.activeProjects,
          completedProjects: metrics.completedProjects
        },
        financial: {
          revenueGenerated: metrics.revenueGenerated,
          costToCompany: metrics.totalCost,
          costPerHour: metrics.costPerHour
        },
        calculatedAt: now
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  /**
   * Run client health updates for active tenants' clients
   */
  async runClientHealthUpdates() {
    const tenants = await Tenant.find({ status: 'active' });

    for (const tenant of tenants) {
      try {
        const orgIds = await resolveOrgIdsForTenant(tenant);
        const clients = await Client.find({ orgId: { $in: orgIds }, status: { $ne: 'inactive' } }).select('_id orgId');
        for (const client of clients) {
          const clientHealth = await clientHealthService.getOrCreateClientHealth(client._id, client.orgId);
          await clientHealthService.updateClientHealthMetrics(clientHealth);
        }
        logger.debug(`Client health updated for tenant: ${tenant.tenantId} (${clients.length} client(s))`);
      } catch (error) {
        logger.error(`Failed to update client health for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run tenant health checks. Suspension on trial expiry always runs; the
   * notification emails are gated by JOBS_TENANT_HEALTH_EMAILS_ENABLED (default on)
   * so they can be killed instantly without touching the state-change logic.
   */
  async runTenantHealthChecks() {
    const tenants = await Tenant.find({ status: 'active' });
    const emailsEnabled = process.env.JOBS_TENANT_HEALTH_EMAILS_ENABLED !== 'false';

    for (const tenant of tenants) {
      try {
        // Check subscription status
        if (tenant.subscription.status === 'past_due' && emailsEnabled) {
          await emailService.sendPaymentReminder(tenant);
        }

        // Check trial expiration
        if (tenant.subscription.status === 'trialing') {
          const trialEndDate = new Date(tenant.subscription.trialEndDate);
          const now = new Date();

          if (now > trialEndDate) {
            // Trial expired, suspend tenant
            tenant.subscription.status = 'suspended';
            await tenant.save();

            if (emailsEnabled) {
              await emailService.sendTrialExpiredNotification(tenant);
            }
          } else if (trialEndDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && emailsEnabled) {
            // Trial expires in 24 hours
            await emailService.sendTrialExpiringNotification(tenant);
          }
        }

        logger.debug(`Health check completed for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to run health check for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run data cleanup: purge old EmployeeMetrics snapshots (keep last 1 year)
   */
  async runDataCleanup() {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      await EmployeeMetrics.deleteMany({
        'period.startDate': { $lt: oneYearAgo }
      });

      logger.info('Data cleanup completed successfully');
    } catch (error) {
      logger.error('Data cleanup failed:', error);
    }
  }

  /**
   * Run notification jobs. Each concern gets its own try/catch so a failure in
   * one (e.g. a malformed record) can't silently cancel the other two for this cycle.
   */
  async runNotificationJobs() {
    // Overdue invoices: use Finance Invoice (orgId); notify via service + email to tenant
    try {
      const overdueInvoices = await Invoice.find({
        status: { $in: ['sent', 'overdue'] },
        dueDate: { $lt: new Date() }
      }).lean();

      for (const invoice of overdueInvoices) {
        const tenant = await Tenant.findOne({ organizationId: invoice.orgId }).lean();
        if (tenant) {
          await emailService.sendOverdueInvoiceNotification(tenant, invoice);
        }
        await NotificationService.notifyInvoiceOverdue(invoice);
      }
    } catch (error) {
      logger.error('Notification job (overdue invoices) failed:', error);
    }

    // Budget 80% warning (FR18): notify PM, Finance, CEO
    try {
      const projects = await Project.find({
        'budget.total': { $gt: 0 },
        status: { $in: ['active', 'in_progress'] }
      }).lean();
      for (const project of projects) {
        const total = project.budget?.total || 0;
        const spent = project.budget?.spent || 0;
        if (total > 0 && spent / total >= 0.8) {
          await NotificationService.notifyBudget80Warning(project, project.orgId);
        }
      }
    } catch (error) {
      logger.error('Notification job (budget warnings) failed:', error);
    }

    // Usage alerts
    try {
      const tenants = await Tenant.find({ status: 'active' });
      for (const tenant of tenants) {
        const usage = await usageTrackerService.getAllCurrentUsage(tenant._id);
        const subscriptionPlan = await require('../models/finance/SubscriptionPlan').findOne({
          slug: tenant.subscription?.plan
        });
        if (subscriptionPlan) {
          for (const [metric, value] of Object.entries(usage || {})) {
            const limit = subscriptionPlan.getUsageLimit(metric);
            if (limit !== -1 && limit !== undefined && value > limit * 0.9) {
              await emailService.sendUsageAlert(tenant, metric, value, limit);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Notification job (usage alerts) failed:', error);
    }

    logger.debug('Notification job completed');
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job not found: ${jobName}`);
    }

    switch (jobName) {
      case 'invoiceGeneration':
        await this.runInvoiceGeneration();
        break;
      case 'profitabilityCalculations':
        await this.runProfitabilityCalculations();
        break;
      case 'hrPerformanceUpdates':
        await this.runHRPerformanceUpdates();
        break;
      case 'clientHealthUpdates':
        await this.runClientHealthUpdates();
        break;
      case 'tenantHealthChecks':
        await this.runTenantHealthChecks();
        break;
      case 'dataCleanup':
        await this.runDataCleanup();
        break;
      case 'notificationJobs':
        await this.runNotificationJobs();
        break;
      case 'documentReviewTimeout':
        await documentHubService.runDocumentReviewTimeoutJob();
        break;
      case 'readOnlyEnforcement':
        await this.runReadOnlyEnforcement();
        break;
      case 'contractorAccessExpiry':
        await this.runContractorAccessExpiry();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Create singleton instance
const scheduler = new JobScheduler();

module.exports = scheduler;
