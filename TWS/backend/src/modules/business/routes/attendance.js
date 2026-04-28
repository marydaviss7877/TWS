const express = require('express');
const { body, query, param } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: ['write', 'write_own'], checkRevocation: false });
const attendanceAdminAccess = requireErpAccess({ allowedRoles: ['owner', 'admin', 'super_admin'] });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const Attendance = require('../../../models/Attendance');
const AttendancePolicy = require('../../../models/AttendancePolicy');
const AttendanceShift = require('../../../models/AttendanceShift');
const AttendanceAudit = require('../../../models/AttendanceAudit');
const Employee = require('../../../models/Employee');
const AttendanceService = require('../../../services/hr/attendance.service');
const { getResolvedPermissions, hasPermission } = require('../../../services/tenant/permissionResolver.service');
const metricsService = require('../../../services/analytics/metrics.service');

const router = express.Router();

function getOrgIdFromRequest(req) {
  return req.orgId || req.user?.orgId || req.user?.organizationId || null;
}

function setLegacyPunchDeprecationHeaders(res) {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
  res.set(
    'Link',
    '</api/tenant/{tenantSlug}/organization/hr/attendance/check-in>; rel="successor-version", </api/tenant/{tenantSlug}/organization/hr/attendance/check-out>; rel="successor-version"'
  );
}

function recordDeprecatedPunchMetric(endpoint, method = 'POST') {
  try {
    metricsService.incrementDeprecatedAttendanceRequests(endpoint, method);
  } catch (_) {
    // Metrics must never block request handling.
  }
}

async function resolveTargetEmployeeId(req, employeeId) {
  if (employeeId) {
    const tenantId = req.tenant?._id || req.user?.tenantId;
    const resolved = await getResolvedPermissions(req.user._id, tenantId, {
      hrSubRole: req.user.hrSubRole,
      financeSubRole: req.user.financeSubRole
    });
    if (!hasPermission(resolved.permissions, 'hr', 'write')) {
      throw Object.assign(new Error('Not authorized to perform attendance actions on behalf of another employee'), { statusCode: 403 });
    }
    return employeeId;
  }
  return req.user?.employeeId || req.user?._id;
}

// Enhanced Check in with comprehensive validation
router.post('/checkin', [
  attendanceWrite,
  body('employeeId').optional().notEmpty(),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat(),
  body('location.address').optional().notEmpty(),
  body('location.accuracy').optional().isFloat(),
  body('photoUrl').optional().isURL(),
  body('biometricData.fingerprint').optional().notEmpty(),
  body('biometricData.faceId').optional().notEmpty(),
  body('biometricData.voicePrint').optional().notEmpty(),
  body('workMode').optional().isIn(['office', 'remote', 'hybrid']),
  body('currentProject').optional().notEmpty(),
  body('teamStatus').optional().isIn(['available', 'busy', 'away', 'focus']),
  body('notes').optional().notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    setLegacyPunchDeprecationHeaders(res);
    recordDeprecatedPunchMetric('/api/attendance/checkin', 'POST');
    const { employeeId, location, photoUrl, biometricData, workMode, currentProject, teamStatus, notes, timestamp } = req.body;

    const checkInData = {
      timestamp: timestamp || new Date(),
      location,
      photoUrl,
      biometricData,
      workMode,
      currentProject,
      teamStatus,
      notes
    };
    const orgId = getOrgIdFromRequest(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization context missing' });
    }
    const targetEmployeeId = await resolveTargetEmployeeId(req, employeeId);
    const attendance = await AttendanceService.checkIn(orgId, targetEmployeeId, checkInData);

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: attendance
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
}));

// Enhanced Check out with comprehensive validation
router.post('/checkout', [
  attendanceWrite,
  body('employeeId').optional().notEmpty(),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat(),
  body('location.address').optional().notEmpty(),
  body('location.accuracy').optional().isFloat(),
  body('photoUrl').optional().isURL(),
  body('biometricData.fingerprint').optional().notEmpty(),
  body('biometricData.faceId').optional().notEmpty(),
  body('biometricData.voicePrint').optional().notEmpty(),
  body('notes').optional().notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    setLegacyPunchDeprecationHeaders(res);
    recordDeprecatedPunchMetric('/api/attendance/checkout', 'POST');
    const { employeeId, location, photoUrl, biometricData, notes, timestamp } = req.body;

    const checkOutData = {
      timestamp: timestamp || new Date(),
      location,
      photoUrl,
      biometricData,
      notes
    };
    const orgId = getOrgIdFromRequest(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization context missing' });
    }
    const targetEmployeeId = await resolveTargetEmployeeId(req, employeeId);
    const attendance = await AttendanceService.checkOut(orgId, targetEmployeeId, checkOutData);

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
}));

// Get attendance records
router.get('/', [
  attendanceRead,
  query('userId').optional().isMongoId(),
  query('employeeId').optional().notEmpty(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  
  // If not HR/Admin/Owner, only show own records
  if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
    filter.userId = req.user._id;
  } else {
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  }

  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const attendance = await Attendance.find(filter)
    .populate('userId', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 });

  const total = await Attendance.countDocuments(filter);

  res.json({
    success: true,
    data: {
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get today's attendance
router.get('/today', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.findOne({
    userId: req.user._id,
    date: { $gte: today, $lt: tomorrow }
  });

  res.json({
    success: true,
    data: { attendance }
  });
}));

// Request attendance correction
router.post('/:id/correction', [
  attendanceWrite,
  body('reason').notEmpty().trim()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  // Check if user can request correction for this record
  if (attendance.userId.toString() !== req.user._id.toString() && 
      !['hr', 'admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to request correction for this record'
    });
  }

  const correctionRequest = {
    requestedBy: req.user._id,
    reason,
    requestedAt: new Date(),
    status: 'pending'
  };

  attendance.correctionRequests.push(correctionRequest);
  await attendance.save();

  res.json({
    success: true,
    message: 'Correction request submitted successfully',
    data: { correctionRequest }
  });
}));

// Approve/reject correction request
router.patch('/:id/corrections/:correctionId', [
  attendanceWrite,
  body('status').isIn(['approved', 'rejected']),
  body('comments').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { status, comments } = req.body;

  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  const correction = attendance.correctionRequests.id(req.params.correctionId);
  if (!correction) {
    return res.status(404).json({
      success: false,
      message: 'Correction request not found'
    });
  }

  correction.status = status;
  correction.approvedBy = req.user._id;
  correction.approvedAt = new Date();
  correction.comments = comments;

  await attendance.save();

  res.json({
    success: true,
    message: `Correction request ${status} successfully`,
    data: { correction }
  });
}));

// Export attendance data
router.get('/export', [
  attendanceRead,
  query('from').isISO8601(),
  query('to').isISO8601(),
  query('format').optional().isIn(['csv', 'json'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { from, to, format = 'csv' } = req.query;

  const filter = {
    date: {
      $gte: new Date(from),
      $lte: new Date(to)
    }
  };

  // If not HR/Admin/Owner, only export own records
  if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
    filter.userId = req.user._id;
  }

  const attendance = await Attendance.find(filter)
    .populate('userId', 'fullName email')
    .sort({ date: -1 });

  if (format === 'csv') {
    // Generate CSV
    const csvHeader = 'Date,Employee Name,Employee ID,Check In,Check Out,Duration (minutes),Overtime (minutes),Status\n';
    const csvRows = attendance.map(record => {
      const checkIn = record.checkIn.timestamp ? record.checkIn.timestamp.toISOString() : '';
      const checkOut = record.checkOut.timestamp ? record.checkOut.timestamp.toISOString() : '';
      return `${record.date.toISOString().split('T')[0]},${record.userId.fullName},${record.employeeId},${checkIn},${checkOut},${record.durationMinutes},${record.overtimeMinutes},${record.status}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.csv');
    res.send(csvHeader + csvRows);
  } else {
    res.json({
      success: true,
      data: { attendance }
    });
  }
}));

// Break management routes
router.post('/break/start', [
  attendanceWrite,
  body('type').optional().isIn(['lunch', 'break', 'meeting', 'training', 'personal', 'other']),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat(),
  body('location.address').optional().notEmpty(),
  body('notes').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { type, location, notes } = req.body;
    const result = await AttendanceService.startBreak(req.user._id, { type, location, notes });
    
    res.json({
      success: true,
      message: 'Break started successfully',
      data: result.data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

router.post('/break/end/:breakIndex', [
  attendanceWrite,
  param('breakIndex').isInt({ min: 0 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const breakIndex = parseInt(req.params.breakIndex);
    const result = await AttendanceService.endBreak(req.user._id, breakIndex);
    
    res.json({
      success: true,
      message: 'Break ended successfully',
      data: result.data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Attendance analytics and reporting
router.get('/analytics', [
  attendanceRead,
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('userId').optional().isMongoId(),
  query('department').optional().notEmpty(),
  query('riskLevel').optional().isIn(['low', 'medium', 'high', 'critical'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const filters = {};
    
    // Build filters based on query parameters
    if (req.query.from || req.query.to) {
      filters.date = {};
      if (req.query.from) filters.date.$gte = new Date(req.query.from);
      if (req.query.to) filters.date.$lte = new Date(req.query.to);
    }
    
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.department) filters['userId.department'] = req.query.department;
    if (req.query.riskLevel) filters.riskLevel = req.query.riskLevel;
    
    // If not HR/Admin/Owner, only show own records
    if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
      filters.userId = req.user._id;
    }

    const result = await AttendanceService.getAttendanceAnalytics(filters);
    
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

// Security and risk management
router.get('/security/alerts', [
  attendanceRead,
  query('riskLevel').optional().isIn(['medium', 'high', 'critical']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {};
    
    // Filter by risk level
    if (req.query.riskLevel) {
      filters.riskLevel = req.query.riskLevel;
    } else {
      filters.riskLevel = { $in: ['medium', 'high', 'critical'] };
    }

    // If not HR/Admin/Owner, only show own records
    if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
      filters.userId = req.user._id;
    }

    const suspiciousActivities = await Attendance.findSuspiciousActivities(filters)
      .populate('userId', 'fullName email department')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 });

    const total = await Attendance.countDocuments({
      ...filters,
      $or: [
        { riskLevel: { $in: ['medium', 'high', 'critical'] } },
        { 'securityFlags': { $exists: true, $ne: [] } },
        { qualityScore: { $lt: 70 } }
      ]
    });

    res.json({
      success: true,
      data: {
        alerts: suspiciousActivities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Audit trail
router.get('/audit/:attendanceId', [
  attendanceRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const auditTrail = await AttendanceAudit.getAuditTrail(req.params.attendanceId);
    
    res.json({
      success: true,
      data: { auditTrail }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Real-time attendance status
router.get('/realtime', [
  attendanceRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const filters = { isActive: true };
    
    // If not HR/Admin/Owner, only show own records
    if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
      filters.userId = req.user._id;
    }

    const activeAttendance = await Attendance.find(filters)
      .populate('userId', 'fullName email department')
      .sort({ lastActivity: -1 });

    res.json({
      success: true,
      data: { activeAttendance }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Attendance policies management
router.get('/policies', [
  attendanceRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const policies = await AttendancePolicy.find({
      organizationId: req.user.organizationId,
      isActive: true
    }).sort({ effectiveFrom: -1 });

    res.json({
      success: true,
      data: { policies }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Attendance shifts management
router.get('/shifts', [
  attendanceRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const shifts = await AttendanceShift.find({
      organizationId: req.user.organizationId,
      isActive: true
    }).sort({ startTime: 1 });

    res.json({
      success: true,
      data: { shifts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Bulk operations for HR/Admin
router.post('/bulk/approve', [
  attendanceWrite,
  body('attendanceIds').isArray({ min: 1 }),
  body('attendanceIds.*').isMongoId(),
  body('comments').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for bulk operations'
      });
    }

    const { attendanceIds, comments } = req.body;
    
    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      { 
        $set: { 
          hrApproved: true,
          hrApprovedBy: req.user._id,
          hrApprovedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} attendance records approved`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Export enhanced attendance data
router.get('/export/enhanced', [
  attendanceRead,
  query('from').isISO8601(),
  query('to').isISO8601(),
  query('format').optional().isIn(['csv', 'json', 'excel']),
  query('includeAudit').optional().isBoolean()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { from, to, format = 'csv', includeAudit = false } = req.query;

    const filter = {
      date: {
        $gte: new Date(from),
        $lte: new Date(to)
      }
    };

    // If not HR/Admin/Owner, only export own records
    if (!['hr', 'admin', 'owner'].includes(req.user.role)) {
      filter.userId = req.user._id;
    }

    const attendance = await Attendance.find(filter)
      .populate('userId', 'fullName email department')
      .populate('policyId', 'name')
      .populate('shiftId', 'name')
      .sort({ date: -1 });

    if (format === 'csv') {
      // Enhanced CSV with more fields
      const csvHeader = 'Date,Employee Name,Employee ID,Department,Check In,Check Out,Duration (minutes),Overtime (minutes),Status,Risk Level,Quality Score,Security Flags,Location,Device Info\n';
      const csvRows = attendance.map(record => {
        const checkIn = record.checkIn.timestamp ? record.checkIn.timestamp.toISOString() : '';
        const checkOut = record.checkOut.timestamp ? record.checkOut.timestamp.toISOString() : '';
        const location = record.checkIn.location.address || 'Unknown';
        const deviceInfo = record.checkIn.device.browser || 'Unknown';
        const securityFlags = record.securityFlags.join(';') || 'None';
        
        return `${record.date.toISOString().split('T')[0]},${record.userId.fullName},${record.employeeId},${record.userId.department || 'N/A'},${checkIn},${checkOut},${record.durationMinutes},${record.overtimeMinutes},${record.status},${record.riskLevel},${record.qualityScore},${securityFlags},${location},${deviceInfo}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=enhanced-attendance-export.csv');
      res.send(csvHeader + csvRows);
    } else if (format === 'json') {
      res.json({
        success: true,
        data: { attendance }
      });
    } else {
      // Excel format would require additional library like xlsx
      res.status(400).json({
        success: false,
        message: 'Excel format not yet implemented'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Admin real-time attendance data
router.get('/admin/realtime', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get live employees (checked in today, not checked out)
  const liveEmployees = await Attendance.find({
    organizationId: req.user.orgId,
    date: { $gte: today, $lt: tomorrow },
    'checkIn.timestamp': { $exists: true },
    'checkOut.timestamp': { $exists: false }
  }).populate('userId', 'fullName email department');

  // Get active sessions count
  const activeSessions = liveEmployees.length;

  // Get current location distribution
  const locationStats = await Attendance.aggregate([
    {
      $match: {
        organizationId: req.user.orgId,
        date: { $gte: today, $lt: tomorrow },
        'checkIn.timestamp': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$checkIn.location.address',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      liveEmployees: liveEmployees.length,
      activeSessions,
      currentLocation: locationStats[0]?._id || 'Office',
      systemHealth: 'excellent',
      locationStats
    }
  });
}));

// Admin trending metrics
router.get('/admin/trending-metrics', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { range = '7d' } = req.query;
  
  let startDate = new Date();
  switch (range) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  const metrics = await Attendance.aggregate([
    {
      $match: {
        organizationId: req.user.orgId,
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        avgDuration: { $avg: '$durationMinutes' },
        avgQualityScore: { $avg: '$qualityScore' },
        verifiedCount: {
          $sum: {
            $cond: [{ $eq: ['$checkIn.verified', true] }, 1, 0]
          }
        },
        biometricCount: {
          $sum: {
            $cond: [{ $ne: ['$checkIn.biometricData.fingerprint', null] }, 1, 0]
          }
        },
        photoCount: {
          $sum: {
            $cond: [{ $ne: ['$checkIn.photoUrl', null] }, 1, 0]
          }
        }
      }
    }
  ]);

  const result = metrics[0] || {};
  const attendanceRate = result.totalRecords > 0 ? (result.verifiedCount / result.totalRecords) * 100 : 0;
  const biometricRate = result.totalRecords > 0 ? (result.biometricCount / result.totalRecords) * 100 : 0;
  const photoRate = result.totalRecords > 0 ? (result.photoCount / result.totalRecords) * 100 : 0;

  res.json({
    success: true,
    data: {
      attendanceRate: { 
        current: Math.round(attendanceRate), 
        previous: Math.round(attendanceRate * 0.95), 
        trend: 'up' 
      },
      punctuality: { 
        current: Math.round(result.avgQualityScore || 85), 
        previous: Math.round((result.avgQualityScore || 85) * 0.98), 
        trend: 'up' 
      },
      productivity: { 
        current: Math.round((result.avgDuration || 480) / 60), 
        previous: Math.round(((result.avgDuration || 480) * 0.97) / 60), 
        trend: 'up' 
      },
      remoteWork: { 
        current: Math.round(biometricRate), 
        previous: Math.round(biometricRate * 1.05), 
        trend: 'up' 
      },
      overtime: { 
        current: Math.round((result.avgDuration || 480) / 60 - 8), 
        previous: Math.round(((result.avgDuration || 480) * 0.95) / 60 - 8), 
        trend: 'down' 
      },
      absenteeism: { 
        current: Math.round(100 - attendanceRate), 
        previous: Math.round((100 - attendanceRate) * 1.02), 
        trend: 'down' 
      }
    }
  });
}));

// Admin insights
router.get('/admin/insights', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { range = '7d' } = req.query;
  
  let startDate = new Date();
  switch (range) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  // Get top performers
  const topPerformers = await Attendance.aggregate([
    {
      $match: {
        organizationId: req.user.orgId,
        date: { $gte: startDate },
        'checkOut.timestamp': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalHours: { $sum: '$durationMinutes' },
        avgQualityScore: { $avg: '$qualityScore' },
        daysWorked: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: { totalHours: -1 }
    },
    {
      $limit: 5
    }
  ]);

  // Get attendance alerts
  const attendanceAlerts = await Attendance.find({
    organizationId: req.user.orgId,
    date: { $gte: startDate },
    $or: [
      { riskLevel: { $in: ['high', 'critical'] } },
      { qualityScore: { $lt: 70 } },
      { 'securityFlags': { $exists: true, $ne: [] } }
    ]
  }).populate('userId', 'fullName email').limit(10);

  res.json({
    success: true,
    data: {
      topPerformers: topPerformers.map(performer => ({
        name: performer.user.fullName,
        email: performer.user.email,
        totalHours: Math.round(performer.totalHours / 60),
        avgQualityScore: Math.round(performer.avgQualityScore),
        daysWorked: performer.daysWorked
      })),
      attendanceAlerts: attendanceAlerts.map(alert => ({
        employeeName: alert.userId.fullName,
        date: alert.date,
        riskLevel: alert.riskLevel,
        qualityScore: alert.qualityScore,
        securityFlags: alert.securityFlags
      })),
      productivityInsights: [
        {
          insight: 'Biometric verification increased by 15% this week',
          impact: 'positive',
          recommendation: 'Continue promoting biometric check-ins'
        },
        {
          insight: 'Photo verification rate is at 85%',
          impact: 'neutral',
          recommendation: 'Consider making photo verification mandatory'
        }
      ],
      complianceIssues: [],
      recommendations: [
        'Implement mandatory photo verification for remote workers',
        'Set up automated alerts for high-risk attendance patterns',
        'Consider implementing geofencing for office locations'
      ]
    }
  });
}));

// ============================================
// ADMIN-SPECIFIC ENDPOINTS
// ============================================

// Get admin attendance statistics
router.get('/admin/stats', [
  attendanceAdminAccess,
  query('date').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    // Get total employees
    const totalEmployees = await Employee.countDocuments({ 
      organizationId: req.user.organizationId,
      status: 'active'
    });

    // Get attendance statistics for the date
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.user.organizationId,
          date: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: { $divide: ['$durationMinutes', 60] } },
          totalOvertime: { $sum: { $divide: ['$overtimeMinutes', 60] } }
        }
      }
    ]);

    // Get pending approvals count
    const pendingApprovals = await Attendance.countDocuments({
      organizationId: req.user.organizationId,
      'correctionRequests.status': 'pending'
    });

    // Process statistics
    const stats = {
      totalEmployees,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      pendingApprovals,
      totalHours: 0,
      overtimeHours: 0
    };

    attendanceStats.forEach(stat => {
      switch (stat._id) {
        case 'present':
          stats.presentToday = stat.count;
          stats.totalHours += stat.totalHours || 0;
          break;
        case 'absent':
          stats.absentToday = stat.count;
          break;
        case 'late':
          stats.lateToday = stat.count;
          stats.totalHours += stat.totalHours || 0;
          break;
      }
      stats.overtimeHours += stat.totalOvertime || 0;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Get attendance overview for admin
router.get('/admin/overview', [
  attendanceAdminAccess,
  query('date').optional().isISO8601(),
  query('department').optional().isString(),
  query('status').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { date, department, status } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];
    const startDate = new Date(filterDate);
    const endDate = new Date(filterDate);
    endDate.setDate(endDate.getDate() + 1);

    // Build query
    const query = {
      organizationId: req.user.organizationId,
      date: {
        $gte: startDate,
        $lt: endDate
      }
    };

    if (status) {
      query.status = status;
    }

    // Get attendance records with employee details
    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ 'checkIn.timestamp': -1 })
      .limit(100);

    // Filter by department if specified
    let filteredAttendance = attendance;
    if (department) {
      filteredAttendance = attendance.filter(record => 
        record.employee && record.employee.department === department
      );
    }

    res.json({
      success: true,
      data: {
        attendance: filteredAttendance,
        total: filteredAttendance.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Get pending approvals
router.get('/admin/pending-approvals', [
  attendanceAdminAccess
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const approvals = await Attendance.find({
      organizationId: req.user.organizationId,
      'correctionRequests.status': 'pending'
    })
    .populate('employee', 'firstName lastName employeeId department position')
    .sort({ 'correctionRequests.createdAt': -1 })
    .limit(50);

    // Transform approvals data
    const pendingApprovals = approvals.flatMap(attendance => 
      attendance.correctionRequests
        .filter(request => request.status === 'pending')
        .map(request => ({
          _id: request._id,
          attendanceId: attendance._id,
          employee: attendance.employee,
          type: request.type,
          date: attendance.date,
          reason: request.reason,
          details: request.details,
          priority: request.priority || 'medium',
          status: request.status,
          createdAt: request.createdAt,
          attachments: request.attachments || []
        }))
    );

    res.json({
      success: true,
      data: {
        approvals: pendingApprovals
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Manual attendance entry
router.post('/admin/manual-entry', [
  attendanceAdminAccess,
  body('employeeId').isMongoId(),
  body('date').isISO8601(),
  body('status').isIn(['present', 'absent', 'late', 'half-day', 'on-leave']),
  body('checkInTime').optional().isString(),
  body('checkOutTime').optional().isString(),
  body('notes').optional().isString(),
  body('location').optional().isString(),
  body('overtimeHours').optional().isFloat({ min: 0 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const {
      employeeId,
      date,
      status,
      checkInTime,
      checkOutTime,
      notes,
      location,
      overtimeHours
    } = req.body;

    // Get employee
    const employee = await Employee.findOne({ 
      _id: employeeId,
      organizationId: req.user.organizationId 
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: new Date(date)
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date'
      });
    }

    // Create attendance record
    const attendanceData = {
      employeeId: employee._id,
      organizationId: req.user.organizationId,
      date: new Date(date),
      status,
      notes: notes || '',
      createdBy: req.user._id,
      isManualEntry: true
    };

    let checkInDateTime = null;

    // Add check-in data if provided
    if (checkInTime && status !== 'absent') {
      checkInDateTime = new Date(`${date}T${checkInTime}`);
      attendanceData.checkIn = {
        timestamp: checkInDateTime,
        location: location ? { address: location } : null,
        verified: true,
        device: {
          type: 'manual',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      };
    }

    // Add check-out data if provided
    if (checkOutTime && status !== 'absent') {
      const checkOutDateTime = new Date(`${date}T${checkOutTime}`);
      attendanceData.checkOut = {
        timestamp: checkOutDateTime,
        location: location ? { address: location } : null,
        verified: true,
        device: {
          type: 'manual',
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      };

      // Calculate duration
      if (checkInDateTime) {
        const durationMs = checkOutDateTime - checkInDateTime;
        attendanceData.durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        // Calculate overtime
        const standardMinutes = 480; // 8 hours
        attendanceData.overtimeMinutes = Math.max(0, attendanceData.durationMinutes - standardMinutes);
      }
    }

    // Override overtime if specified
    if (overtimeHours) {
      attendanceData.overtimeMinutes = overtimeHours * 60;
    }

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    res.json({
      success: true,
      message: 'Manual attendance entry created successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Bulk status update
router.post('/admin/bulk-status-update', [
  attendanceAdminAccess,
  body('attendanceIds').isArray({ min: 1 }),
  body('status').isIn(['present', 'absent', 'late', 'half-day', 'on-leave'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { attendanceIds, status } = req.body;

    const result = await Attendance.updateMany(
      {
        _id: { $in: attendanceIds },
        organizationId: req.user.organizationId
      },
      {
        $set: {
          status: status,
          updatedBy: req.user._id,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} attendance records`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Bulk action (approve/reject)
router.post('/admin/bulk-action', [
  attendanceAdminAccess,
  body('action').isIn(['approve', 'reject', 'export']),
  body('attendanceIds').isArray({ min: 1 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { action, attendanceIds } = req.body;

    if (action === 'approve') {
      const result = await Attendance.updateMany(
        {
          _id: { $in: attendanceIds },
          organizationId: req.user.organizationId
        },
        {
          $set: {
            'correctionRequests.$[elem].status': 'approved',
            'correctionRequests.$[elem].approvedBy': req.user._id,
            'correctionRequests.$[elem].approvedAt': new Date(),
            updatedBy: req.user._id
          }
        },
        {
          arrayFilters: [{ 'elem.status': 'pending' }]
        }
      );

      res.json({
        success: true,
        message: `Approved ${result.modifiedCount} requests`,
        data: { modifiedCount: result.modifiedCount }
      });
    } else if (action === 'reject') {
      const result = await Attendance.updateMany(
        {
          _id: { $in: attendanceIds },
          organizationId: req.user.organizationId
        },
        {
          $set: {
            'correctionRequests.$[elem].status': 'rejected',
            'correctionRequests.$[elem].rejectedBy': req.user._id,
            'correctionRequests.$[elem].rejectedAt': new Date(),
            updatedBy: req.user._id
          }
        },
        {
          arrayFilters: [{ 'elem.status': 'pending' }]
        }
      );

      res.json({
        success: true,
        message: `Rejected ${result.modifiedCount} requests`,
        data: { modifiedCount: result.modifiedCount }
      });
    } else if (action === 'export') {
      res.json({
        success: true,
        message: 'Export functionality will be implemented',
        data: { exportedCount: attendanceIds.length }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Approve individual request
router.post('/admin/approve/:approvalId', [
  attendanceAdminAccess,
  param('approvalId').isMongoId(),
  body('type').isString(),
  body('action').isIn(['approve', 'reject'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { type, action } = req.body;

    const attendance = await Attendance.findOne({
      'correctionRequests._id': approvalId,
      organizationId: req.user.organizationId
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    const request = attendance.correctionRequests.id(approvalId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (action === 'approve') {
      request.status = 'approved';
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
    } else {
      request.status = 'rejected';
      request.rejectedBy = req.user._id;
      request.rejectedAt = new Date();
    }

    await attendance.save();

    res.json({
      success: true,
      message: `Request ${action}d successfully`,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Reject individual request
router.post('/admin/reject/:approvalId', [
  attendanceAdminAccess,
  param('approvalId').isMongoId(),
  body('type').isString(),
  body('action').isIn(['approve', 'reject']),
  body('reason').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { type, action, reason } = req.body;

    const attendance = await Attendance.findOne({
      'correctionRequests._id': approvalId,
      organizationId: req.user.organizationId
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    const request = attendance.correctionRequests.id(approvalId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    request.status = 'rejected';
    request.rejectedBy = req.user._id;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;

    await attendance.save();

    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Export attendance data
router.get('/admin/export', [
  attendanceAdminAccess,
  query('format').isIn(['csv', 'excel', 'json']),
  query('date').optional().isISO8601(),
  query('department').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { format, date, department } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];
    const startDate = new Date(filterDate);
    const endDate = new Date(filterDate);
    endDate.setDate(endDate.getDate() + 1);

    // Build query
    const query = {
      organizationId: req.user.organizationId,
      date: {
        $gte: startDate,
        $lt: endDate
      }
    };

    // Get attendance data
    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ date: -1 });

    // Filter by department if specified
    let filteredAttendance = attendance;
    if (department) {
      filteredAttendance = attendance.filter(record => 
        record.employee && record.employee.department === department
      );
    }

    // Transform data for export
    const exportData = filteredAttendance.map(record => ({
      employeeName: `${record.employee?.firstName} ${record.employee?.lastName}`,
      employeeId: record.employee?.employeeId,
      department: record.employee?.department,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      checkIn: record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toLocaleTimeString() : '',
      checkOut: record.checkOut?.timestamp ? new Date(record.checkOut.timestamp).toLocaleTimeString() : '',
      duration: record.durationMinutes ? `${Math.floor(record.durationMinutes / 60)}h ${record.durationMinutes % 60}m` : '',
      overtime: record.overtimeMinutes ? `${Math.floor(record.overtimeMinutes / 60)}h ${record.overtimeMinutes % 60}m` : '',
      location: record.checkIn?.location?.address || '',
      notes: record.notes || ''
    }));

    if (format === 'json') {
      res.json({
        success: true,
        data: exportData
      });
    } else if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Employee Name,Employee ID,Department,Date,Status,Check In,Check Out,Duration,Overtime,Location,Notes\n';
      const csvData = exportData.map(row => 
        `"${row.employeeName}","${row.employeeId}","${row.department}","${row.date}","${row.status}","${row.checkIn}","${row.checkOut}","${row.duration}","${row.overtime}","${row.location}","${row.notes}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${filterDate}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        message: 'Excel export functionality will be implemented',
        data: exportData
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// ─── Routes consolidated from deleted legacy files ───────────────────────────

// ── calendarAttendance.js ─────────────────────────────────────────────────────

// Get attendance calendar data
router.get('/calendar', [
  attendanceRead,
  query('year').isInt({ min: 2020, max: 2030 }),
  query('month').isInt({ min: 1, max: 12 }),
  query('userId').optional().isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { year, month, userId } = req.query;
  const targetUserId = userId || req.user._id;
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const records = await Attendance.find({
    userId: targetUserId,
    date: {
      $gte: startDate.toISOString().split('T')[0],
      $lte: endDate.toISOString().split('T')[0]
    }
  }).sort({ date: 1 });

  const calendarData = {};
  records.forEach(record => {
    let status = 'absent';
    if (record.checkIn && record.checkOut) {
      const diff = Math.abs(new Date(record.checkIn.timestamp) - new Date(new Date(record.checkIn.timestamp).setHours(9, 0, 0, 0))) / 60000;
      status = diff <= 30 ? 'on_time' : 'late';
    } else if (record.checkIn) {
      const diff = Math.abs(new Date(record.checkIn.timestamp) - new Date(new Date(record.checkIn.timestamp).setHours(9, 0, 0, 0))) / 60000;
      status = diff <= 30 ? 'present' : 'late';
    }
    calendarData[record.date] = { status, checkIn: record.checkIn, checkOut: record.checkOut, durationMinutes: record.durationMinutes };
  });

  res.json({ success: true, data: calendarData });
}));

// Get employee records for admin (with search/filter/pagination)
router.get('/admin/records', [
  attendanceRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['present', 'late', 'absent', 'half_day']),
  query('date').optional().isISO8601(),
  query('search').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, date, search } = req.query;
  const matchQuery = {};
  if (status) matchQuery.status = status;
  if (date)   matchQuery.date   = date;

  const pipeline = [
    { $match: matchQuery },
    { $lookup: { from: 'employees', localField: 'userId', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' }
  ];
  if (search) {
    pipeline.push({ $match: { $or: [
      { 'employee.name': { $regex: search, $options: 'i' } },
      { 'employee.employeeId': { $regex: search, $options: 'i' } }
    ]}});
  }
  pipeline.push(
    { $sort: { date: -1, 'checkIn.timestamp': -1 } },
    { $facet: {
      records:    [{ $skip: (page - 1) * parseInt(limit) }, { $limit: parseInt(limit) }],
      totalCount: [{ $count: 'count' }]
    }}
  );

  const result = await Attendance.aggregate(pipeline);
  const records = result[0].records.map(r => ({
    _id: r._id, employeeName: r.employee.name, employeeId: r.employee.employeeId,
    adminId: r.employee.adminId, isAdmin: r.isAdmin || false, date: r.date,
    checkIn: r.checkIn, checkOut: r.checkOut, status: r.status,
    durationMinutes: r.durationMinutes, createdAt: r.createdAt
  }));
  const total = result[0].totalCount[0]?.count || 0;

  res.json({ success: true, data: { records, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
}));

// Update attendance record status
router.put('/admin/records/:recordId/status', [
  attendanceWrite,
  body('status').isIn(['present', 'late', 'absent', 'half_day'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const record = await Attendance.findByIdAndUpdate(req.params.recordId, { status: req.body.status }, { new: true });
  if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });
  res.json({ success: true, message: 'Status updated successfully', data: record });
}));

// Export employee records as CSV
router.get('/admin/records/export', [
  attendanceRead,
  query('status').optional().isIn(['present', 'late', 'absent', 'half_day']),
  query('date').optional().isISO8601(),
  query('search').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { status, date, search } = req.query;
  const matchQuery = {};
  if (status) matchQuery.status = status;
  if (date)   matchQuery.date   = date;

  const pipeline = [
    { $match: matchQuery },
    { $lookup: { from: 'employees', localField: 'userId', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' }
  ];
  if (search) {
    pipeline.push({ $match: { $or: [
      { 'employee.name': { $regex: search, $options: 'i' } },
      { 'employee.employeeId': { $regex: search, $options: 'i' } }
    ]}});
  }
  pipeline.push({ $sort: { date: -1 } });

  const records = await Attendance.aggregate(pipeline);
  const csvHeader = 'Date,Employee Name,Employee ID,Check In,Check Out,Duration (Hours),Status\n';
  const csvData   = records.map(r => {
    const checkIn  = r.checkIn  ? new Date(r.checkIn.timestamp).toLocaleString()  : 'Not checked in';
    const checkOut = r.checkOut ? new Date(r.checkOut.timestamp).toLocaleString() : 'Not checked out';
    const duration = r.durationMinutes ? (r.durationMinutes / 60).toFixed(2) : '0';
    return `${r.date},${r.employee.name},${r.employee.employeeId},${checkIn},${checkOut},${duration},${r.status}`;
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=employee-records-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvHeader + csvData);
}));

// ── simpleAttendance.js ───────────────────────────────────────────────────────

// Simple employee check-in (by employeeId string, no auth token required for kiosk use)
router.post('/simple/checkin', [
  attendanceWrite,
  body('employeeId').notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { employeeId, timestamp } = req.body;
  const employee = await Employee.findOne({ employeeId });
  if (!employee) return res.status(400).json({ success: false, message: 'Employee not found' });

  const today = new Date().toISOString().split('T')[0];
  let record = await Attendance.findOne({ userId: employee._id, date: today });
  if (record?.checkIn) return res.status(400).json({ success: false, message: 'Already checked in today' });

  const checkInData = { timestamp: timestamp || new Date(), verified: true, verificationMethod: 'employee_id' };
  if (record) { record.checkIn = checkInData; record.status = 'present'; record.isActive = true; await record.save(); }
  else { await new Attendance({ userId: employee._id, employeeId, organizationId: employee.organizationId, date: today, checkIn: checkInData, status: 'present', isActive: true }).save(); }

  res.json({ success: true, message: 'Checked in successfully', data: { employeeId, checkInTime: checkInData.timestamp, status: 'checked_in' } });
}));

// Simple employee check-out
router.post('/simple/checkout', [
  attendanceWrite,
  body('employeeId').notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { employeeId, timestamp } = req.body;
  const employee = await Employee.findOne({ employeeId });
  if (!employee) return res.status(400).json({ success: false, message: 'Employee not found' });

  const today   = new Date().toISOString().split('T')[0];
  const record  = await Attendance.findOne({ userId: employee._id, date: today });
  if (!record?.checkIn)  return res.status(400).json({ success: false, message: 'No check-in found for today' });
  if (record?.checkOut)  return res.status(400).json({ success: false, message: 'Already checked out today' });

  const checkOutTime    = new Date(timestamp || new Date());
  record.checkOut       = { timestamp: checkOutTime, verified: true, verificationMethod: 'employee_id' };
  record.durationMinutes = Math.round((checkOutTime - new Date(record.checkIn.timestamp)) / 60000);
  record.status         = 'present';
  record.isActive       = false;
  await record.save();

  res.json({ success: true, message: 'Checked out successfully', data: { employeeId, checkInTime: record.checkIn.timestamp, checkOutTime, durationMinutes: record.durationMinutes, status: 'checked_out' } });
}));

// Simple admin check-in
router.post('/simple/admin/checkin', [
  attendanceWrite,
  body('adminId').notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { adminId, timestamp } = req.body;
  const admin = await Employee.findOne({ $or: [{ adminId }, { employeeId: adminId }] });
  if (!admin) return res.status(400).json({ success: false, message: 'Admin not found' });

  const today  = new Date().toISOString().split('T')[0];
  let record   = await Attendance.findOne({ userId: admin._id, date: today });
  if (record?.checkIn) return res.status(400).json({ success: false, message: 'Already checked in today' });

  const checkInData = { timestamp: timestamp || new Date(), verified: true, verificationMethod: 'admin_id' };
  if (record) { record.checkIn = checkInData; record.status = 'present'; record.isActive = true; await record.save(); }
  else { await new Attendance({ userId: admin._id, employeeId: adminId, organizationId: admin.organizationId, date: today, checkIn: checkInData, status: 'present', isActive: true, isAdmin: true }).save(); }

  res.json({ success: true, message: 'Admin checked in successfully', data: { adminId, checkInTime: checkInData.timestamp, status: 'checked_in' } });
}));

// Simple admin check-out
router.post('/simple/admin/checkout', [
  attendanceWrite,
  body('adminId').notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { adminId, timestamp } = req.body;
  const admin = await Employee.findOne({ $or: [{ adminId }, { employeeId: adminId }] });
  if (!admin) return res.status(400).json({ success: false, message: 'Admin not found' });

  const today   = new Date().toISOString().split('T')[0];
  const record  = await Attendance.findOne({ userId: admin._id, date: today });
  if (!record?.checkIn) return res.status(400).json({ success: false, message: 'No check-in found for today' });
  if (record?.checkOut) return res.status(400).json({ success: false, message: 'Already checked out today' });

  const checkOutTime     = new Date(timestamp || new Date());
  record.checkOut        = { timestamp: checkOutTime, verified: true, verificationMethod: 'admin_id' };
  record.durationMinutes = Math.round((checkOutTime - new Date(record.checkIn.timestamp)) / 60000);
  record.status          = 'present';
  record.isActive        = false;
  await record.save();

  res.json({ success: true, message: 'Admin checked out successfully', data: { adminId, checkInTime: record.checkIn.timestamp, checkOutTime, durationMinutes: record.durationMinutes, status: 'checked_out' } });
}));

// Get today's simple records for admin
router.get('/admin/simple/records', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const today   = new Date().toISOString().split('T')[0];
  const records = await Attendance.find({ date: today })
    .populate('userId', 'name email employeeId adminId')
    .sort({ 'checkIn.timestamp': -1 });

  res.json({ success: true, data: records.map(r => ({
    _id: r._id, employeeName: r.userId?.name || 'Unknown', employeeId: r.userId?.employeeId || r.employeeId,
    adminId: r.userId?.adminId, isAdmin: r.isAdmin || false, checkIn: r.checkIn, checkOut: r.checkOut,
    status: r.checkOut ? 'checked_out' : r.checkIn ? 'checked_in' : 'not_checked_in',
    durationMinutes: r.durationMinutes, createdAt: r.createdAt
  }))});
}));

// ── employeeAttendance.js ─────────────────────────────────────────────────────

// Get employee's own records (date range filter)
router.get('/employee', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, startDate, endDate } = req.query;
  const filter = { userId: req.user._id };
  if (startDate && endDate) filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };

  const records = await Attendance.find(filter).sort({ date: -1 }).limit(limit * 1).skip((page - 1) * limit);
  res.json({ success: true, data: records });
}));

// Get today's attendance (date-range approach, returns single record)
router.get('/employee/today', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const record   = await Attendance.findOne({ userId: req.user._id, date: { $gte: today, $lt: tomorrow } });
  res.json({ success: true, data: record });
}));

// Alternative check-in (hyphenated path, used by some frontend components)
router.post('/check-in', attendanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    setLegacyPunchDeprecationHeaders(res);
    recordDeprecatedPunchMetric('/api/attendance/check-in', 'POST');
    const { location, notes, timestamp, verificationMethod, photoUrl, photoHash, biometricData, device } = req.body;
    const orgId = getOrgIdFromRequest(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context missing' });
    const targetEmployeeId = await resolveTargetEmployeeId(req, null);
    const checkInData = { location, notes, timestamp, verificationMethod, photoUrl, photoHash, biometricData, device };
    const attendance = await AttendanceService.checkIn(orgId, targetEmployeeId, checkInData);
    res.json({ success: true, message: 'Checked in successfully', data: attendance });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}));

// Alternative check-out (hyphenated path)
router.post('/check-out', attendanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    setLegacyPunchDeprecationHeaders(res);
    recordDeprecatedPunchMetric('/api/attendance/check-out', 'POST');
    const orgId = getOrgIdFromRequest(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context missing' });
    const targetEmployeeId = await resolveTargetEmployeeId(req, null);
    const attendance = await AttendanceService.checkOut(orgId, targetEmployeeId, req.body || {});
    res.json({ success: true, message: 'Checked out successfully', data: attendance });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}));

// Employee weekly stats
router.get('/employee/stats/weekly', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
  const records     = await Attendance.find({ userId: req.user._id, date: { $gte: startOfWeek }, checkOut: { $exists: true } });
  const totalHours  = records.reduce((s, r) => s + (r.durationMinutes || 0), 0) / 60;
  const daysWorked  = records.length;
  res.json({ success: true, data: { totalHours: Math.round(totalHours * 100) / 100, daysWorked, averageHours: Math.round((daysWorked > 0 ? totalHours / daysWorked : 0) * 100) / 100 } });
}));

// Employee monthly stats
router.get('/employee/stats/monthly', attendanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const records      = await Attendance.find({ userId: req.user._id, date: { $gte: startOfMonth }, checkOut: { $exists: true } });
  const totalHours   = records.reduce((s, r) => s + (r.durationMinutes || 0), 0) / 60;
  const daysWorked   = records.length;
  res.json({ success: true, data: { totalHours: Math.round(totalHours * 100) / 100, daysWorked, averageHours: Math.round((daysWorked > 0 ? totalHours / daysWorked : 0) * 100) / 100 } });
}));

module.exports = router;
