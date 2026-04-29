const express = require('express');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const AttendanceIntegrationService = require('../../../services/attendanceIntegrationService');

const router = express.Router();

// Sync attendance with payroll
router.post('/payroll/sync', [
  attendanceWrite,
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const result = await AttendanceIntegrationService.syncWithPayroll(
      req.user.organizationId,
      { startDate, endDate }
    );

    res.json({
      success: true,
      message: 'Payroll sync completed successfully',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Generate HR reports
router.get('/hr/reports/:reportType', [
  attendanceRead,
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('department').optional().notEmpty(),
  query('employeeId').optional().isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { reportType } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      department: req.query.department,
      employeeId: req.query.employeeId
    };

    const result = await AttendanceIntegrationService.generateHRReport(
      req.user.organizationId,
      reportType,
      filters
    );

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Auto-approve attendance
router.post('/auto-approve', [
  attendanceWrite,
  body('qualityThreshold').optional().isInt({ min: 0, max: 100 }),
  body('riskThreshold').optional().isIn(['low', 'medium', 'high']),
  body('requireManagerApproval').optional().isBoolean()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const rules = {
      qualityThreshold: req.body.qualityThreshold || 90,
      riskThreshold: req.body.riskThreshold || 'medium',
      requireManagerApproval: req.body.requireManagerApproval || false
    };

    const result = await AttendanceIntegrationService.autoApproveAttendance(
      req.user.organizationId,
      rules
    );

    res.json({
      success: true,
      message: `${result.data.autoApproved} records auto-approved`,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Export for external systems
router.get('/export/:systemType', [
  attendanceRead,
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('format').optional().isIn(['json', 'csv', 'xml'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { systemType } = req.params;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      format: req.query.format || 'json'
    };

    const result = await AttendanceIntegrationService.exportForExternalSystem(
      req.user.organizationId,
      systemType,
      filters
    );

    if (filters.format === 'csv') {
      // Convert to CSV format
      const csvHeader = Object.keys(result.data.exportData[0]).join(',');
      const csvRows = result.data.exportData.map(record => 
        Object.values(record).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      );
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-${systemType}-export.csv`);
      res.send([csvHeader, ...csvRows].join('\n'));
    } else {
      res.json({
        success: true,
        data: result.data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Get integration status
router.get('/status', [
  attendanceRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // This would typically check the status of various integrations
    const integrationStatus = {
      payroll: {
        connected: true,
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        status: 'active'
      },
      hr: {
        connected: true,
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'active'
      },
      externalSystems: {
        adp: { connected: false, status: 'inactive' },
        workday: { connected: false, status: 'inactive' },
        bamboo: { connected: true, status: 'active' }
      }
    };

    res.json({
      success: true,
      data: { integrationStatus }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Test integration connection
router.post('/test/:systemType', [
  attendanceWrite,
  body('credentials').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { systemType } = req.params;
    const { credentials } = req.body;

    // Mock connection test (in real app, this would test actual API connections)
    const testResults = {
      adp: { connected: false, message: 'ADP API not configured' },
      workday: { connected: false, message: 'Workday API not configured' },
      bamboo: { connected: true, message: 'BambooHR connection successful' },
      generic: { connected: true, message: 'Generic export format available' }
    };

    const result = testResults[systemType] || { connected: false, message: 'Unknown system type' };

    res.json({
      success: true,
      data: {
        systemType,
        testResult: result,
        testedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Bulk operations for HR
router.post('/bulk/operations', [
  attendanceWrite,
  body('operation').isIn(['approve', 'reject', 'export', 'sync']),
  body('attendanceIds').isArray({ min: 1 }),
  body('attendanceIds.*').isMongoId(),
  body('parameters').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { operation, attendanceIds, parameters = {} } = req.body;

    let result;
    switch (operation) {
      case 'approve':
        result = await bulkApproveAttendance(attendanceIds, req.user._id);
        break;
      case 'reject':
        result = await bulkRejectAttendance(attendanceIds, req.user._id, parameters.reason);
        break;
      case 'export':
        result = await bulkExportAttendance(attendanceIds, parameters.format);
        break;
      case 'sync':
        result = await bulkSyncAttendance(attendanceIds, parameters.systemType);
        break;
      default:
        throw new Error('Invalid operation');
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Helper functions for bulk operations
async function bulkApproveAttendance(attendanceIds, approvedBy) {
  const Attendance = require('../../../models/hr-payroll/Attendance');
  
  const result = await Attendance.updateMany(
    { _id: { $in: attendanceIds } },
    { 
      $set: { 
        hrApproved: true,
        hrApprovedBy: approvedBy,
        hrApprovedAt: new Date()
      }
    }
  );

  return {
    operation: 'approve',
    processed: result.modifiedCount,
    total: attendanceIds.length
  };
}

async function bulkRejectAttendance(attendanceIds, rejectedBy, reason) {
  const Attendance = require('../../../models/hr-payroll/Attendance');
  
  const result = await Attendance.updateMany(
    { _id: { $in: attendanceIds } },
    { 
      $set: { 
        hrApproved: false,
        hrApprovedBy: rejectedBy,
        hrApprovedAt: new Date(),
        rejectionReason: reason
      }
    }
  );

  return {
    operation: 'reject',
    processed: result.modifiedCount,
    total: attendanceIds.length,
    reason
  };
}

async function bulkExportAttendance(attendanceIds, format = 'json') {
  const Attendance = require('../../../models/hr-payroll/Attendance');
  
  const attendanceRecords = await Attendance.find({ _id: { $in: attendanceIds } })
    .populate('userId', 'fullName email department');

  return {
    operation: 'export',
    format,
    recordCount: attendanceRecords.length,
    data: attendanceRecords
  };
}

async function bulkSyncAttendance(attendanceIds, systemType) {
  const Attendance = require('../../../models/hr-payroll/Attendance');
  
  const attendanceRecords = await Attendance.find({ _id: { $in: attendanceIds } })
    .populate('userId', 'fullName email department');

  const exportData = AttendanceIntegrationService.formatGeneric(attendanceRecords);

  return {
    operation: 'sync',
    systemType,
    recordCount: attendanceRecords.length,
    exportData
  };
}

module.exports = router;
