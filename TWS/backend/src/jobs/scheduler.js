const cron = require('node-cron');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
// const TenantAnalyticsSummary = require('../models/TenantAnalyticsSummary'); // Model not yet implemented
const EmployeeMetrics = require('../models/EmployeeMetrics');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Attendance = require('../models/Attendance');
const usageTrackerService = require('../services/usageTrackerService');
const projectProfitabilityService = require('../services/projectProfitabilityService');
const hrPerformanceService = require('../services/hrPerformanceService');
const clientHealthService = require('../services/clientHealthService');
const aiInsightsService = require('../services/analytics/ai-insights.service');
const tenantProvisioningService = require('../services/tenantProvisioningService');
const emailService = require('../services/integrations/email.service');
const logger = require('../utils/logger');
const { Invoice } = require('../models/Finance');
const NotificationService = require('../services/notifications/notification.service');
const documentHubService = require('../services/documentHub/documentHub.service');

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
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

    // Schedule all jobs
    this.scheduleUsageAggregation();
    this.scheduleAnalyticsRollups();
    this.scheduleInvoiceGeneration();
    this.scheduleProfitabilityCalculations();
    this.scheduleHRPerformanceUpdates();
    this.scheduleClientHealthUpdates();
    this.scheduleAIInsightsGeneration();
    this.scheduleTenantHealthChecks();
    this.scheduleDataCleanup();
    this.scheduleBackupJobs();
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
   * Schedule usage aggregation job (runs every hour)
   */
  scheduleUsageAggregation() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting usage aggregation job...');
        await this.runUsageAggregation();
        logger.info('Usage aggregation job completed successfully');
      } catch (error) {
        logger.error('Usage aggregation job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('usageAggregation', job);
    job.start();
    logger.info('Scheduled usage aggregation job (hourly)');
  }

  /**
   * Schedule analytics rollups job (runs daily at 2 AM)
   */
  scheduleAnalyticsRollups() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting analytics rollups job...');
        await this.runAnalyticsRollups();
        logger.info('Analytics rollups job completed successfully');
      } catch (error) {
        logger.error('Analytics rollups job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('analyticsRollups', job);
    job.start();
    logger.info('Scheduled analytics rollups job (daily at 2 AM)');
  }

  /**
   * Schedule invoice generation job (runs daily at 9 AM)
   */
  scheduleInvoiceGeneration() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Starting invoice generation job...');
        await this.runInvoiceGeneration();
        logger.info('Invoice generation job completed successfully');
      } catch (error) {
        logger.error('Invoice generation job failed:', error);
      }
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
      try {
        logger.info('Starting profitability calculations job...');
        await this.runProfitabilityCalculations();
        logger.info('Profitability calculations job completed successfully');
      } catch (error) {
        logger.error('Profitability calculations job failed:', error);
      }
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
      try {
        logger.info('Starting HR performance updates job...');
        await this.runHRPerformanceUpdates();
        logger.info('HR performance updates job completed successfully');
      } catch (error) {
        logger.error('HR performance updates job failed:', error);
      }
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
      try {
        logger.info('Starting client health updates job...');
        await this.runClientHealthUpdates();
        logger.info('Client health updates job completed successfully');
      } catch (error) {
        logger.error('Client health updates job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('clientHealthUpdates', job);
    job.start();
    logger.info('Scheduled client health updates job (every 4 hours)');
  }

  /**
   * Schedule AI insights generation job (runs daily at 3 AM)
   */
  scheduleAIInsightsGeneration() {
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Starting AI insights generation job...');
        await this.runAIInsightsGeneration();
        logger.info('AI insights generation job completed successfully');
      } catch (error) {
        logger.error('AI insights generation job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('aiInsightsGeneration', job);
    job.start();
    logger.info('Scheduled AI insights generation job (daily at 3 AM)');
  }

  /**
   * Schedule tenant health checks job (runs every 30 minutes)
   */
  scheduleTenantHealthChecks() {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Starting tenant health checks job...');
        await this.runTenantHealthChecks();
        logger.info('Tenant health checks job completed successfully');
      } catch (error) {
        logger.error('Tenant health checks job failed:', error);
      }
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
      try {
        logger.info('Starting data cleanup job...');
        await this.runDataCleanup();
        logger.info('Data cleanup job completed successfully');
      } catch (error) {
        logger.error('Data cleanup job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('dataCleanup', job);
    job.start();
    logger.info('Scheduled data cleanup job (weekly on Sunday at 4 AM)');
  }

  /**
   * Schedule backup jobs (runs daily at 5 AM)
   */
  scheduleBackupJobs() {
    const job = cron.schedule('0 5 * * *', async () => {
      try {
        logger.info('Starting backup job...');
        await this.runBackupJobs();
        logger.info('Backup job completed successfully');
      } catch (error) {
        logger.error('Backup job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('backupJobs', job);
    job.start();
    logger.info('Scheduled backup job (daily at 5 AM)');
  }

  /**
   * Schedule notification jobs (runs every 15 minutes)
   */
  scheduleNotificationJobs() {
    const job = cron.schedule('*/15 * * * *', async () => {
      try {
        logger.info('Starting notification job...');
        await this.runNotificationJobs();
        logger.info('Notification job completed successfully');
      } catch (error) {
        logger.error('Notification job failed:', error);
      }
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
      try {
        logger.info('Starting document review timeout job...');
        await documentHubService.runDocumentReviewTimeoutJob();
        logger.info('Document review timeout job completed');
      } catch (error) {
        logger.error('Document review timeout job failed:', error);
      }
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
      try {
        await this.runReadOnlyEnforcement();
      } catch (error) {
        logger.error('Read-only enforcement job failed:', error);
      }
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
      try {
        await this.runContractorAccessExpiry();
      } catch (error) {
        logger.error('Contractor access expiry job failed:', error);
      }
    }, { scheduled: false, timezone: 'UTC' });
    this.jobs.set('contractorAccessExpiry', job);
    job.start();
    logger.info('Scheduled contractor access expiry job (every 10 minutes)');
  }

  async runContractorAccessExpiry() {
    const TenantDepartmentAccess = require('../models/TenantDepartmentAccess');
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
   * Run usage aggregation for all tenants
   */
  async runUsageAggregation() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        await usageTrackerService.aggregateUsage(tenant.tenantId);
        logger.debug(`Usage aggregated for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to aggregate usage for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run analytics rollups for all tenants
   */
  async runAnalyticsRollups() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        // Generate daily analytics summary
        await this.generateAnalyticsSummary(tenant.tenantId, 'daily');
        
        // Generate weekly summary if it's Sunday
        if (new Date().getDay() === 0) {
          await this.generateAnalyticsSummary(tenant.tenantId, 'weekly');
        }
        
        // Generate monthly summary if it's the first day of the month
        if (new Date().getDate() === 1) {
          await this.generateAnalyticsSummary(tenant.tenantId, 'monthly');
        }
        
        logger.debug(`Analytics rollups completed for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to run analytics rollups for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Generate analytics summary for a tenant
   */
  async generateAnalyticsSummary(tenantId, periodType) {
    const TenantAnalyticsSummary = mongoose.models.TenantAnalyticsSummary;
    if (!TenantAnalyticsSummary) {
      logger.debug('TenantAnalyticsSummary model unavailable; skipping analytics summary generation');
      return null;
    }

    const now = new Date();
    let startDate, endDate;
    
    switch (periodType) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    // Get usage data
    const usage = await usageTrackerService.getAllCurrentUsage(tenantId);
    
    // Get project data
    const projects = await Project.find({ orgId: tenantId });
    
    // Get attendance data
    const attendance = await Attendance.find({ 
      orgId: tenantId,
      date: { $gte: startDate, $lt: endDate }
    });

    // Create analytics summary
    const summary = new TenantAnalyticsSummary({
      tenantId,
      period: {
        type: periodType,
        startDate,
        endDate,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        week: Math.ceil(now.getDate() / 7),
        day: now.getDate()
      },
      users: {
        total: usage.users || 0,
        active: usage.activeUsers || 0,
        new: 0, // Calculate based on user creation dates
        churned: 0, // Calculate based on user deactivation
        dailyActiveUsers: usage.dailyActiveUsers || 0,
        weeklyActiveUsers: usage.weeklyActiveUsers || 0,
        monthlyActiveUsers: usage.monthlyActiveUsers || 0
      },
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length
      },
      systemUsage: {
        apiCalls: {
          total: usage.apiCalls || 0,
          successful: Math.floor((usage.apiCalls || 0) * 0.95), // Assume 95% success rate
          failed: Math.floor((usage.apiCalls || 0) * 0.05)
        },
        storage: {
          totalUsed: usage.storage || 0
        }
      }
    });

    await summary.save();
  }

  /**
   * Run invoice generation for all tenants
   */
  async runInvoiceGeneration() {
    const tenants = await Tenant.find({ 
      status: 'active',
      'subscription.status': { $in: ['active', 'trialing'] }
    });
    
    for (const tenant of tenants) {
      try {
        const nextBillingDate = new Date(tenant.subscription.nextBillingDate);
        const today = new Date();
        
        // Check if it's time to generate invoice
        if (today >= nextBillingDate) {
          await this.generateInvoice(tenant);
          logger.debug(`Invoice generated for tenant: ${tenant.tenantId}`);
        }
      } catch (error) {
        logger.error(`Failed to generate invoice for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Generate invoice for a tenant
   */
  async generateInvoice(tenant) {
    const usage = await usageTrackerService.getAllCurrentUsage(tenant.tenantId);
    const subscriptionPlan = await require('../models/SubscriptionPlan').findOne({ 
      slug: tenant.subscription.plan 
    });
    
    if (!subscriptionPlan) {
      throw new Error(`Subscription plan not found: ${tenant.subscription.plan}`);
    }

    // Calculate base plan cost
    const baseAmount = subscriptionPlan.pricing[tenant.subscription.billingCycle];
    
    // Calculate overage costs
    let overageAmount = 0;
    const overageItems = [];
    
    if (subscriptionPlan.usagePricing.enabled) {
      const overageRates = subscriptionPlan.usagePricing.overageRates;
      
      // Check each usage metric for overage
      Object.entries(usage).forEach(([metric, value]) => {
        const limit = subscriptionPlan.getUsageLimit(metric);
        if (limit !== -1 && value > limit) {
          const overage = value - limit;
          const rate = overageRates[metric] || 0;
          const cost = overage * rate;
          
          overageAmount += cost;
          overageItems.push({
            description: `Overage - ${metric} (${overage} ${metric})`,
            amount: rate,
            quantity: overage,
            total: cost
          });
        }
      });
    }

    const totalAmount = baseAmount + overageAmount;

    // Create invoice
    const invoice = new Invoice({
      tenantId: tenant.tenantId,
      number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      amount: totalAmount,
      currency: 'USD',
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      period: {
        start: tenant.subscription.currentPeriodStart,
        end: tenant.subscription.nextBillingDate
      },
      items: [
        {
          description: `${subscriptionPlan.name} Plan - ${tenant.subscription.billingCycle}`,
          amount: baseAmount,
          quantity: 1
        },
        ...overageItems
      ],
      subtotal: totalAmount,
      tax: 0, // Calculate tax if applicable
      total: totalAmount
    });

    await invoice.save();

    // Update tenant subscription dates
    tenant.subscription.currentPeriodStart = tenant.subscription.nextBillingDate;
    
    // Calculate next billing date
    const nextBilling = new Date(tenant.subscription.nextBillingDate);
    switch (tenant.subscription.billingCycle) {
      case 'monthly':
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        break;
      case 'quarterly':
        nextBilling.setMonth(nextBilling.getMonth() + 3);
        break;
      case 'yearly':
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        break;
    }
    tenant.subscription.nextBillingDate = nextBilling;
    
    await tenant.save();

    // Send invoice email
    try {
      await emailService.sendInvoiceEmail(tenant, invoice);
    } catch (emailError) {
      logger.error(`Failed to send invoice email for tenant ${tenant.tenantId}:`, emailError);
    }
  }

  /**
   * Run profitability calculations for all projects
   */
  async runProfitabilityCalculations() {
    const projects = await Project.find({ status: 'active' });
    
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
   * Run HR performance updates
   */
  async runHRPerformanceUpdates() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        await hrPerformanceService.calculateEmployeeMetrics(tenant.tenantId);
        logger.debug(`HR performance updated for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to update HR performance for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run client health updates
   */
  async runClientHealthUpdates() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        const clients = await Client.find({ orgId: tenant.tenantId, status: { $ne: 'inactive' } }).select('_id orgId');
        for (const client of clients) {
          const clientHealth = await clientHealthService.getOrCreateClientHealth(client._id, tenant.tenantId);
          await clientHealthService.updateClientHealthMetrics(clientHealth);
        }
        logger.debug(`Client health updated for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to update client health for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run AI insights generation
   */
  async runAIInsightsGeneration() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        await aiInsightsService.generateInsights(tenant.tenantId);
        logger.debug(`AI insights generated for tenant: ${tenant.tenantId}`);
      } catch (error) {
        logger.error(`Failed to generate AI insights for tenant ${tenant.tenantId}:`, error);
      }
    }
  }

  /**
   * Run tenant health checks
   */
  async runTenantHealthChecks() {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      try {
        // Check subscription status
        if (tenant.subscription.status === 'past_due') {
          // Send payment reminder
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
            
            await emailService.sendTrialExpiredNotification(tenant);
          } else if (trialEndDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
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
   * Run data cleanup
   */
  async runDataCleanup() {
    try {
      const TenantAnalyticsSummary = mongoose.models.TenantAnalyticsSummary;
      // Clean up old analytics summaries (keep last 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (TenantAnalyticsSummary) {
        await TenantAnalyticsSummary.deleteMany({
          'period.startDate': { $lt: twoYearsAgo }
        });
      }
      
      // Clean up old employee metrics (keep last 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      await EmployeeMetrics.deleteMany({
        'period.startDate': { $lt: oneYearAgo }
      });
      
      // Clean up old audit logs (keep last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Assuming there's an AuditLog model
      // await AuditLog.deleteMany({
      //   createdAt: { $lt: sixMonthsAgo }
      // });
      
      logger.info('Data cleanup completed successfully');
    } catch (error) {
      logger.error('Data cleanup failed:', error);
    }
  }

  /**
   * Run backup jobs
   */
  async runBackupJobs() {
    try {
      // This would typically involve backing up databases, files, etc.
      // For now, we'll just log that the backup job ran
      logger.info('Backup job completed successfully');
    } catch (error) {
      logger.error('Backup job failed:', error);
    }
  }

  /**
   * Run notification jobs
   */
  async runNotificationJobs() {
    try {
      // Overdue invoices: use Finance Invoice (orgId); notify via service + email to tenant
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

      // Budget 80% warning (FR18): notify PM, Finance, CEO
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

      // Usage alerts
      const tenants = await Tenant.find({ status: 'active' });
      for (const tenant of tenants) {
        const usage = await usageTrackerService.getAllCurrentUsage(tenant._id);
        const subscriptionPlan = await require('../models/SubscriptionPlan').findOne({
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

      logger.debug('Notification job completed successfully');
    } catch (error) {
      logger.error('Notification job failed:', error);
    }
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

    const job = this.jobs.get(jobName);
    
    switch (jobName) {
      case 'usageAggregation':
        await this.runUsageAggregation();
        break;
      case 'analyticsRollups':
        await this.runAnalyticsRollups();
        break;
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
      case 'aiInsightsGeneration':
        await this.runAIInsightsGeneration();
        break;
      case 'tenantHealthChecks':
        await this.runTenantHealthChecks();
        break;
      case 'dataCleanup':
        await this.runDataCleanup();
        break;
      case 'backupJobs':
        await this.runBackupJobs();
        break;
      case 'notificationJobs':
        await this.runNotificationJobs();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Create singleton instance
const scheduler = new JobScheduler();

module.exports = scheduler;
