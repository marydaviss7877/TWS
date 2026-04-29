const jwtService = require('./auth/jwt.service');
const User = require('../../models/users-auth/User');
// Chat and Message models removed
const metricsService = require('./metricsService');
const websocketRateLimitService = require('./websocketRateLimitService');
const auditService = require('./compliance/audit.service');

const socketHandler = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const ip = socket.handshake.address;
      
      if (!token) {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED,
          null,
          null,
          {
            reason: 'No token provided in WebSocket connection',
            details: { ip },
            ipAddress: ip,
            severity: 'medium'
          }
        );
        return next(new Error('Authentication error'));
      }

      // Check if IP is blocked
      const isIPBlocked = await websocketRateLimitService.isIPBlocked(ip);
      if (isIPBlocked) {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED,
          null,
          null,
          {
            reason: 'Blocked IP attempted WebSocket connection',
            details: { ip },
            ipAddress: ip,
            severity: 'high'
          }
        );
        return next(new Error('Access denied'));
      }

      // Verify token using secure JWT service
      const decoded = jwtService.verifyAccessToken(token);
      const user = await User.findById(decoded.userId)
        .select('-password -refreshTokens -twoFASecret')
        .populate('orgId', 'name slug status');
      
      if (!user || user.status !== 'active') {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED,
          decoded.userId,
          null,
          {
            reason: 'Invalid or inactive user in WebSocket connection',
            details: { userId: decoded.userId, status: user?.status },
            ipAddress: ip,
            severity: 'medium'
          }
        );
        return next(new Error('Authentication error'));
      }

      // Check if user is blocked
      const isUserBlocked = await websocketRateLimitService.isUserBlocked(user._id);
      if (isUserBlocked) {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED,
          user._id,
          user.orgId,
          {
            reason: 'Blocked user attempted WebSocket connection',
            details: { userId: user._id },
            ipAddress: ip,
            severity: 'high'
          }
        );
        return next(new Error('Access denied'));
      }

      // Check connection rate limit
      const connectionCheck = await websocketRateLimitService.checkConnectionLimit(socket, user._id);
      if (!connectionCheck.allowed) {
        await auditService.logSecurityEvent(
          auditService.auditActions.RATE_LIMIT_EXCEEDED,
          user._id,
          user.orgId,
          {
            reason: 'WebSocket connection rate limit exceeded',
            details: { reason: connectionCheck.reason },
            ipAddress: ip,
            severity: 'medium'
          }
        );
        return next(new Error('Rate limit exceeded'));
      }

      socket.userId = user._id;
      socket.user = user;
      socket.ip = ip;
      next();
    } catch (err) {
      await auditService.logSecurityEvent(
        auditService.auditActions.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'WebSocket authentication error',
          details: { error: err.message },
          ipAddress: socket.handshake.address,
          severity: 'medium'
        }
      );
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.fullName} connected`);
    
    // Update socket connection metrics
    metricsService.updateSocketConnections(io.engine.clientsCount);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    metricsService.updateSocketConnectionsByRoom('user', socket.userId, 
      io.sockets.adapter.rooms.get(`user:${socket.userId}`)?.size || 0);

    // Join user to their team rooms
    if (socket.user.teamIds && socket.user.teamIds.length > 0) {
      socket.user.teamIds.forEach(teamId => {
        socket.join(`team:${teamId}`);
        metricsService.updateSocketConnectionsByRoom('team', teamId, 
          io.sockets.adapter.rooms.get(`team:${teamId}`)?.size || 0);
      });
    }

    // Chat rooms removed - messaging system removed

    // Finance Dashboard Events
    socket.on('finance:subscribe', () => {
      socket.join(`finance:${socket.user.orgId}`);
      socket.emit('finance:subscribed', { orgId: socket.user.orgId });
    });

    socket.on('finance:unsubscribe', () => {
      socket.leave(`finance:${socket.user.orgId}`);
      socket.emit('finance:unsubscribed');
    });

    // Project board events
    socket.on('join-board', (boardId) => {
      socket.join(`board:${boardId}`);
      socket.emit('joined-board', { boardId });
    });

    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.emit('left-board', { boardId });
    });

    // Card events
    socket.on('card:moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:moved', {
        ...data,
        movedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('card:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:updated', {
        ...data,
        updatedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('card:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:created', {
        ...data,
        createdBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('card:commented', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:commented', {
        ...data,
        commentedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    // Legacy task events (for backward compatibility)
    socket.on('task-updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('task-updated', {
        ...data,
        updatedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('task-moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('task-moved', {
        ...data,
        movedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('task-commented', (data) => {
      socket.to(`board:${data.boardId}`).emit('task-commented', {
        ...data,
        commentedBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('task-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('task-created', {
        ...data,
        createdBy: socket.user.fullName,
        timestamp: new Date()
      });
    });

    // Attendance events
    socket.on('check-in', (data) => {
      if (socket.user.teamIds && socket.user.teamIds.length > 0) {
        socket.user.teamIds.forEach(teamId => {
          socket.to(`team:${teamId}`).emit('user-checked-in', {
            userId: socket.userId,
            userName: socket.user.fullName,
            timestamp: new Date(),
            ...data
          });
        });
      }
    });

    socket.on('check-out', (data) => {
      if (socket.user.teamIds && socket.user.teamIds.length > 0) {
        socket.user.teamIds.forEach(teamId => {
          socket.to(`team:${teamId}`).emit('user-checked-out', {
            userId: socket.userId,
            userName: socket.user.fullName,
            timestamp: new Date(),
            ...data
          });
        });
      }
    });

    // Notification events
    socket.on('send-notification', (data) => {
      if (data.userId) {
        // Send to specific user
        io.to(`user:${data.userId}`).emit('notification', {
          ...data,
          from: socket.user.fullName,
          timestamp: new Date()
        });
      } else if (data.teamId) {
        // Send to team
        io.to(`team:${data.teamId}`).emit('notification', {
          ...data,
          from: socket.user.fullName,
          timestamp: new Date()
        });
      }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
      socket.to(`board:${data.boardId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.user.fullName,
        taskId: data.taskId
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(`board:${data.boardId}`).emit('user-stopped-typing', {
        userId: socket.userId,
        userName: socket.user.fullName,
        taskId: data.taskId
      });
    });

    // Presence tracking
    socket.on('update-presence', (data) => {
      socket.broadcast.emit('user-presence-updated', {
        userId: socket.userId,
        userName: socket.user.fullName,
        status: data.status,
        timestamp: new Date()
      });
    });

    // Messaging events removed - messaging system removed

    // message-read handler removed - messaging system removed

    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.fullName} disconnected`);
      
      // Remove connection from rate limiting tracking
      await websocketRateLimitService.removeConnection(socket.userId, socket.id);
      
      // Update socket connection metrics
      metricsService.updateSocketConnections(io.engine.clientsCount);
      
      // Notify others that user went offline
      socket.broadcast.emit('user-presence-updated', {
        userId: socket.userId,
        userName: socket.user.fullName,
        status: 'offline',
        timestamp: new Date()
      });
    });
  });

  // Broadcast functions for server-side events
  const broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  const broadcastToTeam = (teamId, event, data) => {
    io.to(`team:${teamId}`).emit(event, data);
  };

  const broadcastToBoard = (boardId, event, data) => {
    io.to(`board:${boardId}`).emit(event, data);
  };

  const broadcastToAll = (event, data) => {
    io.emit(event, data);
  };

  const broadcastToFinance = (orgId, event, data) => {
    io.to(`finance:${orgId}`).emit(event, data);
  };

  // Make broadcast functions available
  io.broadcastToUser = broadcastToUser;
  io.broadcastToTeam = broadcastToTeam;
  io.broadcastToBoard = broadcastToBoard;
  io.broadcastToAll = broadcastToAll;
  io.broadcastToFinance = broadcastToFinance;
};

module.exports = socketHandler;
