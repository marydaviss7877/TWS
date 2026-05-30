const express = require('express');
const { body } = require('express-validator');
const { requireErpAccess } = require('../middleware/auth/erpAccessControl');
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });
const ErrorHandler = require('../middleware/common/errorHandler');
const ValidationMiddleware = require('../middleware/validation/validation');
const metricsService = require('../services/analytics/metrics.service');
const AttendanceService = require('../services/hr/attendance.service');

const router = express.Router();

function getOrgIdFromRequest(req) {
  if (req.tenantContext?.orgId) {
    return req.tenantContext.orgId;
  }
  if (req.user?.orgId) {
    if (typeof req.user.orgId === 'object') {
      return req.user.orgId._id || req.user.orgId;
    }
    return req.user.orgId;
  }
  return null;
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
    if (metricsService && metricsService.incrementDeprecatedAttendanceRequests) {
      metricsService.incrementDeprecatedAttendanceRequests(endpoint, method);
    }
  } catch (_) {
    // Metrics must never block request handling.
  }
}

async function resolveTargetEmployeeId(req, employeeId) {
  if (employeeId) {
    if (employeeId !== req.user?._id?.toString() && employeeId !== req.user?.employeeId?.toString()) {
      const attendanceWriteAccess = await requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: true })(req, {}, () => true);
      if (attendanceWriteAccess !== true) {
        const error = new Error('Not authorized to modify other employees attendance');
        error.statusCode = 403;
        throw error;
      }
    }
    return employeeId;
  }
  return req.user?.employeeId || req.user?._id;
}

// Canonical Check-in with comprehensive validation
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

// Canonical Check-out with comprehensive validation
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

module.exports = router;
