const Attendance = require('../../models/hr-payroll/Attendance');
const Employee = require('../../models/hr-payroll/Employee');

function normalizeDeviceValue(device) {
  if (!device) return undefined;
  if (typeof device === 'string') return device;
  if (typeof device === 'object') {
    return device.userAgent || device.type || undefined;
  }
  return String(device);
}

class AttendanceService {
  /**
   * Get attendance records
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Attendance records with pagination
   */
  async getAttendanceRecords(orgId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        employeeId,
        startDate,
        endDate,
        status,
        department
      } = filters;

      const query = { organizationId: orgId };

      if (employeeId) {
        const employeeQuery = {
          $or: [
            { _id: employeeId },
            { employeeId: employeeId }
          ]
        };
        if (orgId) {
          employeeQuery.$and = [{ $or: [{ organizationId: orgId }, { orgId: orgId }] }];
        }
        const employee = await Employee.findOne(employeeQuery);
        if (employee) {
          query.userId = employee.userId;
        }
      }

      if (status) query.status = status;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [records, total] = await Promise.all([
        Attendance.find(query)
          .populate('userId', 'fullName email')
          .sort({ date: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Attendance.countDocuments(query)
      ]);

      return {
        records: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error getting attendance records:', error);
      throw error;
    }
  }

  /**
   * Employee check-in
   * @param {string} orgId - Organization ID
   * @param {string} employeeId - Employee ID
   * @param {Object} checkInData - Check-in data
   * @returns {Object} Attendance record
   */
  async checkIn(orgId, employeeId, checkInData) {
    try {
      const employeeQuery = {
        $or: [
          { _id: employeeId },
          { employeeId: employeeId },
          { userId: employeeId }
        ]
      };
      if (orgId) {
        employeeQuery.$and = [{ $or: [{ organizationId: orgId }, { orgId: orgId }] }];
      }
      const employee = await Employee.findOne(employeeQuery);

      if (!employee) {
        throw new Error('Employee not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if already checked in today
      const existing = await Attendance.findOne({
        userId: employee.userId,
        organizationId: orgId,
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      });

      if (existing && existing.checkIn?.timestamp) {
        throw new Error('Already checked in today');
      }

      const attendance = existing || new Attendance({
        userId: employee.userId,
        employeeId: employee.employeeId,
        organizationId: orgId,
        date: new Date(),
        status: 'present',
        isActive: true
      });

      attendance.checkIn = {
        timestamp: new Date(),
        location: checkInData.location || {},
        device: normalizeDeviceValue(checkInData.device),
        photoUrl: checkInData.photoUrl,
        photoHash: checkInData.photoHash,
        biometricData: checkInData.biometricData || {},
        notes: checkInData.notes,
        verified: checkInData.verified || false,
        verificationMethod: checkInData.verificationMethod || 'manual'
      };

      attendance.isActive = true;
      attendance.lastActivity = new Date();

      await attendance.save();
      await attendance.populate('userId', 'fullName email');

      return attendance;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  /**
   * Employee check-out
   * @param {string} orgId - Organization ID
   * @param {string} employeeId - Employee ID
   * @param {Object} checkOutData - Check-out data
   * @returns {Object} Attendance record
   */
  async checkOut(orgId, employeeId, checkOutData) {
    try {
      const employeeQuery = {
        $or: [
          { _id: employeeId },
          { employeeId: employeeId },
          { userId: employeeId }
        ]
      };
      if (orgId) {
        employeeQuery.$and = [{ $or: [{ organizationId: orgId }, { orgId: orgId }] }];
      }
      const employee = await Employee.findOne(employeeQuery);

      if (!employee) {
        throw new Error('Employee not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        userId: employee.userId,
        organizationId: orgId,
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      });

      if (!attendance || !attendance.checkIn?.timestamp) {
        throw new Error('No check-in found for today');
      }

      if (attendance.checkOut?.timestamp) {
        throw new Error('Already checked out today');
      }

      attendance.checkOut = {
        timestamp: new Date(),
        location: checkOutData.location || {},
        device: normalizeDeviceValue(checkOutData.device),
        photoUrl: checkOutData.photoUrl,
        photoHash: checkOutData.photoHash,
        biometricData: checkOutData.biometricData || {},
        notes: checkOutData.notes,
        verified: checkOutData.verified || false,
        verificationMethod: checkOutData.verificationMethod || 'manual'
      };

      // Calculate duration
      const checkInTime = new Date(attendance.checkIn.timestamp);
      const checkOutTime = new Date(attendance.checkOut.timestamp);
      const durationMs = checkOutTime - checkInTime;
      attendance.durationMinutes = Math.floor(durationMs / (1000 * 60));

      // Calculate overtime (if > 8 hours)
      const standardHours = 8 * 60; // 8 hours in minutes
      if (attendance.durationMinutes > standardHours) {
        attendance.overtimeMinutes = attendance.durationMinutes - standardHours;
      }

      attendance.isActive = false;
      await attendance.save();
      await attendance.populate('userId', 'fullName email');

      return attendance;
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  /**
   * Get attendance reports
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Attendance report
   */
  async getAttendanceReports(orgId, filters = {}) {
    try {
      const {
        startDate,
        endDate,
        employeeId,
        department
      } = filters;

      const query = { organizationId: orgId };

      if (employeeId) {
        const employeeQuery = {
          $or: [
            { _id: employeeId },
            { employeeId: employeeId }
          ]
        };
        if (orgId) {
          employeeQuery.$and = [{ $or: [{ organizationId: orgId }, { orgId: orgId }] }];
        }
        const employee = await Employee.findOne(employeeQuery);
        if (employee) {
          query.userId = employee.userId;
        }
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const records = await Attendance.find(query)
        .populate('userId', 'fullName email')
        .sort({ date: 1 })
        .lean();

      // Calculate statistics
      const stats = {
        totalDays: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        totalHours: records.reduce((sum, r) => sum + (r.durationMinutes || 0) / 60, 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0) / 60, 0),
        averageHoursPerDay: 0,
        attendanceRate: 0
      };

      if (stats.totalDays > 0) {
        stats.averageHoursPerDay = stats.totalHours / stats.totalDays;
        stats.attendanceRate = (stats.present / stats.totalDays) * 100;
      }

      return {
        records: records,
        statistics: stats,
        period: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting attendance reports:', error);
      throw error;
    }
  }
}

module.exports = new AttendanceService();
