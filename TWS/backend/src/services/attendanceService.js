const Attendance = require('../models/hr-payroll/Attendance');
const AttendancePolicy = require('../models/hr-payroll/AttendancePolicy');
const AttendanceShift = require('../models/hr-payroll/AttendanceShift');
const AttendanceAudit = require('../models/hr-payroll/AttendanceAudit');
const Employee = require('../models/hr-payroll/Employee');
const BiometricService = require('./biometricService');
const crypto = require('crypto');

class AttendanceService {
  // Enhanced check-in with comprehensive validation
  static async checkIn(userId, checkInData, deviceInfo) {
    try {
      // Get employee record
      const employee = await Employee.findOne({ userId });
      if (!employee) {
        throw new Error('Employee record not found');
      }

      // Get applicable policy
      const policy = await this.getApplicablePolicy(employee);
      
      // Validate check-in time against policy
      await this.validateCheckInTime(checkInData.timestamp, policy);
      
      // Validate location against policy
      await this.validateLocation(checkInData.location, policy);
      
      // Check for existing attendance today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let attendance = await Attendance.findOne({
        userId,
        date: { $gte: today, $lt: tomorrow }
      });

      if (attendance && attendance.checkIn.timestamp) {
        throw new Error('Already checked in today');
      }

      // Enhance device info
      const enhancedDeviceInfo = {
        ...deviceInfo,
        deviceId: this.generateDeviceId(deviceInfo),
        browser: this.parseUserAgent(deviceInfo.userAgent).browser,
        os: this.parseUserAgent(deviceInfo.userAgent).os,
        screenResolution: deviceInfo.screenResolution || 'Unknown'
      };

      // Generate photo hash for verification
      const photoHash = checkInData.photoUrl ? 
        crypto.createHash('sha256').update(checkInData.photoUrl).digest('hex') : null;

      // Validate biometric data
      let validatedBiometricData = {};
      if (checkInData.biometricData) {
        if (checkInData.biometricData.fingerprint) {
          const fingerprintValidation = BiometricService.validateFingerprint(checkInData.biometricData.fingerprint);
          if (fingerprintValidation.valid) {
            validatedBiometricData.fingerprint = checkInData.biometricData.fingerprint;
          }
        }
        
        if (checkInData.biometricData.faceId) {
          const faceValidation = BiometricService.validateFaceId(checkInData.biometricData.faceId);
          if (faceValidation.valid) {
            validatedBiometricData.faceId = checkInData.biometricData.faceId;
          }
        }
        
        if (checkInData.biometricData.voicePrint) {
          const voiceValidation = BiometricService.validateVoicePrint(checkInData.biometricData.voicePrint);
          if (voiceValidation.valid) {
            validatedBiometricData.voicePrint = checkInData.biometricData.voicePrint;
          }
        }
      }

      const checkInRecord = {
        timestamp: checkInData.timestamp || new Date(),
        location: {
          ...checkInData.location,
          verified: await this.verifyLocation(checkInData.location, policy)
        },
        device: enhancedDeviceInfo,
        photoUrl: checkInData.photoUrl,
        photoHash,
        biometricData: validatedBiometricData,
        notes: checkInData.notes || '',
        verified: this.verifyCheckIn(checkInData, policy),
        verificationMethod: this.determineVerificationMethod(checkInData, policy)
      };

      if (attendance) {
        attendance.checkIn = checkInRecord;
        attendance.organizationId = employee.organizationId;
        attendance.policyId = policy._id;
        attendance.isActive = true;
        attendance.lastActivity = new Date();
      } else {
        attendance = new Attendance({
          userId,
          employeeId: employee.employeeId,
          organizationId: employee.organizationId,
          checkIn: checkInRecord,
          policyId: policy._id,
          isActive: true,
          lastActivity: new Date()
        });
      }

      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendance._id, userId, employee.employeeId, 'checkin', {
        performedBy: userId,
        performedByRole: 'employee',
        deviceInfo: enhancedDeviceInfo,
        newValues: { checkIn: checkInRecord }
      });

      return {
        success: true,
        data: {
          attendance,
          checkInTime: checkInRecord.timestamp,
          verificationStatus: checkInRecord.verified,
          riskLevel: attendance.riskLevel
        }
      };
    } catch (error) {
      throw new Error(`Check-in failed: ${error.message}`);
    }
  }

  // Enhanced check-out with comprehensive validation
  static async checkOut(userId, checkOutData, deviceInfo) {
    try {
      // Find today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await Attendance.findOne({
        userId,
        date: { $gte: today, $lt: tomorrow }
      });

      if (!attendance || !attendance.checkIn.timestamp) {
        throw new Error('Must check in first');
      }

      if (attendance.checkOut.timestamp) {
        throw new Error('Already checked out today');
      }

      // Get applicable policy
      const policy = await AttendancePolicy.findById(attendance.policyId);
      
      // Validate check-out time against policy
      await this.validateCheckOutTime(checkOutData.timestamp, policy, attendance.checkIn.timestamp);
      
      // Validate location against policy
      await this.validateLocation(checkOutData.location, policy);

      // Enhance device info
      const enhancedDeviceInfo = {
        ...deviceInfo,
        deviceId: this.generateDeviceId(deviceInfo),
        browser: this.parseUserAgent(deviceInfo.userAgent).browser,
        os: this.parseUserAgent(deviceInfo.userAgent).os,
        screenResolution: deviceInfo.screenResolution || 'Unknown'
      };

      // Generate photo hash for verification
      const photoHash = checkOutData.photoUrl ? 
        crypto.createHash('sha256').update(checkOutData.photoUrl).digest('hex') : null;

      // Validate biometric data
      let validatedBiometricData = {};
      if (checkOutData.biometricData) {
        if (checkOutData.biometricData.fingerprint) {
          const fingerprintValidation = BiometricService.validateFingerprint(checkOutData.biometricData.fingerprint);
          if (fingerprintValidation.valid) {
            validatedBiometricData.fingerprint = checkOutData.biometricData.fingerprint;
          }
        }
        
        if (checkOutData.biometricData.faceId) {
          const faceValidation = BiometricService.validateFaceId(checkOutData.biometricData.faceId);
          if (faceValidation.valid) {
            validatedBiometricData.faceId = checkOutData.biometricData.faceId;
          }
        }
        
        if (checkOutData.biometricData.voicePrint) {
          const voiceValidation = BiometricService.validateVoicePrint(checkOutData.biometricData.voicePrint);
          if (voiceValidation.valid) {
            validatedBiometricData.voicePrint = checkOutData.biometricData.voicePrint;
          }
        }
      }

      const checkOutRecord = {
        timestamp: checkOutData.timestamp || new Date(),
        location: {
          ...checkOutData.location,
          verified: await this.verifyLocation(checkOutData.location, policy)
        },
        device: enhancedDeviceInfo,
        photoUrl: checkOutData.photoUrl,
        photoHash,
        biometricData: validatedBiometricData,
        notes: checkOutData.notes || '',
        verified: this.verifyCheckOut(checkOutData, policy, attendance),
        verificationMethod: this.determineVerificationMethod(checkOutData, policy)
      };

      attendance.checkOut = checkOutRecord;
      attendance.isActive = false;
      attendance.lastActivity = new Date();

      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendance._id, userId, attendance.employeeId, 'checkout', {
        performedBy: userId,
        performedByRole: 'employee',
        deviceInfo: enhancedDeviceInfo,
        newValues: { checkOut: checkOutRecord }
      });

      return {
        success: true,
        data: {
          attendance,
          checkOutTime: checkOutRecord.timestamp,
          durationMinutes: attendance.durationMinutes,
          overtimeMinutes: attendance.overtimeMinutes,
          verificationStatus: checkOutRecord.verified,
          riskLevel: attendance.riskLevel,
          qualityScore: attendance.qualityScore
        }
      };
    } catch (error) {
      throw new Error(`Check-out failed: ${error.message}`);
    }
  }

  // Break management
  static async startBreak(userId, breakData) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await Attendance.findOne({
        userId,
        date: { $gte: today, $lt: tomorrow },
        isActive: true
      });

      if (!attendance || !attendance.checkIn.timestamp) {
        throw new Error('Must be checked in to start break');
      }

      if (attendance.checkOut.timestamp) {
        throw new Error('Cannot start break after checkout');
      }

      const breakEntry = attendance.startBreak(
        breakData.type || 'break',
        breakData.location,
        breakData.notes
      );

      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendance._id, userId, attendance.employeeId, 'break_start', {
        performedBy: userId,
        performedByRole: 'employee',
        newValues: { breakTime: breakEntry }
      });

      return {
        success: true,
        data: { breakEntry }
      };
    } catch (error) {
      throw new Error(`Start break failed: ${error.message}`);
    }
  }

  static async endBreak(userId, breakIndex) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await Attendance.findOne({
        userId,
        date: { $gte: today, $lt: tomorrow },
        isActive: true
      });

      if (!attendance || !attendance.checkIn.timestamp) {
        throw new Error('Must be checked in to end break');
      }

      if (!attendance.breakTime[breakIndex]) {
        throw new Error('Break not found');
      }

      attendance.endBreak(breakIndex);
      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendance._id, userId, attendance.employeeId, 'break_end', {
        performedBy: userId,
        performedByRole: 'employee',
        newValues: { breakTime: attendance.breakTime[breakIndex] }
      });

      return {
        success: true,
        data: { breakEntry: attendance.breakTime[breakIndex] }
      };
    } catch (error) {
      throw new Error(`End break failed: ${error.message}`);
    }
  }

  // Attendance correction workflow
  static async requestCorrection(userId, attendanceId, correctionData) {
    try {
      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      // Check permissions
      if (attendance.userId.toString() !== userId.toString()) {
        throw new Error('Not authorized to request correction for this record');
      }

      const correctionRequest = {
        requestedBy: userId,
        reason: correctionData.reason,
        requestedAt: new Date(),
        status: 'pending',
        changes: correctionData.changes || {}
      };

      attendance.correctionRequests.push(correctionRequest);
      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendanceId, userId, attendance.employeeId, 'correction_request', {
        performedBy: userId,
        performedByRole: 'employee',
        reason: correctionData.reason,
        newValues: { correctionRequests: correctionRequest }
      });

      return {
        success: true,
        data: { correctionRequest }
      };
    } catch (error) {
      throw new Error(`Correction request failed: ${error.message}`);
    }
  }

  static async approveCorrection(userId, attendanceId, correctionId, approvalData) {
    try {
      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      const correction = attendance.correctionRequests.id(correctionId);
      if (!correction) {
        throw new Error('Correction request not found');
      }

      correction.status = approvalData.status;
      correction.approvedBy = userId;
      correction.approvedAt = new Date();
      correction.comments = approvalData.comments;

      // Apply changes if approved
      if (approvalData.status === 'approved' && correction.changes) {
        if (correction.changes.checkIn) {
          attendance.checkIn = { ...attendance.checkIn, ...correction.changes.checkIn };
        }
        if (correction.changes.checkOut) {
          attendance.checkOut = { ...attendance.checkOut, ...correction.changes.checkOut };
        }
        if (correction.changes.status) {
          attendance.status = correction.changes.status;
        }
      }

      await attendance.save();

      // Create audit log
      await this.createAuditLog(attendanceId, userId, attendance.employeeId, 
        approvalData.status === 'approved' ? 'correction_approve' : 'correction_reject', {
        performedBy: userId,
        performedByRole: 'manager',
        reason: approvalData.comments,
        newValues: { correctionRequests: correction }
      });

      return {
        success: true,
        data: { correction }
      };
    } catch (error) {
      throw new Error(`Correction approval failed: ${error.message}`);
    }
  }

  // Analytics and reporting
  static async getAttendanceAnalytics(filters = {}) {
    try {
      const stats = await Attendance.getStatistics(filters);
      const suspiciousActivities = await Attendance.findSuspiciousActivities(filters);
      
      return {
        success: true,
        data: {
          statistics: stats[0] || {},
          suspiciousActivities,
          riskDistribution: this.calculateRiskDistribution(stats[0]?.riskDistribution || []),
          statusDistribution: this.calculateStatusDistribution(stats[0]?.statusDistribution || [])
        }
      };
    } catch (error) {
      throw new Error(`Analytics failed: ${error.message}`);
    }
  }

  // Helper methods
  static async getApplicablePolicy(employee) {
    const policies = await AttendancePolicy.find({
      organizationId: employee.organizationId,
      isActive: true,
      $or: [
        { 'applicableTo.roles': employee.role },
        { 'applicableTo.employees': employee._id }
      ],
      effectiveFrom: { $lte: new Date() },
      $or: [
        { effectiveTo: { $gte: new Date() } },
        { effectiveTo: { $exists: false } }
      ]
    }).sort({ effectiveFrom: -1 });

    return policies[0] || await this.getDefaultPolicy(employee.organizationId);
  }

  static async getDefaultPolicy(organizationId) {
    return await AttendancePolicy.findOne({
      organizationId,
      isActive: true,
      name: 'Default Policy'
    });
  }

  static async validateCheckInTime(timestamp, policy) {
    if (!policy) return;

    const checkInTime = new Date(timestamp);
    const hour = checkInTime.getHours();
    const minute = checkInTime.getMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Check if within allowed time range (with tolerance)
    const [startHour, startMinute] = policy.workingHours.dailySchedule.startTime.split(':');
    const [endHour, endMinute] = policy.workingHours.dailySchedule.endTime.split(':');
    
    const startTime = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTime = parseInt(endHour) * 60 + parseInt(endMinute);
    const checkInMinutes = hour * 60 + minute;
    
    if (checkInMinutes < startTime - policy.tolerance.gracePeriod || 
        checkInMinutes > endTime + policy.tolerance.gracePeriod) {
      throw new Error('Check-in time is outside allowed hours');
    }
  }

  static async validateCheckOutTime(timestamp, policy, checkInTime) {
    if (!policy) return;

    const checkOutTime = new Date(timestamp);
    const checkIn = new Date(checkInTime);
    
    // Check minimum work duration
    const durationMs = checkOutTime - checkIn;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 30) { // Minimum 30 minutes
      throw new Error('Work duration too short');
    }
  }

  static async validateLocation(location, policy) {
    if (!policy || !policy.locationPolicy.requireLocation) return;

    if (!location.latitude || !location.longitude) {
      throw new Error('Location is required');
    }

    // Check if location is within allowed areas
    const isWithinAllowedLocation = policy.locationPolicy.allowedLocations.some(allowedLoc => {
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        allowedLoc.latitude, allowedLoc.longitude
      );
      return distance <= allowedLoc.radius;
    });

    if (!isWithinAllowedLocation && !policy.locationPolicy.allowRemoteWork) {
      throw new Error('Location is not within allowed areas');
    }
  }

  static async verifyLocation(location, policy) {
    if (!policy || !policy.locationPolicy.requireLocation) return true;

    if (!location.latitude || !location.longitude) return false;

    return policy.locationPolicy.allowedLocations.some(allowedLoc => {
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        allowedLoc.latitude, allowedLoc.longitude
      );
      return distance <= allowedLoc.radius;
    });
  }

  static verifyCheckIn(checkInData, policy) {
    if (!policy) return true;

    let verified = true;

    // Check photo requirement
    if (policy.security.requirePhoto && !checkInData.photoUrl) {
      verified = false;
    }

    // Check biometric requirement
    if (policy.security.requireBiometric && 
        !checkInData.biometricData.fingerprint && 
        !checkInData.biometricData.faceId) {
      verified = false;
    }

    return verified;
  }

  static verifyCheckOut(checkOutData, policy, attendance) {
    if (!policy) return true;

    let verified = true;

    // Check photo requirement
    if (policy.security.requirePhoto && !checkOutData.photoUrl) {
      verified = false;
    }

    // Check biometric requirement
    if (policy.security.requireBiometric && 
        !checkOutData.biometricData.fingerprint && 
        !checkOutData.biometricData.faceId) {
      verified = false;
    }

    // Check device consistency
    if (attendance.checkIn.device.deviceId && 
        checkOutData.device.deviceId &&
        attendance.checkIn.device.deviceId !== checkOutData.device.deviceId) {
      verified = false;
    }

    return verified;
  }

  static determineVerificationMethod(checkData, policy) {
    if (policy.security.requireBiometric && 
        (checkData.biometricData.fingerprint || checkData.biometricData.faceId)) {
      return 'biometric';
    }
    if (policy.security.requirePhoto && checkData.photoUrl) {
      return 'photo';
    }
    if (policy.locationPolicy.requireLocation && checkData.location) {
      return 'location';
    }
    return 'manual';
  }

  static generateDeviceId(deviceInfo) {
    const deviceString = `${deviceInfo.userAgent}-${deviceInfo.ipAddress}`;
    return crypto.createHash('md5').update(deviceString).digest('hex');
  }

  static parseUserAgent(userAgent) {
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' : 'Unknown';
    
    const os = userAgent.includes('Windows') ? 'Windows' :
               userAgent.includes('Mac') ? 'macOS' :
               userAgent.includes('Linux') ? 'Linux' :
               userAgent.includes('Android') ? 'Android' :
               userAgent.includes('iOS') ? 'iOS' : 'Unknown';

    return { browser, os };
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  static calculateRiskDistribution(riskLevels) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    riskLevels.forEach(level => {
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });
    return distribution;
  }

  static calculateStatusDistribution(statuses) {
    const distribution = {};
    statuses.forEach(status => {
      distribution[status] = (distribution[status] || 0) + 1;
    });
    return distribution;
  }

  static async createAuditLog(attendanceId, userId, employeeId, action, auditData) {
    try {
      const auditLog = new AttendanceAudit({
        attendanceId,
        userId,
        employeeId,
        action,
        ...auditData,
        timestamp: new Date()
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

module.exports = AttendanceService;
