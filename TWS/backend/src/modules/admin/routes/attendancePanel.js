const express = require('express');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const Attendance = require('../../../models/hr-payroll/Attendance');
const Employee = require('../../../models/hr-payroll/Employee');
const csv = require('csv-writer').createObjectCsvWriter;

const router = express.Router();
const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });

// Get attendance records for admin panel
router.get('/records', [
  attendanceRead,
  query('date').optional().isISO8601(),
  query('status').optional().isIn(['present', 'absent', 'late', 'pending']),
  query('workMode').optional().isIn(['office', 'remote', 'hybrid']),
  query('department').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { date, status, workMode, department } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    // Build query
    const query = { date: filterDate };
    if (status) query.status = status;
    if (workMode) query.workMode = workMode;

    // Get attendance records with employee details
    const attendanceRecords = await Attendance.find(query)
      .populate('userId', 'name email employeeId department')
      .sort({ 'checkIn.timestamp': -1 });

    // Filter by department if specified
    let filteredRecords = attendanceRecords;
    if (department) {
      filteredRecords = attendanceRecords.filter(record => 
        record.userId?.department === department
      );
    }

    // Format the response
    const formattedRecords = filteredRecords.map(record => ({
      _id: record._id,
      employeeName: record.userId?.name || 'Unknown',
      employeeId: record.userId?.employeeId || record.employeeId,
      department: record.userId?.department || 'Unknown',
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      workMode: record.workMode || 'office',
      status: record.status,
      durationMinutes: record.durationMinutes,
      qualityScore: record.qualityScore,
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      data: formattedRecords,
      total: formattedRecords.length
    });
  } catch (error) {
    console.error('Failed to fetch attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
}));

// Get attendance statistics for admin panel
router.get('/stats', [
  attendanceRead,
  query('date').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { date } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    // Get total employees
    const totalEmployees = await Employee.countDocuments({
      organizationId: req.user.organizationId
    });

    // Get attendance records for the date
    const attendanceRecords = await Attendance.find({ date: filterDate })
      .populate('userId', 'department');

    // Calculate statistics
    const presentToday = attendanceRecords.filter(record => record.status === 'present').length;
    const absentToday = totalEmployees - presentToday;
    const lateArrivals = attendanceRecords.filter(record => record.status === 'late').length;
    
    const remoteWorkers = attendanceRecords.filter(record => record.workMode === 'remote').length;
    const officeWorkers = attendanceRecords.filter(record => record.workMode === 'office').length;
    const hybridWorkers = attendanceRecords.filter(record => record.workMode === 'hybrid').length;

    const stats = {
      totalEmployees,
      presentToday,
      absentToday,
      lateArrivals,
      remoteWorkers,
      officeWorkers,
      hybridWorkers,
      attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to fetch attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance stats',
      error: error.message
    });
  }
}));

// Approve attendance record
router.post('/approve/:recordId', [
  attendanceWrite
], ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { recordId } = req.params;

    const attendance = await Attendance.findById(recordId);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Update attendance record
    attendance.hrApproved = true;
    attendance.approvedBy = req.user._id;
    attendance.approvedAt = new Date();
    attendance.status = 'present';

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance approved successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Failed to approve attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve attendance',
      error: error.message
    });
  }
}));

// Reject attendance record
router.post('/reject/:recordId', [
  attendanceWrite,
  body('reason').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { recordId } = req.params;
    const { reason } = req.body;

    const attendance = await Attendance.findById(recordId);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Update attendance record
    attendance.hrApproved = false;
    attendance.rejectedBy = req.user._id;
    attendance.rejectedAt = new Date();
    attendance.rejectionReason = reason;
    attendance.status = 'rejected';

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance rejected successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Failed to reject attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject attendance',
      error: error.message
    });
  }
}));

// Bulk action on attendance records
router.post('/bulk-action', [
  attendanceWrite,
  body('recordIds').isArray().notEmpty(),
  body('action').isIn(['approve', 'reject', 'delete'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { recordIds, action } = req.body;

    let updateData = {};
    let message = '';

    switch (action) {
      case 'approve':
        updateData = {
          hrApproved: true,
          approvedBy: req.user._id,
          approvedAt: new Date(),
          status: 'present'
        };
        message = 'Attendance records approved successfully';
        break;
      case 'reject':
        updateData = {
          hrApproved: false,
          rejectedBy: req.user._id,
          rejectedAt: new Date(),
          status: 'rejected'
        };
        message = 'Attendance records rejected successfully';
        break;
      case 'delete':
        await Attendance.deleteMany({ _id: { $in: recordIds } });
        return res.json({
          success: true,
          message: 'Attendance records deleted successfully'
        });
    }

    const result = await Attendance.updateMany(
      { _id: { $in: recordIds } },
      updateData
    );

    res.json({
      success: true,
      message,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Failed to perform bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error.message
    });
  }
}));

// Export attendance data
router.get('/export', [
  attendanceRead,
  query('date').optional().isISO8601(),
  query('status').optional().isIn(['present', 'absent', 'late', 'pending']),
  query('workMode').optional().isIn(['office', 'remote', 'hybrid']),
  query('department').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { date, status, workMode, department } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    // Build query
    const query = { date: filterDate };
    if (status) query.status = status;
    if (workMode) query.workMode = workMode;

    // Get attendance records with employee details
    const attendanceRecords = await Attendance.find(query)
      .populate('userId', 'name email employeeId department')
      .sort({ 'checkIn.timestamp': -1 });

    // Filter by department if specified
    let filteredRecords = attendanceRecords;
    if (department) {
      filteredRecords = attendanceRecords.filter(record => 
        record.userId?.department === department
      );
    }

    // Format data for CSV
    const csvData = filteredRecords.map(record => ({
      'Employee Name': record.userId?.name || 'Unknown',
      'Employee ID': record.userId?.employeeId || record.employeeId,
      'Department': record.userId?.department || 'Unknown',
      'Check In Time': record.checkIn?.timestamp ? new Date(record.checkIn.timestamp).toLocaleString() : 'Not checked in',
      'Check Out Time': record.checkOut?.timestamp ? new Date(record.checkOut.timestamp).toLocaleString() : 'Not checked out',
      'Work Mode': record.workMode || 'office',
      'Status': record.status,
      'Duration (Hours)': record.durationMinutes ? Math.round((record.durationMinutes / 60) * 100) / 100 : 0,
      'Quality Score': record.qualityScore || 100,
      'Location': record.checkIn?.location?.address || 'N/A',
      'Approved': record.hrApproved ? 'Yes' : 'No',
      'Date': record.date
    }));

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${filterDate}.csv"`);

    // Create CSV content
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    res.send(csvContent);
  } catch (error) {
    console.error('Failed to export attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance data',
      error: error.message
    });
  }
}));

// Get real-time attendance updates
router.get('/realtime-updates', [
  attendanceRead
], ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // This endpoint can be used for polling if WebSocket is not available
    const recentUpdates = await Attendance.find({
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    })
      .populate('userId', 'name employeeId')
      .sort({ createdAt: -1 })
      .limit(10);

    const updates = recentUpdates.map(record => ({
      id: record._id,
      type: record.checkOut ? 'checkOut' : 'checkIn',
      employeeName: record.userId?.name,
      employeeId: record.userId?.employeeId,
      timestamp: record.checkOut?.timestamp || record.checkIn?.timestamp,
      workMode: record.workMode,
      location: record.checkIn?.location?.address
    }));

    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Failed to fetch real-time updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time updates',
      error: error.message
    });
  }
}));

module.exports = router;
