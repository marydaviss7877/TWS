class AttendanceSocketService {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  // Helper: broadcast only to sockets in the same tenant
  _toTenant(orgId) {
    return this.io.to(`tenant:${orgId}`);
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      // orgId is set by the Socket.IO JWT auth middleware in app.js
      const orgId = socket.user?.orgId;

      // Handle employee check-in
      socket.on('attendanceCheckIn', async (data) => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          this._toTenant(orgId).emit('adminAttendanceUpdate', {
            type: 'checkIn',
            userId: data.userId,
            employeeId: data.employeeId,
            timestamp: data.timestamp,
            location: data.location,
            workMode: data.workMode,
            currentProject: data.currentProject,
            message: `Employee ${data.employeeId} checked in at ${new Date(data.timestamp).toLocaleTimeString()}`
          });

          this._toTenant(orgId).emit('teamActivityUpdate', {
            type: 'checkIn',
            userId: data.userId,
            employeeId: data.employeeId,
            timestamp: data.timestamp,
            workMode: data.workMode,
            currentProject: data.currentProject
          });
        } catch (error) {
          console.error('Error handling check-in:', error);
          socket.emit('error', { message: 'Failed to process check-in' });
        }
      });

      // Handle employee check-out
      socket.on('attendanceCheckOut', async (data) => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          this._toTenant(orgId).emit('adminAttendanceUpdate', {
            type: 'checkOut',
            userId: data.userId,
            employeeId: data.employeeId,
            timestamp: data.timestamp,
            location: data.location,
            message: `Employee ${data.employeeId} checked out at ${new Date(data.timestamp).toLocaleTimeString()}`
          });

          this._toTenant(orgId).emit('teamActivityUpdate', {
            type: 'checkOut',
            userId: data.userId,
            employeeId: data.employeeId,
            timestamp: data.timestamp
          });
        } catch (error) {
          console.error('Error handling check-out:', error);
          socket.emit('error', { message: 'Failed to process check-out' });
        }
      });

      // Handle break start/end
      socket.on('attendanceBreakUpdate', async (data) => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          this._toTenant(orgId).emit('teamActivityUpdate', {
            type: data.action, // 'breakStart' or 'breakEnd'
            userId: data.userId,
            employeeId: data.employeeId,
            timestamp: data.timestamp,
            duration: data.duration
          });
        } catch (error) {
          console.error('Error handling break update:', error);
          socket.emit('error', { message: 'Failed to process break update' });
        }
      });

      // Handle focus mode toggle
      socket.on('focusModeToggle', async (data) => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          this._toTenant(orgId).emit('teamActivityUpdate', {
            type: 'focusMode',
            userId: data.userId,
            employeeId: data.employeeId,
            enabled: data.enabled,
            timestamp: data.timestamp
          });
        } catch (error) {
          console.error('Error handling focus mode toggle:', error);
          socket.emit('error', { message: 'Failed to process focus mode toggle' });
        }
      });

      // Handle admin notifications
      socket.on('adminNotification', (data) => {
        try {
          if (!orgId) return;

          if (data.userId) {
            // Specific user within the tenant room
            this.io.to(data.userId).emit('adminNotification', data);
          } else {
            // All users in this tenant only
            this._toTenant(orgId).emit('adminNotification', data);
          }
        } catch (error) {
          console.error('Error sending admin notification:', error);
        }
      });

      // Handle admin attendance approval/rejection
      socket.on('adminAttendanceAction', async (data) => {
        try {
          // Notify specific employee (user-room, already scoped by userId)
          this.io.to(data.userId).emit('attendanceAction', {
            type: data.action, // 'approved', 'rejected', 'modified'
            attendanceId: data.attendanceId,
            message: data.message,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error handling admin attendance action:', error);
          socket.emit('error', { message: 'Failed to process attendance action' });
        }
      });

      // Handle real-time attendance monitoring — join tenant-scoped room
      socket.on('joinAttendanceMonitoring', () => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          socket.join(`tenant:${orgId}:attendance-monitoring`);
          socket.emit('attendanceStatusUpdate', {
            type: 'initial',
            message: 'Connected to attendance monitoring'
          });
        } catch (error) {
          console.error('Error joining attendance monitoring:', error);
          socket.emit('error', { message: 'Failed to join attendance monitoring' });
        }
      });

      // Handle team activity monitoring — join tenant-scoped room
      socket.on('joinTeamActivity', () => {
        try {
          if (!orgId) return socket.emit('error', { message: 'Not authenticated' });

          socket.join(`tenant:${orgId}:team-activity`);
          socket.emit('teamActivityStatus', {
            type: 'initial',
            message: 'Connected to team activity monitoring'
          });
        } catch (error) {
          console.error('Error joining team activity:', error);
          socket.emit('error', { message: 'Failed to join team activity monitoring' });
        }
      });

      socket.on('disconnect', () => {
        // Socket.IO cleans up rooms automatically on disconnect
      });
    });
  }

  // Broadcast attendance updates to a specific tenant only
  broadcastAttendanceUpdate(orgId, updateData) {
    this._toTenant(orgId).emit('attendanceUpdate', updateData);
  }

  // Send notification to a specific user (by userId room)
  sendNotificationToUser(userId, notification) {
    this.io.to(userId).emit('notification', notification);
  }

  // Broadcast team activity to a specific tenant's team-activity room
  broadcastTeamActivity(orgId, activityData) {
    this.io.to(`tenant:${orgId}:team-activity`).emit('teamActivityUpdate', activityData);
  }

  // Broadcast admin updates to a specific tenant's attendance-monitoring room
  broadcastAdminUpdate(orgId, adminData) {
    this.io.to(`tenant:${orgId}:attendance-monitoring`).emit('adminAttendanceUpdate', adminData);
  }
}

module.exports = AttendanceSocketService;
