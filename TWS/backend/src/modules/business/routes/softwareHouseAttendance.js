const express = require('express');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const Attendance = require('../../../models/Attendance');
const Employee = require('../../../models/Employee');
const Project = require('../../../models/Project');
const Team = require('../../../models/Team');

const router = express.Router();

// Software House Check In with project and work mode
router.post('/checkin', [
  attendanceWrite,
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat(),
  body('location.address').optional().notEmpty(),
  body('location.accuracy').optional().isFloat(),
  body('photoUrl').optional().isURL(),
  body('biometricData.fingerprint').optional().notEmpty(),
  body('biometricData.faceId').optional().notEmpty(),
  body('biometricData.voicePrint').optional().notEmpty(),
  body('workMode').isIn(['office', 'remote', 'hybrid']),
  body('currentProject').optional().notEmpty(),
  body('teamStatus').isIn(['available', 'busy', 'away', 'focus']),
  body('notes').optional().notEmpty(),
  body('timestamp').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { 
      location, 
      photoUrl, 
      biometricData, 
      workMode, 
      currentProject, 
      teamStatus, 
      notes, 
      timestamp 
    } = req.body;
    
    const deviceInfo = {
      type: req.headers['user-agent'] || 'Unknown',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      screenResolution: req.headers['screen-resolution'] || 'Unknown'
    };

    const checkInData = {
      timestamp: timestamp || new Date(),
      location,
      photoUrl,
      biometricData,
      workMode,
      currentProject,
      teamStatus,
      notes,
      deviceInfo
    };

    // Create attendance record
    const attendance = new Attendance({
      userId: req.user._id,
      employeeId: req.user.employeeId,
      organizationId: req.user.organizationId,
      date: new Date().toISOString().split('T')[0],
      checkIn: checkInData,
      workMode,
      currentProject,
      teamStatus,
      status: 'present',
      isActive: true
    });

    await attendance.save();

    // Update employee status
    await Employee.findByIdAndUpdate(req.user._id, {
      currentStatus: teamStatus,
      workMode,
      currentProject,
      lastCheckIn: new Date()
    });

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: { attendance }
    });
  } catch (error) {
    console.error('Software house check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: error.message
    });
  }
}));

// Get today's productivity stats
router.get('/stats', [
  attendanceRead
], ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          totalHours: 0,
          productiveHours: 0,
          breakTime: 0,
          focusTime: 0,
          codeCommits: 0,
          tasksCompleted: 0,
          collaborationScore: 0
        }
      });
    }

    const totalHours = attendance.durationMinutes ? Math.round(attendance.durationMinutes / 60 * 10) / 10 : 0;
    const productiveHours = Math.round(totalHours * 0.8 * 10) / 10; // Assume 80% productive
    const breakTime = attendance.breakTime ? 
      attendance.breakTime.reduce((total, breakItem) => total + (breakItem.durationMinutes || 0), 0) / 60 : 0;
    const focusTime = attendance.focusTimeMinutes ? Math.round(attendance.focusTimeMinutes / 60 * 10) / 10 : 0;

    // Mock data for development metrics
    const codeCommits = Math.floor(Math.random() * 10) + 1;
    const tasksCompleted = Math.floor(Math.random() * 5) + 1;
    const collaborationScore = Math.floor(Math.random() * 30) + 70;

    res.json({
      success: true,
      data: {
        totalHours,
        productiveHours,
        breakTime: Math.round(breakTime * 10) / 10,
        focusTime,
        codeCommits,
        tasksCompleted,
        collaborationScore
      }
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
}));

// Get team activity
router.get('/team/activity', [
  attendanceRead
], ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Get team members from the same organization
    const teamMembers = await Employee.find({
      organizationId: req.user.organizationId,
      _id: { $ne: req.user._id }
    }).limit(10);

    const teamActivity = teamMembers.map(member => ({
      id: member._id,
      name: member.name,
      status: member.currentStatus || 'away',
      workMode: member.workMode || 'office',
      project: member.currentProject || 'General',
      lastActive: member.lastCheckIn || new Date()
    }));

    res.json({
      success: true,
      data: teamActivity
    });
  } catch (error) {
    console.error('Failed to fetch team activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team activity',
      error: error.message
    });
  }
}));

// Get sprint progress
router.get('/sprint/progress', [
  attendanceRead
], ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Mock sprint data - in real implementation, this would come from project management system
    const sprintProgress = {
      currentSprint: 'Sprint 24.1',
      daysRemaining: Math.floor(Math.random() * 10) + 1,
      tasksCompleted: Math.floor(Math.random() * 15) + 5,
      totalTasks: 20,
      velocity: Math.floor(Math.random() * 20) + 70
    };

    res.json({
      success: true,
      data: sprintProgress
    });
  } catch (error) {
    console.error('Failed to fetch sprint progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sprint progress',
      error: error.message
    });
  }
}));

// Toggle focus mode
router.post('/focus-mode/toggle', [
  attendanceWrite,
  body('enabled').isBoolean(),
  body('project').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { enabled, project } = req.body;
    
    // Update employee focus mode status
    await Employee.findByIdAndUpdate(req.user._id, {
      focusMode: enabled,
      currentProject: project || req.user.currentProject,
      currentStatus: enabled ? 'focus' : 'available'
    });

    // Update today's attendance record
    const today = new Date().toISOString().split('T')[0];
    await Attendance.findOneAndUpdate(
      { userId: req.user._id, date: today },
      { 
        $set: { 
          focusMode: enabled,
          currentProject: project || req.user.currentProject,
          teamStatus: enabled ? 'focus' : 'available'
        }
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: enabled ? 'Focus mode enabled' : 'Focus mode disabled',
      data: { focusMode: enabled }
    });
  } catch (error) {
    console.error('Failed to toggle focus mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle focus mode',
      error: error.message
    });
  }
}));

// Get productivity analytics
router.get('/analytics/productivity', [
  attendanceRead,
  query('range').optional().isIn(['1d', '7d', '30d', '90d'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendanceRecords = await Attendance.find({
      userId: req.user._id,
      date: { $gte: startDate.toISOString().split('T')[0] }
    });

    // Calculate analytics
    const totalHours = attendanceRecords.reduce((total, record) => {
      return total + (record.durationMinutes ? record.durationMinutes / 60 : 0);
    }, 0);

    const productiveHours = totalHours * 0.8; // Assume 80% productive
    const focusTime = attendanceRecords.reduce((total, record) => {
      return total + (record.focusTimeMinutes ? record.focusTimeMinutes / 60 : 0);
    }, 0);

    const breakTime = attendanceRecords.reduce((total, record) => {
      if (record.breakTime) {
        return total + record.breakTime.reduce((breakTotal, breakItem) => {
          return breakTotal + (breakItem.durationMinutes || 0);
        }, 0) / 60;
      }
      return total;
    }, 0);

    const efficiency = totalHours > 0 ? Math.round((productiveHours / totalHours) * 100) : 0;

    // Mock development metrics
    const codeCommits = Math.floor(Math.random() * 50) + 20;
    const linesOfCode = Math.floor(Math.random() * 2000) + 1000;
    const bugsFixed = Math.floor(Math.random() * 10) + 5;
    const featuresCompleted = Math.floor(Math.random() * 8) + 3;
    const codeQuality = Math.floor(Math.random() * 20) + 80;

    // Mock collaboration metrics
    const meetingsAttended = Math.floor(Math.random() * 15) + 5;
    const messagesSent = Math.floor(Math.random() * 100) + 50;
    const reviewsCompleted = Math.floor(Math.random() * 20) + 10;
    const mentoringHours = Math.floor(Math.random() * 10) + 2;
    const teamContribution = Math.floor(Math.random() * 20) + 75;

    // Mock wellbeing metrics
    const workLifeBalance = Math.floor(Math.random() * 20) + 70;
    const stressLevel = Math.floor(Math.random() * 30) + 20;
    const satisfaction = Math.floor(Math.random() * 15) + 80;
    const energyLevel = Math.floor(Math.random() * 25) + 65;
    const motivation = Math.floor(Math.random() * 20) + 75;

    const analytics = {
      productivity: {
        totalHours: Math.round(totalHours * 10) / 10,
        productiveHours: Math.round(productiveHours * 10) / 10,
        focusTime: Math.round(focusTime * 10) / 10,
        breakTime: Math.round(breakTime * 10) / 10,
        efficiency
      },
      development: {
        codeCommits,
        linesOfCode,
        bugsFixed,
        featuresCompleted,
        codeQuality
      },
      collaboration: {
        meetingsAttended,
        messagesSent,
        reviewsCompleted,
        mentoringHours,
        teamContribution
      },
      wellbeing: {
        workLifeBalance,
        stressLevel,
        satisfaction,
        energyLevel,
        motivation
      }
    };

    // Mock trends
    const trends = {
      productivity: Math.random() > 0.5 ? 'up' : 'stable',
      development: Math.random() > 0.3 ? 'up' : 'stable',
      collaboration: Math.random() > 0.4 ? 'up' : 'stable',
      wellbeing: Math.random() > 0.6 ? 'up' : 'stable'
    };

    res.json({
      success: true,
      data: analytics,
      trends
    });
  } catch (error) {
    console.error('Failed to fetch productivity analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch productivity analytics',
      error: error.message
    });
  }
}));

// Get AI insights
router.get('/analytics/insights', [
  attendanceRead,
  query('range').optional().isIn(['1d', '7d', '30d', '90d'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    
    // Mock AI insights - in real implementation, this would use ML models
    const insights = [
      {
        title: "Peak Productivity Hours",
        description: "Your most productive hours are between 10 AM and 2 PM. Consider scheduling important tasks during this time.",
        recommendation: "Block your calendar for deep work during peak hours"
      },
      {
        title: "Break Optimization",
        description: "Taking breaks every 90 minutes increases your productivity by 15%. You're currently averaging 2-hour work blocks.",
        recommendation: "Set a timer for 90-minute work sessions followed by 15-minute breaks"
      },
      {
        title: "Focus Mode Impact",
        description: "When you use focus mode, your code quality score increases by 12% and you complete tasks 20% faster.",
        recommendation: "Enable focus mode for complex coding tasks"
      },
      {
        title: "Team Collaboration",
        description: "Your collaboration score is above average. You're particularly effective in code reviews and mentoring.",
        recommendation: "Consider taking on more mentoring opportunities"
      }
    ];

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: error.message
    });
  }
}));

module.exports = router;
