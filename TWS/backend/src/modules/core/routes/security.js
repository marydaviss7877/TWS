const express = require('express');
const { body, query, param } = require('express-validator');
const { requirePermission, auditLog, logSecurityEvent, secureExport } = require('../../../middleware/security/security');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const AuditLog = require('../../../models/core/AuditLog');
const { 
  SecurityEvent, 
  RolePermission, 
  DataRetentionPolicy,
  ComplianceReport
} = require('../../../models/users-auth/Security');

const router = express.Router();

// ==================== AUDIT LOG ROUTES ====================

// Get audit logs
router.get('/audit-logs', [
  requirePermission('audit', 'read'),
  query('entityType').optional().isIn(['transaction', 'invoice', 'bill', 'journal_entry', 'project_costing', 'time_entry', 'vendor', 'client', 'chart_of_accounts', 'bank_account', 'integration']),
  query('action').optional().isIn(['create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import', 'sync', 'reconcile']),
  query('userId').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { orgId: req.user.orgId };
  
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.userId) filter.userId = req.query.userId;
  
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'fullName email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLog.countDocuments(filter);

  res.json({
    success: true,
    data: {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get audit log by ID
router.get('/audit-logs/:id', [
  requirePermission('audit', 'read'),
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const auditLog = await AuditLog.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  }).populate('userId', 'fullName email role');

  if (!auditLog) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found'
    });
  }

  res.json({
    success: true,
    data: { auditLog }
  });
}));

// Export audit logs
router.get('/audit-logs/export', [
  requirePermission('audit', 'export'),
  secureExport,
  query('format').isIn(['csv', 'json', 'pdf']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'fullName email role')
    .sort({ timestamp: -1 });

  const format = req.query.format;
  
  if (format === 'csv') {
    const csv = convertToCSV(auditLogs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
    res.json({ auditLogs });
  } else if (format === 'pdf') {
    // PDF generation would require a library like puppeteer or pdfkit
    res.status(501).json({
      success: false,
      message: 'PDF export not implemented'
    });
  }
}));

// ==================== SECURITY EVENTS ROUTES ====================

// Get security events
router.get('/security-events', [
  requirePermission('audit', 'read'),
  query('eventType').optional().isIn(['login', 'logout', 'failed_login', 'permission_denied', 'data_access', 'data_modification', 'export', 'integration_error', 'suspicious_activity']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('resolved').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { orgId: req.user.orgId };
  
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';

  const securityEvents = await SecurityEvent.find(filter)
    .populate('userId', 'fullName email role')
    .populate('resolvedBy', 'fullName email')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await SecurityEvent.countDocuments(filter);

  res.json({
    success: true,
    data: {
      securityEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Resolve security event
router.put('/security-events/:id/resolve', [
  requirePermission('audit', 'read'),
  param('id').isMongoId(),
  body('resolution').notEmpty().trim()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const securityEvent = await SecurityEvent.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    {
      resolved: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      resolution: req.body.resolution
    },
    { new: true }
  ).populate('userId', 'fullName email role');

  if (!securityEvent) {
    return res.status(404).json({
      success: false,
      message: 'Security event not found'
    });
  }

  res.json({
    success: true,
    message: 'Security event resolved successfully',
    data: { securityEvent }
  });
}));

// ==================== ROLE PERMISSIONS ROUTES ====================

// Get role permissions
router.get('/role-permissions', [
  requirePermission('audit', 'read')
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const rolePermissions = await RolePermission.find({ orgId: req.user.orgId });

  res.json({
    success: true,
    data: { rolePermissions }
  });
}));

// Update role permissions
router.put('/role-permissions/:role', [
  requirePermission('audit', 'read'),
  param('role').isIn(['owner', 'finance_manager', 'accountant', 'project_manager', 'people_ops', 'viewer', 'auditor']),
  body('permissions').isObject(),
  body('fieldRestrictions').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const rolePermission = await RolePermission.findOneAndUpdate(
    { role: req.params.role, orgId: req.user.orgId },
    {
      permissions: req.body.permissions,
      fieldRestrictions: req.body.fieldRestrictions || {}
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: 'Role permissions updated successfully',
    data: { rolePermission }
  });
}));

// ==================== DATA RETENTION ROUTES ====================

// Get data retention policies
router.get('/data-retention', [
  requirePermission('audit', 'read')
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const policies = await DataRetentionPolicy.find({ orgId: req.user.orgId });

  res.json({
    success: true,
    data: { policies }
  });
}));

// Update data retention policy
router.put('/data-retention/:entityType', [
  requirePermission('audit', 'read'),
  param('entityType').isIn(['transaction', 'invoice', 'bill', 'journal_entry', 'audit_log', 'integration_log']),
  body('retentionPeriod').isInt({ min: 0 }),
  body('archiveAfter').isInt({ min: 0 }),
  body('deleteAfter').isInt({ min: 0 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const policy = await DataRetentionPolicy.findOneAndUpdate(
    { entityType: req.params.entityType, orgId: req.user.orgId },
    {
      retentionPeriod: req.body.retentionPeriod,
      archiveAfter: req.body.archiveAfter,
      deleteAfter: req.body.deleteAfter,
      isActive: req.body.isActive !== false
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: 'Data retention policy updated successfully',
    data: { policy }
  });
}));

// Apply data retention policies
router.post('/data-retention/apply', [
  requirePermission('audit', 'read')
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const policies = await DataRetentionPolicy.find({ 
    orgId: req.user.orgId, 
    isActive: true 
  });

  const results = [];

  for (const policy of policies) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - policy.deleteAfter);

      let deletedCount = 0;
      
      switch (policy.entityType) {
        case 'transaction':
          const transactionResult = await require('../../../models/finance/Finance').Transaction.deleteMany({
            orgId: req.user.orgId,
            createdAt: { $lt: cutoffDate }
          });
          deletedCount = transactionResult.deletedCount;
          break;
        case 'invoice':
          const invoiceResult = await require('../../../models/finance/Finance').Invoice.deleteMany({
            orgId: req.user.orgId,
            createdAt: { $lt: cutoffDate }
          });
          deletedCount = invoiceResult.deletedCount;
          break;
        case 'audit_log':
          const auditResult = await AuditLog.deleteMany({
            orgId: req.user.orgId,
            timestamp: { $lt: cutoffDate }
          });
          deletedCount = auditResult.deletedCount;
          break;
        // Add other entity types as needed
      }

      results.push({
        entityType: policy.entityType,
        deletedCount,
        cutoffDate
      });

      // Update last applied date
      await DataRetentionPolicy.findByIdAndUpdate(policy._id, {
        lastApplied: new Date()
      });

    } catch (error) {
      results.push({
        entityType: policy.entityType,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: 'Data retention policies applied successfully',
    data: { results }
  });
}));

// ==================== COMPLIANCE REPORTS ROUTES ====================

// Get compliance reports
router.get('/compliance-reports', [
  requirePermission('audit', 'read'),
  query('reportType').optional().isIn(['sox', 'pci_dss', 'gdpr', 'iso27001', 'audit_trail', 'data_retention']),
  query('status').optional().isIn(['generating', 'completed', 'failed'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  
  if (req.query.reportType) filter.reportType = req.query.reportType;
  if (req.query.status) filter.status = req.query.status;

  const reports = await ComplianceReport.find(filter)
    .populate('generatedBy', 'fullName email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { reports }
  });
}));

// Generate compliance report
router.post('/compliance-reports/generate', [
  requirePermission('audit', 'read'),
  body('reportType').isIn(['sox', 'pci_dss', 'gdpr', 'iso27001', 'audit_trail', 'data_retention']),
  body('period.start').isISO8601(),
  body('period.end').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const report = new ComplianceReport({
    reportType: req.body.reportType,
    period: req.body.period,
    generatedBy: req.user._id,
    orgId: req.user.orgId
  });

  await report.save();

  // Generate report asynchronously
  setImmediate(async () => {
    try {
      const findings = await generateComplianceFindings(req.body.reportType, req.body.period, req.user.orgId);
      
      await ComplianceReport.findByIdAndUpdate(report._id, {
        status: 'completed',
        findings
      });
    } catch (error) {
      await ComplianceReport.findByIdAndUpdate(report._id, {
        status: 'failed',
        findings: [{ 
          category: 'Error', 
          severity: 'critical', 
          description: error.message,
          status: 'open'
        }]
      });
    }
  });

  res.status(201).json({
    success: true,
    message: 'Compliance report generation started',
    data: { report }
  });
}));

// Download compliance report
router.get('/compliance-reports/:id/download', [
  requirePermission('audit', 'export'),
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const report = await ComplianceReport.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Compliance report not found'
    });
  }

  if (report.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Report is not ready for download'
    });
  }

  // Generate and send the report file
  const reportData = {
    reportType: report.reportType,
    period: report.period,
    findings: report.findings,
    generatedAt: report.createdAt,
    generatedBy: report.generatedBy
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${report.reportType}-${Date.now()}.json"`);
  res.json(reportData);
}));

// ==================== SECURITY DASHBOARD ROUTES ====================

// Get security dashboard data
router.get('/dashboard', [
  requirePermission('audit', 'read')
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [
    totalAuditLogs,
    recentAuditLogs,
    securityEvents,
    criticalEvents,
    unresolvedEvents,
    userActivity
  ] = await Promise.all([
    AuditLog.countDocuments({ orgId: req.user.orgId }),
    AuditLog.countDocuments({ 
      orgId: req.user.orgId, 
      timestamp: { $gte: thirtyDaysAgo } 
    }),
    SecurityEvent.countDocuments({ 
      orgId: req.user.orgId, 
      timestamp: { $gte: thirtyDaysAgo } 
    }),
    SecurityEvent.countDocuments({ 
      orgId: req.user.orgId, 
      severity: 'critical',
      timestamp: { $gte: thirtyDaysAgo }
    }),
    SecurityEvent.countDocuments({ 
      orgId: req.user.orgId, 
      resolved: false 
    }),
    AuditLog.aggregate([
      { $match: { orgId: req.user.orgId, timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.json({
    success: true,
    data: {
      totalAuditLogs,
      recentAuditLogs,
      securityEvents,
      criticalEvents,
      unresolvedEvents,
      userActivity
    }
  });
}));

// Helper function to convert audit logs to CSV
function convertToCSV(auditLogs) {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'User Agent'];
  const rows = auditLogs.map(log => [
    log.timestamp.toISOString(),
    log.userEmail || 'Unknown',
    log.action,
    log.entityType,
    log.entityId || '',
    log.ipAddress || '',
    log.userAgent || ''
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(field => `"${field}"`).join(',')
  ).join('\n');
}

// Helper function to generate compliance findings
async function generateComplianceFindings(reportType, period, orgId) {
  const findings = [];
  
  switch (reportType) {
    case 'audit_trail':
      const auditLogCount = await AuditLog.countDocuments({
        orgId,
        timestamp: { $gte: new Date(period.start), $lte: new Date(period.end) }
      });
      
      if (auditLogCount === 0) {
        findings.push({
          category: 'Audit Trail',
          severity: 'high',
          description: 'No audit logs found for the specified period',
          recommendation: 'Ensure audit logging is enabled and functioning properly',
          status: 'open'
        });
      }
      break;
      
    case 'data_retention':
      const policies = await DataRetentionPolicy.find({ orgId, isActive: true });
      
      if (policies.length === 0) {
        findings.push({
          category: 'Data Retention',
          severity: 'medium',
          description: 'No data retention policies configured',
          recommendation: 'Configure data retention policies for all entity types',
          status: 'open'
        });
      }
      break;
      
    case 'sox':
      // SOX compliance checks
      const journalEntries = await require('../../../models/finance/Finance').JournalEntry.countDocuments({
        orgId,
        createdAt: { $gte: new Date(period.start), $lte: new Date(period.end) }
      });
      
      if (journalEntries === 0) {
        findings.push({
          category: 'SOX Compliance',
          severity: 'high',
          description: 'No journal entries found for the period',
          recommendation: 'Ensure all financial transactions are properly recorded',
          status: 'open'
        });
      }
      break;
  }
  
  return findings;
}

module.exports = router;
