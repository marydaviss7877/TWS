const mongoose = require('mongoose');
const Tenant = require('../../models/Tenant');
const Organization = require('../../models/Organization');
const User = require('../../models/User');
const Employee = require('../../models/Employee');
const Project = require('../../models/Project');
const Task = require('../../models/Task');
const Finance = require('../../models/Finance');
const Attendance = require('../../models/Attendance');
const Payroll = require('../../models/Payroll');
const Department = require('../../models/Department');
const { getOrCreateModelOnConnection } = require('../../utils/modelSchemaHelper');

/**
 * Tenant Organization Service
 * Handles all tenant/org specific operations
 * Uses tenant-specific database connection when available
 */
class TenantOrgService {
  
  /**
   * Get models for tenant (either tenant database or shared database)
   * @param {Object} tenantContext - Tenant context with connection info
   * @returns {Object} Model objects
   */
  getTenantModels(tenantContext) {
    const { tenantConnection, hasSeparateDatabase, tenantId } = tenantContext;
    
    // If tenant has separate database and connection is ready, use tenant models
    if (hasSeparateDatabase && tenantConnection && tenantConnection.readyState === 1) {
      return {
        User: getOrCreateModelOnConnection(tenantConnection, 'User', User),
        Employee: getOrCreateModelOnConnection(tenantConnection, 'Employee', Employee),
        Project: getOrCreateModelOnConnection(tenantConnection, 'Project', Project),
        Task: getOrCreateModelOnConnection(tenantConnection, 'Task', Task),
        Finance: getOrCreateModelOnConnection(tenantConnection, 'Finance', Finance),
        Attendance: getOrCreateModelOnConnection(tenantConnection, 'Attendance', Attendance),
        Payroll: getOrCreateModelOnConnection(tenantConnection, 'Payroll', Payroll),
        Department: getOrCreateModelOnConnection(tenantConnection, 'Department', Department),
        Organization: getOrCreateModelOnConnection(tenantConnection, 'Organization', Organization)
      };
    }
    
    // Otherwise, use shared database models with tenantId filtering
    return {
      User,
      Employee,
      Project,
      Task,
      Finance,
      Attendance,
      Payroll,
      Department,
      Organization
    };
  }
  
  /**
   * Get query filter for tenant (empty if separate DB, orgId/tenantId filter if shared DB)
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Query filter
   * 
   * @deprecated Use orgIdHelper.getTenantFilter() instead
   * This method is kept for backward compatibility
   */
  getTenantFilter(tenantContext) {
    const { hasSeparateDatabase, tenantId, orgId } = tenantContext;
    
    // If tenant has separate database, no need to filter (data is isolated)
    if (hasSeparateDatabase) {
      return {};
    }
    
    // If using shared database, prefer orgId filter (more precise)
    // Most models have orgId field, which provides better data isolation
    // STANDARDIZED: Always use orgId for tenant-level data isolation
    if (orgId) {
      return { orgId };
    }
    
    // Fallback to tenantId if orgId is not available (should not happen with standardized utility)
    console.warn('⚠️ WARNING: Using tenantId fallback - orgId should be available');
    return { tenantId };
  }
  
  /**
   * Get dashboard overview data
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Dashboard data
   */
  async getDashboardOverview(tenantContext) {
    const { tenantId, orgId } = tenantContext;
    
    try {
      // Get tenant-specific models
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      // Get basic counts
      // Note: Some models use 'status' field, others use 'isActive', handle both
      const baseFilter = { ...filter };
      const [userCount, employeeCount, projectCount, taskCount] = await Promise.all([
        models.User.countDocuments(baseFilter).catch(() => 0),
        models.Employee.countDocuments(baseFilter).catch(() => 0),
        models.Project.countDocuments(baseFilter).catch(() => 0),
        models.Task.countDocuments(baseFilter).catch(() => 0)
      ]);

      // Get recent activity (tasks)
      let formattedRecentActivity = [];
      try {
        const recentTasks = await models.Task.find({ ...filter })
          .populate('assignedTo', 'fullName')
          .populate('project', 'name')
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean();
        
        // Format recent tasks for frontend
        formattedRecentActivity = (recentTasks || []).map(task => ({
          _id: task._id,
          title: task.title || task.name || 'Task',
          status: task.status || 'pending',
          assignedTo: task.assignedTo ? { fullName: task.assignedTo.fullName } : null,
          project: task.project ? { name: task.project.name } : null,
          updatedAt: task.updatedAt || task.createdAt || new Date()
        }));
      } catch (taskError) {
        console.warn('Error fetching recent tasks:', taskError.message);
        formattedRecentActivity = [];
      }

      // Get project status distribution
      const projectStatus = await models.Project.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).catch(() => []);

      // Get task status distribution
      const taskStatus = await models.Task.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).catch(() => []);

      return {
        overview: {
          totalUsers: userCount || 0,
          totalEmployees: employeeCount || 0,
          totalProjects: projectCount || 0,
          totalTasks: taskCount || 0
        },
        recentActivity: formattedRecentActivity,
        projectStatus: projectStatus || [],
        taskStatus: taskStatus || [],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      // Return empty data instead of throwing to prevent UI errors
      return {
        overview: {
          totalUsers: 0,
          totalEmployees: 0,
          totalProjects: 0,
          totalTasks: 0
        },
        recentActivity: [],
        projectStatus: [],
        taskStatus: [],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get dashboard analytics
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Analytics data
   */
  async getDashboardAnalytics(tenantContext) {
    const { tenantId } = tenantContext;
    
    try {
      // Get monthly project completion rate
      const monthlyProjectCompletion = await Project.aggregate([
        { $match: { tenantId, isActive: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]);

      // Get task completion trends
      const taskCompletionTrends = await Task.aggregate([
        { $match: { tenantId, isActive: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]);

      // Get employee productivity metrics
      const employeeProductivity = await Task.aggregate([
        { $match: { tenantId, isActive: true, assignedTo: { $exists: true } } },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
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
        { $unwind: '$user' },
        {
          $project: {
            employeeName: '$user.fullName',
            totalTasks: 1,
            completedTasks: 1,
            completionRate: {
              $multiply: [
                { $divide: ['$completedTasks', '$totalTasks'] },
                100
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } },
        { $limit: 10 }
      ]);

      return {
        monthlyProjectCompletion,
        taskCompletionTrends,
        employeeProductivity,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics overview
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Analytics overview
   */
  async getAnalyticsOverview(tenantContext) {
    try {
      // Get comprehensive analytics data (pass full context for tenant DB support)
      const [
        userAnalytics,
        projectAnalytics,
        taskAnalytics,
        financialAnalytics
      ] = await Promise.all([
        this.getUserAnalytics(tenantContext),
        this.getProjectAnalytics(tenantContext),
        this.getTaskAnalytics(tenantContext),
        this.getFinancialAnalytics(tenantContext)
      ]);

      return {
        users: userAnalytics,
        projects: projectAnalytics,
        tasks: taskAnalytics,
        financial: financialAnalytics,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} User analytics
   */
  async getUserAnalytics(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const userStats = await models.User.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      const departmentStats = await models.User.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        byRole: userStats || [],
        byDepartment: departmentStats || []
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return {
        byRole: [],
        byDepartment: []
      };
    }
  }

  /**
   * Get project analytics
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Project analytics
   */
  async getProjectAnalytics(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const projectStats = await models.Project.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' }
          }
        }
      ]);

      const monthlyProjects = await models.Project.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]);

      return {
        byStatus: projectStats || [],
        monthlyTrend: monthlyProjects || []
      };
    } catch (error) {
      console.error('Error getting project analytics:', error);
      return {
        byStatus: [],
        monthlyTrend: []
      };
    }
  }

  /**
   * Get task analytics
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Task analytics
   */
  async getTaskAnalytics(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const taskStats = await models.Task.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const priorityStats = await models.Task.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        byStatus: taskStats || [],
        byPriority: priorityStats || []
      };
    } catch (error) {
      console.error('Error getting task analytics:', error);
      return {
        byStatus: [],
        byPriority: []
      };
    }
  }

  /**
   * Get financial analytics
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Financial analytics
   */
  async getFinancialAnalytics(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const financialStats = await models.Finance.aggregate([
        { $match: { ...filter, isActive: true } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        byType: financialStats || []
      };
    } catch (error) {
      console.error('Error getting financial analytics:', error);
      return {
        byType: []
      };
    }
  }

  /**
   * Get analytics reports (filtered by type, period, module)
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - { type, period, module }
   * @returns {Object} Report data
   */
  async getAnalyticsReports(tenantContext, options = {}) {
    const { type = 'summary', period = '30d', module: reportModule } = options;
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);

      // Date range from period
      const now = new Date();
      let startDate = new Date(now);
      if (period === '7d') startDate.setDate(now.getDate() - 7);
      else if (period === '90d') startDate.setDate(now.getDate() - 90);
      else startDate.setDate(now.getDate() - 30);

      const dateFilter = { ...filter, createdAt: { $gte: startDate } };

      if (type === 'summary') {
        const [users, projects, tasks, financial] = await Promise.all([
          this.getUserAnalytics(tenantContext),
          this.getProjectAnalytics(tenantContext),
          this.getTaskAnalytics(tenantContext),
          this.getFinancialAnalytics(tenantContext)
        ]);
        return {
          reportType: 'summary',
          period,
          generatedAt: new Date(),
          users,
          projects,
          tasks,
          financial
        };
      }

      if (type === 'users' || reportModule === 'users') {
        const byRole = await models.User.aggregate([
          { $match: { ...filter, status: 'active' } },
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        const byDepartment = await models.User.aggregate([
          { $match: { ...filter, status: 'active' } },
          { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);
        const list = await models.User.find({ ...filter, status: 'active' })
          .select('fullName email role department createdAt')
          .populate('department', 'name')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean();
        return {
          reportType: 'users',
          period,
          generatedAt: new Date(),
          byRole: byRole || [],
          byDepartment: byDepartment || [],
          list: list || []
        };
      }

      if (type === 'projects' || reportModule === 'projects') {
        const byStatus = await models.Project.aggregate([
          { $match: { ...filter, isActive: true } },
          { $group: { _id: '$status', count: { $sum: 1 }, totalBudget: { $sum: '$budget' } } }
        ]);
        const list = await models.Project.find({ ...filter, isActive: true })
          .select('name status budget startDate endDate createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean();
        return {
          reportType: 'projects',
          period,
          generatedAt: new Date(),
          byStatus: byStatus || [],
          list: list || []
        };
      }

      if (type === 'tasks' || reportModule === 'tasks') {
        const byStatus = await models.Task.aggregate([
          { $match: { ...filter, isActive: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const byPriority = await models.Task.aggregate([
          { $match: { ...filter, isActive: true } },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);
        const list = await models.Task.find({ ...filter, isActive: true })
          .select('title status priority dueDate createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean();
        return {
          reportType: 'tasks',
          period,
          generatedAt: new Date(),
          byStatus: byStatus || [],
          byPriority: byPriority || [],
          list: list || []
        };
      }

      if (type === 'financial' || reportModule === 'financial') {
        const byType = await models.Finance.aggregate([
          { $match: { ...filter, isActive: true } },
          { $group: { _id: '$type', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        const list = await models.Finance.find({ ...filter, isActive: true })
          .select('type amount description date createdAt')
          .sort({ date: -1 })
          .limit(500)
          .lean();
        return {
          reportType: 'financial',
          period,
          generatedAt: new Date(),
          byType: byType || [],
          list: list || []
        };
      }

      return { reportType: type, period, generatedAt: new Date(), message: 'No data for this report type' };
    } catch (error) {
      console.error('Error getting analytics reports:', error);
      throw error;
    }
  }

  /**
   * Get users with pagination and filters
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options
   * @returns {Object} Users data
   */
  async getUsers(tenantContext, options = {}) {
    const { page = 1, limit = 20, role, department, status } = options;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      // User model uses orgId and status (not tenantId/isActive)
      const userFilter = { ...filter };
      if (status) {
        userFilter.status = status;
      } else {
        userFilter.status = { $in: ['active', 'pending', 'suspended'] };
      }
      // Shared-DB fallback can yield { tenantId } only; User has no tenantId field, so list would be empty.
      if (userFilter.tenantId != null && userFilter.orgId == null && tenantContext.orgId) {
        delete userFilter.tenantId;
        userFilter.orgId = tenantContext.orgId;
      }
      if (role) userFilter.role = role;
      if (department) userFilter.department = department;

      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        models.User.find(userFilter)
          .select('-password')
          .populate('department', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        models.User.countDocuments(userFilter)
      ]);

      const tenantMongoId = tenantContext.tenantId && mongoose.Types.ObjectId.isValid(String(tenantContext.tenantId))
        ? new mongoose.Types.ObjectId(String(tenantContext.tenantId))
        : null;
      let userRows = users;
      if (tenantMongoId && users.length) {
        const TenantUser = require('../../models/TenantUser');
        const ids = users.map((u) => u._id);
        const tus = await TenantUser.find({ tenantId: tenantMongoId, userId: { $in: ids } })
          .select('userId status')
          .lean();
        const byUser = Object.fromEntries(tus.map((t) => [String(t.userId), t.status]));
        userRows = users.map((u) => {
          const o = typeof u.toObject === 'function' ? u.toObject() : { ...u };
          o.portalTenantStatus = byUser[String(u._id)] || null;
          return o;
        });
      } else {
        userRows = users.map((u) => (typeof u.toObject === 'function' ? u.toObject() : { ...u }));
      }

      return {
        users: userRows,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Create user (primary DB User document — same collection as POST /api/auth/login).
   * Normalizes email like login, maps erpRole → User.role, ensures password, creates TenantUser.
   * @param {Object} tenantContext - Tenant context
   * @param {Object} userData - User data
   * @returns {Object} Created user (may have _temporaryPassword when password was auto-generated)
   */
  async createUser(tenantContext, userData) {
    const { tenantId, orgId } = tenantContext;
    const validator = require('validator');
    const crypto = require('crypto');

    try {
      const rawEmail = String(userData.email || '').trim();
      const emailNorm = validator.normalizeEmail(rawEmail, { gmail_remove_dots: false })
        || rawEmail.toLowerCase();

      const erpRole = userData.erpRole || userData.role || 'employee';
      const tenantRoleEnum = ['owner', 'admin', 'manager', 'project_manager', 'hr', 'finance', 'employee', 'contractor', 'client'];
      const role = tenantRoleEnum.includes(erpRole) ? erpRole : 'employee';

      let plainPassword = userData.password != null ? String(userData.password) : '';
      let temporaryPassword = null;
      if (!plainPassword || plainPassword.length < 6) {
        temporaryPassword = crypto.randomBytes(4).toString('hex');
        plainPassword = temporaryPassword;
      }

      const existing = await User.findOne({ email: emailNorm });
      if (existing) {
        throw new Error('A user with this email already exists');
      }

      const fullName = (userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || emailNorm).trim();

      const user = new User({
        fullName,
        email: emailNorm,
        password: plainPassword,
        role,
        orgId,
        status: 'active',
        emailVerified: false,
        ...(userData.phone ? { phone: String(userData.phone).trim() } : {}),
        ...(userData.jobTitle ? { jobTitle: String(userData.jobTitle).trim() } : {}),
        ...(userData.department ? { department: String(userData.department).trim() } : {})
      });

      await user.save();

      const mongoTenantId = tenantId && mongoose.Types.ObjectId.isValid(tenantId)
        ? new mongoose.Types.ObjectId(tenantId)
        : null;
      if (mongoTenantId) {
        try {
          const TenantUser = require('../../models/TenantUser');
          const tuSet = {
            userId: user._id,
            tenantId: mongoTenantId,
            status: 'active',
            roles: [{ role: erpRole, permissions: [], assignedAt: new Date() }]
          };
          if (erpRole === 'hr' && userData.hrSubRole) {
            tuSet.hrSubRole = userData.hrSubRole;
          }
          if (erpRole === 'finance' && userData.financeSubRole) {
            tuSet.financeSubRole = userData.financeSubRole;
          }
          await TenantUser.findOneAndUpdate(
            { userId: user._id, tenantId: mongoTenantId },
            { $set: tuSet },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          const { invalidateResolvedPermissions } = require('./permissionResolver.service');
          await invalidateResolvedPermissions(mongoTenantId, user._id).catch(() => {});
        } catch (tuErr) {
          console.warn('TenantUser provision on createUser (non-fatal):', tuErr.message);
        }
      }

      const hasSeparateDb = !!(
        tenantContext.hasSeparateDatabase &&
        tenantContext.tenantConnection &&
        tenantContext.tenantConnection.readyState === 1
      );
      if (hasSeparateDb) {
        const models = this.getTenantModels(tenantContext);
        try {
          const lean = await User.findById(user._id).lean();
          if (lean) {
            await models.User.deleteMany({ email: lean.email, _id: { $ne: lean._id } });
            await models.User.collection.replaceOne({ _id: lean._id }, lean, { upsert: true });
          }
        } catch (mErr) {
          console.warn('createUser tenant User mirror failed:', mErr.message);
        }
      }

      if (temporaryPassword) {
        user._temporaryPassword = temporaryPassword;
      }
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {Object} tenantContext - Tenant context
   * @param {String} userId - User ID
   * @returns {Object} User data
   */
  async getUserById(tenantContext, userId) {
    const { tenantId } = tenantContext;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const user = await models.User.findOne({ _id: userId, ...filter })
        .select('-password')
        .populate('department', 'name');
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {Object} tenantContext - Tenant context
   * @param {String} userId - User ID
   * @param {Object} userData - User data
   * @returns {Object} Updated user
   */
  async updateUser(tenantContext, userId, userData) {
    const { tenantId } = tenantContext;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const user = await models.User.findOneAndUpdate(
        { _id: userId, ...filter },
        { ...userData, updatedAt: new Date() },
        { new: true }
      ).select('-password');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Set a user's password from an org admin context (no current password).
   * Updates primary User (login) and mirrors to tenant DB when applicable.
   */
  async setUserPasswordByAdmin(tenantContext, targetUserId, newPassword) {
    const plain = String(newPassword || '').trim();
    if (plain.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    const primary = await User.findById(targetUserId);
    if (!primary) {
      throw new Error('User not found');
    }
    const expectedOrg = tenantContext.orgId && String(tenantContext.orgId);
    const userOrg = primary.orgId && (typeof primary.orgId === 'object' && primary.orgId._id
      ? primary.orgId._id.toString()
      : String(primary.orgId));
    if (expectedOrg && userOrg !== expectedOrg) {
      throw new Error('User not in this organization');
    }
    primary.password = plain;
    if (primary.status === 'pending') {
      primary.status = 'active';
    }
    await primary.save();

    const hasSeparateDb = !!(
      tenantContext.hasSeparateDatabase &&
      tenantContext.tenantConnection &&
      tenantContext.tenantConnection.readyState === 1
    );
    if (hasSeparateDb) {
      const models = this.getTenantModels(tenantContext);
      try {
        const lean = await User.findById(primary._id).lean();
        if (lean) {
          await models.User.collection.replaceOne({ _id: lean._id }, lean, { upsert: true });
        }
      } catch (mErr) {
        console.warn('setUserPasswordByAdmin tenant mirror failed:', mErr.message);
      }
    }
    return true;
  }

  /**
   * Delete user (soft delete)
   * @param {Object} tenantContext - Tenant context
   * @param {String} userId - User ID
   * @returns {Boolean} Success status
   */
  async deleteUser(tenantContext, userId) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);

      // User schema uses status: active|suspended|inactive — not isActive (see models/User.js)
      const user = await models.User.findOneAndUpdate(
        { _id: userId, ...filter, status: 'active' },
        {
          status: 'inactive',
          updatedAt: new Date()
        }
      );

      if (!user) {
        throw new Error('User not found');
      }

      const tid = tenantContext.tenantId;
      if (tid) {
        try {
          const TenantUser = require('../../models/TenantUser');
          await TenantUser.updateMany(
            { userId, tenantId: tid },
            { $set: { status: 'inactive' } }
          );
          const { invalidateResolvedPermissions } = require('./permissionResolver.service');
          await invalidateResolvedPermissions(tid, userId).catch(() => {});
        } catch (e) {
          console.warn('TenantUser/cache cleanup on user delete:', e.message);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get HR overview
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} HR overview data
   */
  async getHROverview(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const employeeFilter = { ...filter, status: { $in: ['active', 'probation', 'on-leave'] } };
      const [employeeCount, departmentCount, attendanceStats, payrollStats] = await Promise.all([
        models.Employee.countDocuments(employeeFilter).catch(() => 0),
        models.Employee.distinct('department', employeeFilter).catch(() => []),
        this.getAttendanceStats(tenantContext).catch(() => []),
        this.getPayrollStats(tenantContext).catch(() => ({ totalAmount: 0, employeeCount: 0 }))
      ]);

      return {
        totalEmployees: employeeCount || 0,
        totalDepartments: (departmentCount && departmentCount.length) || 0,
        attendanceStats: attendanceStats || [],
        payrollStats: payrollStats || { totalAmount: 0, employeeCount: 0 },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting HR overview:', error);
      // Return empty data instead of throwing to prevent UI errors
      return {
        totalEmployees: 0,
        totalDepartments: 0,
        attendanceStats: [],
        payrollStats: { totalAmount: 0, employeeCount: 0 },
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get employees with pagination and filters
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options
   * @returns {Object} Employees data
   */
  async getEmployees(tenantContext, options = {}) {
    const { tenantId } = tenantContext;
    const { page = 1, limit = 20, department, status, userId } = options;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      // Employee model uses status, not isActive; include active, probation, on-leave by default
      const filter = { ...baseFilter };
      if (status) {
        filter.status = status;
      } else {
        filter.status = { $in: ['active', 'probation', 'on-leave'] };
      }
      if (department) filter.department = department;
      if (userId && /^[0-9a-fA-F]{24}$/.test(String(userId))) {
        filter.userId = userId;
      }

      const skip = (page - 1) * limit;
      
      const [employees, total, activeCount, onLeaveCount, departmentsList] = await Promise.all([
        models.Employee.find(filter)
          .populate('userId', 'fullName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        models.Employee.countDocuments(filter),
        models.Employee.countDocuments({ ...baseFilter, status: 'active' }).catch(() => 0),
        models.Employee.countDocuments({ ...baseFilter, status: 'on-leave' }).catch(() => 0),
        models.Employee.distinct('department', { ...baseFilter }).catch(() => [])
      ]);

      const employeesList = (employees || []).map((emp) => ({
        ...emp,
        name: emp.userId?.fullName || 'N/A',
        email: emp.userId?.email || 'N/A',
        role: emp.jobTitle,
        status: emp.status || 'active'
      }));

      return {
        employees: employeesList,
        total: total || 0,
        active: activeCount || 0,
        onLeave: onLeaveCount || 0,
        departments: Array.isArray(departmentsList) ? departmentsList.length : 0,
        pagination: {
          current: page,
          pages: Math.ceil((total || 0) / limit),
          total: total || 0,
          limit
        }
      };
    } catch (error) {
      console.error('Error getting employees:', error);
      // Return empty result instead of throwing
      return {
        employees: [],
        total: 0,
        active: 0,
        onLeave: 0,
        departments: 0,
        pagination: {
          current: page,
          pages: 0,
          total: 0,
          limit
        }
      };
    }
  }

  /**
   * Get performance reviews for an employee (by userId - employee portal passes user id as employeeId)
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - { employeeId: string } (userId of the employee)
   * @returns {Object} { reviews: Array }
   */
  async getPerformanceReviews(tenantContext, options = {}) {
    const { employeeId: userId } = options;
    if (!userId) {
      return { reviews: [] };
    }
    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      const employee = await models.Employee.findOne({
        ...baseFilter,
        userId,
        status: { $in: ['active', 'probation', 'on-leave'] }
      })
        .select('performanceNotes')
        .populate('performanceNotes.reviewedBy', 'fullName email')
        .lean();
      const notes = (employee && employee.performanceNotes) ? employee.performanceNotes : [];
      const reviews = notes.map((n) => ({
        id: n._id,
        date: n.date,
        note: n.note,
        rating: n.rating,
        reviewedBy: n.reviewedBy ? { fullName: n.reviewedBy.fullName, email: n.reviewedBy.email } : null
      }));
      return { reviews };
    } catch (error) {
      console.error('Error getting performance reviews:', error);
      return { reviews: [] };
    }
  }

  /**
   * Create employee
   * @param {Object} tenantContext - Tenant context
   * @param {Object} employeeData - Employee data (may include firstName, lastName, email for auto User creation)
   * @returns {Object} Created employee
   */
  async createEmployee(tenantContext, employeeData) {
    const { tenantId, orgId, orgSlug } = tenantContext;
    const validator = require('validator');
    const crypto = require('crypto');

    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      let userId = employeeData.userId;
      let temporaryPassword = null;
      let portalInviteSent = false;
      let portalInviteSkipped = null;

      // Resolve fullName from fullName field OR firstName+lastName
      const resolvedFullName = (employeeData.fullName ||
        ([employeeData.firstName, employeeData.lastName].filter(Boolean).join(' ').trim()) ||
        employeeData.email || 'Employee').trim();

      // Auto-generate employeeId when not provided
      const employeeId = employeeData.employeeId || `EMP${Date.now()}`;

      // ERP portal role and optional HR sub-role
      const erpRole = employeeData.erpRole || 'employee';
      const hrSubRole = (erpRole === 'hr' && employeeData.hrSubRole) ? employeeData.hrSubRole : undefined;
      const financeSubRole = (erpRole === 'finance' && employeeData.financeSubRole)
        ? employeeData.financeSubRole
        : undefined;

      // Auth always uses the primary (default connection) User collection for POST /api/auth/login.
      // When the tenant uses a separate DB, we still create the User on the primary DB, then mirror
      // the same document (_id + hashed password) into the tenant DB so Employee.populate('userId') works.
      const hasSeparateDb = !!(
        tenantContext.hasSeparateDatabase &&
        tenantContext.tenantConnection &&
        tenantContext.tenantConnection.readyState === 1
      );
      const rawEmail = String(employeeData.email || '').trim();
      const emailNorm = validator.normalizeEmail(rawEmail, { gmail_remove_dots: false })
        || rawEmail.toLowerCase();
      const resolvedTenantId = baseFilter.tenantId || tenantId;

      const invitedByRaw = employeeData.invitedBy;
      const invitedBy = (invitedByRaw && mongoose.Types.ObjectId.isValid(String(invitedByRaw)))
        ? new mongoose.Types.ObjectId(String(invitedByRaw))
        : invitedByRaw;
      const passwordPlain = employeeData.password != null ? String(employeeData.password).trim() : '';
      const passwordSupplied = passwordPlain.length >= 6;
      const wantInvite = !!employeeData.sendPortalInvite && !passwordSupplied;

      const mirrorPrimaryUserToTenant = async (uid) => {
        if (!hasSeparateDb) return;
        const lean = await User.findById(uid).lean();
        if (!lean) throw new Error('User record missing after save');
        try {
          const TenantUser = require('../../models/TenantUser');
          const staleUsers = await models.User.find({ email: lean.email, _id: { $ne: lean._id } }).select('_id').lean();
          const staleIds = staleUsers.map((s) => s._id).filter(Boolean);
          if (staleIds.length && resolvedTenantId) {
            await TenantUser.updateMany(
              { tenantId: resolvedTenantId, userId: { $in: staleIds } },
              { $set: { userId: lean._id } }
            );
          }
          if (staleIds.length) {
            await models.Employee.updateMany(
              { userId: { $in: staleIds } },
              { $set: { userId: lean._id } }
            );
          }
          await models.User.deleteMany({ email: lean.email, _id: { $ne: lean._id } });
          await models.User.collection.replaceOne({ _id: lean._id }, lean, { upsert: true });
        } catch (e) {
          console.error('mirrorPrimaryUserToTenant failed:', e.message);
          throw e;
        }
      };

      const provisionTenantUserForEmployee = async (uid) => {
        if (!resolvedTenantId) return;
        try {
          const TenantUser = require('../../models/TenantUser');
          const existingTU = await TenantUser.findOne({ userId: uid, tenantId: resolvedTenantId });
          const baseDoc = {
            userId: uid,
            tenantId: resolvedTenantId,
            roles: [{ role: erpRole, permissions: [], assignedAt: new Date() }],
            status: 'active',
            tenantSpecificInfo: {
              employeeId,
              department: employeeData.department || 'General',
              jobTitle: employeeData.jobTitle || '',
              hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date()
            }
          };
          if (hrSubRole) baseDoc.hrSubRole = hrSubRole;
          if (financeSubRole) baseDoc.financeSubRole = financeSubRole;
          if (!existingTU) {
            await TenantUser.create(baseDoc);
          } else {
            existingTU.status = 'active';
            existingTU.roles = [{ role: erpRole, permissions: [], assignedAt: new Date() }];
            existingTU.tenantSpecificInfo = {
              ...existingTU.tenantSpecificInfo,
              ...baseDoc.tenantSpecificInfo
            };
            if (hrSubRole) existingTU.hrSubRole = hrSubRole;
            if (financeSubRole) existingTU.financeSubRole = financeSubRole;
            await existingTU.save();
          }
          const { invalidateResolvedPermissions } = require('./permissionResolver.service');
          await invalidateResolvedPermissions(resolvedTenantId, uid).catch(() => {});
        } catch (tuErr) {
          console.warn('TenantUser provision failed (non-fatal):', tuErr.message);
        }
      };

      const fireEmployeeInviteEmail = async (tenantUserDoc) => {
        const envConfig = require('../../config/environment');
        const frontendUrl = envConfig.get('FRONTEND_URL') || process.env.FRONTEND_URL || '';
        const inviteLink = `${frontendUrl}/invite/accept?token=${tenantUserDoc.invitation.invitationToken}`;
        const Organization = require('../../models/Organization');
        const org = orgId ? await Organization.findById(orgId).select('name').lean() : null;
        const inviter = invitedBy ? await User.findById(invitedBy).select('fullName').lean() : null;
        const emailService = require('../integrations/email.service');
        emailService.sendEmployeeInviteEmail(
          { fullName: resolvedFullName, email: emailNorm },
          { inviteLink, orgName: org?.name || 'your organisation', role: erpRole, inviterName: inviter?.fullName || 'An admin' }
        ).catch((err) => console.warn('Invite email failed (non-fatal):', err.message));
      };

      const decorateInviteTenantUser = async (tu) => {
        tu.tenantSpecificInfo = {
          ...(tu.tenantSpecificInfo || {}),
          employeeId,
          department: employeeData.department || 'General',
          jobTitle: employeeData.jobTitle || '',
          hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date()
        };
        if (hrSubRole && erpRole === 'hr') tu.hrSubRole = hrSubRole;
        if (financeSubRole && erpRole === 'finance') tu.financeSubRole = financeSubRole;
        await tu.save();
        const { invalidateResolvedPermissions } = require('./permissionResolver.service');
        await invalidateResolvedPermissions(resolvedTenantId, tu.userId).catch(() => {});
      };

      /** @returns {'invited'|'already_active'} */
      const runPortalInvitePath = async (uid) => {
        const TenantUser = require('../../models/TenantUser');
        const existingTU = await TenantUser.findOne({ userId: uid, tenantId: resolvedTenantId });
        if (existingTU && existingTU.status === 'active') {
          await provisionTenantUserForEmployee(uid);
          return 'already_active';
        }
        let tenantUserDoc;
        if (existingTU) {
          existingTU.invitation = existingTU.invitation || {};
          existingTU.invitation.invitationToken = crypto.randomBytes(32).toString('hex');
          existingTU.invitation.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          existingTU.status = 'pending';
          existingTU.roles = [{ role: erpRole, permissions: [], assignedBy: invitedBy, assignedAt: new Date() }];
          await existingTU.save();
          tenantUserDoc = existingTU;
        } else {
          tenantUserDoc = await TenantUser.inviteUser(uid, resolvedTenantId, invitedBy, erpRole);
        }
        await decorateInviteTenantUser(tenantUserDoc);
        await fireEmployeeInviteEmail(tenantUserDoc);
        const portalUser = await User.findById(uid);
        if (portalUser && portalUser.status !== 'active') {
          portalUser.status = 'pending';
          await portalUser.save();
          await mirrorPrimaryUserToTenant(uid);
        }
        return 'invited';
      };

      if (!userId && employeeData.email) {
        if (!orgId) {
          throw new Error(
            'Organization context is missing; the server cannot create portal credentials for this employee.'
          );
        }
        const existingMaster = await User.findOne({ email: emailNorm });
        if (existingMaster) {
          const masterOrgRaw = existingMaster.orgId;
          const masterOrg = masterOrgRaw
            ? (typeof masterOrgRaw === 'object' && masterOrgRaw._id
              ? masterOrgRaw._id.toString()
              : masterOrgRaw.toString())
            : null;
          if (masterOrg && String(masterOrg) !== String(orgId)) {
            throw new Error(
              'This email is already registered to another organization. ' +
              'Use a different email, or add this person under Organization > Users if they should access this workspace.'
            );
          }
          userId = existingMaster._id;
          if (passwordSupplied) {
            existingMaster.password = passwordPlain;
            existingMaster.status = 'active';
            await existingMaster.save();
          }
          await mirrorPrimaryUserToTenant(userId);
          if (wantInvite) {
            const inviteOutcome = await runPortalInvitePath(userId);
            if (inviteOutcome === 'invited') {
              portalInviteSent = true;
            } else {
              portalInviteSkipped = 'already_active';
            }
          } else {
            await provisionTenantUserForEmployee(userId);
          }
        } else if (wantInvite) {
          const userIdNew = new mongoose.Types.ObjectId();
          const masterUser = new User({
            _id: userIdNew,
            email: emailNorm,
            fullName: resolvedFullName,
            password: crypto.randomBytes(16).toString('hex'),
            orgId,
            role: 'employee',
            status: 'pending',
            emailVerified: false
          });
          await masterUser.save();
          userId = userIdNew;
          await mirrorPrimaryUserToTenant(userId);
          const inviteOutcome = await runPortalInvitePath(userId);
          if (inviteOutcome === 'invited') {
            portalInviteSent = true;
          } else {
            portalInviteSkipped = 'already_active';
          }
        } else {
          let resolvedPassword = passwordSupplied ? passwordPlain : null;
          if (!resolvedPassword) {
            temporaryPassword = crypto.randomBytes(4).toString('hex');
            resolvedPassword = temporaryPassword;
          }
          const userIdNew = new mongoose.Types.ObjectId();
          const masterUser = new User({
            _id: userIdNew,
            email: emailNorm,
            fullName: resolvedFullName,
            password: resolvedPassword,
            orgId,
            role: 'employee',
            status: 'active',
            emailVerified: false
          });
          await masterUser.save();
          userId = userIdNew;
          await mirrorPrimaryUserToTenant(userId);
          await provisionTenantUserForEmployee(userId);
        }
      }

      const employeePayload = {
        ...employeeData,
        employeeId,
        ...(userId ? { userId } : {}),
        ...(baseFilter.tenantId ? { tenantId } : {}),
        ...(orgId ? { orgId, organizationId: orgId } : {}),
        orgSlug,
        module: 'hr',
        submodule: 'employees',
        department: employeeData.department || 'General'
      };

      // reportingManager as string (name) is not a valid ObjectId — omit
      if (employeePayload.reportingManager && typeof employeePayload.reportingManager === 'string' && !/^[0-9a-fA-F]{24}$/.test(employeePayload.reportingManager)) {
        delete employeePayload.reportingManager;
      }
      // employmentStatus → status
      if (employeePayload.employmentStatus && !employeePayload.status) {
        employeePayload.status = employeePayload.employmentStatus;
        delete employeePayload.employmentStatus;
      }
      // Strip internal fields that don't belong on Employee model
      delete employeePayload.erpRole;
      delete employeePayload.hrSubRole;
      delete employeePayload.financeSubRole;
      delete employeePayload.password;
      delete employeePayload.sendPortalInvite;
      delete employeePayload.invitedBy;

      const employee = new models.Employee(employeePayload);
      await employee.save();

      // Surface the temp password so the route handler can return it to the admin
      if (temporaryPassword) {
        employee._temporaryPassword = temporaryPassword;
      }
      if (portalInviteSent) {
        employee._portalInviteSent = true;
      }
      if (portalInviteSkipped) {
        employee._portalInviteSkipped = portalInviteSkipped;
      }
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  /**
   * Get a single employee by ID (Mongo _id or employeeId string)
   * @param {Object} tenantContext - Tenant context
   * @param {string} employeeId - Employee _id or employeeId string
   * @returns {Object|null} Employee with populated userId or null
   */
  async getEmployeeById(tenantContext, employeeId) {
    if (!employeeId) return null;
    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(employeeId);
      const filter = isObjectId
        ? { ...baseFilter, _id: employeeId }
        : { ...baseFilter, employeeId };
      const employee = await models.Employee.findOne(filter)
        .populate('userId', 'fullName email phone')
        .lean();
      if (!employee) return null;
      return {
        ...employee,
        name: employee.userId?.fullName || 'N/A',
        email: employee.userId?.email || 'N/A'
      };
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      return null;
    }
  }

  /**
   * Get payroll data
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options
   * @returns {Object} Payroll data
   */
  async getPayrollData(tenantContext, options = {}) {
    const { tenantId } = tenantContext;
    const { period, employeeId } = options;
    
    try {
      const filter = { tenantId, isActive: true };
      
      if (period) {
        const startDate = new Date(period);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        filter.payPeriod = { $gte: startDate, $lte: endDate };
      }
      
      if (employeeId) filter.employee = employeeId;

      const payrollData = await Payroll.find(filter)
        .populate('employee', 'fullName employeeId')
        .sort({ payPeriod: -1 });

      return payrollData;
    } catch (error) {
      console.error('Error getting payroll data:', error);
      throw error;
    }
  }

  /**
   * Get attendance data
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options (date, employeeId, month)
   * @returns {Object} { records, summary: { present, absent, late, total } }
   */
  async getAttendanceData(tenantContext, options = {}) {
    const { orgId } = tenantContext;
    const { date, employeeId, month, period } = options;

    if (!orgId) {
      return { records: [], summary: { present: 0, absent: 0, late: 0, total: 0 } };
    }

    try {
      const models = this.getTenantModels(tenantContext);
      const Attendance = models.Attendance;
      const Employee = models.Employee;

      const orgFilter = { organizationId: orgId };

      let dateFilter = {};
      if (month) {
        const [y, m] = month.split('-').map(Number);
        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0);
        dateFilter = { $gte: startOfMonth, $lte: endOfMonth };
      } else if (date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        dateFilter = { $gte: d, $lt: next };
      } else if (period) {
        const startDate = new Date(period);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        dateFilter = { $gte: startDate, $lte: endDate };
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        dateFilter = { $gte: today, $lt: next };
      }

      const filter = { ...orgFilter, date: dateFilter };

      if (employeeId) {
        const employee = await Employee.findOne({
          $or: [{ _id: employeeId }, { employeeId: employeeId }, { userId: employeeId }]
        }).lean();
        if (!employee) {
          return { records: [], summary: { present: 0, absent: 0, late: 0, total: 0 } };
        }
        filter.$or = [
          { userId: employee.userId },
          { employeeId: (employee.employeeId || (employee._id && employee._id.toString())) }
        ];
      }

      let records = await Attendance.find(filter)
        .populate('userId', 'fullName email')
        .sort({ date: -1 })
        .lean();

      // Enrich with Employee info for software-house engine (department, attendance category, exempt)
      const userIds = [...new Set(records.map(r => r.userId?._id || r.userId).filter(Boolean))];
      const employeeIds = [...new Set(records.map(r => r.employeeId).filter(Boolean))];
      const employees = await Employee.find({
        $or: [
          { userId: { $in: userIds } },
          { employeeId: { $in: employeeIds } }
        ]
      }).lean();
      const employeeByUserId = {};
      const employeeByEmpId = {};
      employees.forEach(emp => {
        if (emp.userId) employeeByUserId[emp.userId.toString()] = emp;
        if (emp.employeeId) employeeByEmpId[emp.employeeId] = emp;
      });
      records = records.map(r => {
        const uid = r.userId?._id?.toString() || r.userId?.toString();
        const emp = employeeByUserId[uid] || employeeByEmpId[r.employeeId] || null;
        return {
          ...r,
          employeeInfo: emp ? {
            department: emp.department,
            attendanceCategory: emp.attendanceCategory || 'hybrid_worker',
            isAttendanceExempt: !!emp.isAttendanceExempt
          } : null
        };
      });

      const present = records.filter(r => r.status === 'present' || r.status === 'work-from-home').length;
      const late = records.filter(r => r.status === 'late').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const total = records.length;

      const summary = {
        present,
        absent,
        late,
        total
      };

      return { records, summary };
    } catch (error) {
      console.error('Error getting attendance data:', error);
      return { records: [], summary: { present: 0, absent: 0, late: 0, total: 0 } };
    }
  }

  /**
   * Attendance check-in (delegate to HR attendance service with tenant orgId)
   * @param {Object} tenantContext - Tenant context
   * @param {string} employeeId - Employee ID
   * @param {Object} checkInData - Check-in payload
   * @returns {Object} Attendance record
   */
  async attendanceCheckIn(tenantContext, employeeId, checkInData) {
    const orgId = tenantContext.orgId;
    if (!orgId) throw new Error('Organization context required');
    const AttendanceService = require('../hr/attendance.service');
    return AttendanceService.checkIn(orgId, employeeId, checkInData);
  }

  /**
   * Attendance check-out (delegate to HR attendance service with tenant orgId)
   * @param {Object} tenantContext - Tenant context
   * @param {string} employeeId - Employee ID
   * @param {Object} checkOutData - Check-out payload
   * @returns {Object} Attendance record
   */
  async attendanceCheckOut(tenantContext, employeeId, checkOutData) {
    const orgId = tenantContext.orgId;
    if (!orgId) throw new Error('Organization context required');
    const AttendanceService = require('../hr/attendance.service');
    return AttendanceService.checkOut(orgId, employeeId, checkOutData);
  }

  /**
   * Software House Attendance Engine config: departments, categories, user types.
   * Drives UI (work styles, role-based views, approval chains).
   */
  getSoftwareHouseAttendanceConfig() {
    return {
      departments: [
        { id: 'leadership', name: 'Leadership', style: 'flexible', description: 'Flexible / exempt. Leave & travel tracking, no strict punch.', exemptDefault: true },
        { id: 'hr', name: 'HR', style: 'supervisor', description: 'Attendance admins. Policies, shifts, leaves, corrections, reports.' },
        { id: 'finance', name: 'Finance', style: 'payroll_viewer', description: 'Read-only. Payable days, overtime, absences, leave balances.' },
        { id: 'sales', name: 'Sales / Business Development', style: 'field', description: 'Field + flexible. GPS check-in, meetings, travel, weekly targets.' },
        { id: 'marketing', name: 'Marketing', style: 'hybrid', description: 'Hybrid / flexible. Remote tagging, weekend compensation.' },
        { id: 'engineering', name: 'Engineering', style: 'structured_flexible', description: 'Daily check-in/out, WFH, timesheet sync.' },
        { id: 'creative', name: 'Creative', style: 'creative_flexible', description: 'Flexible shifts, night shift, output-based, remote.' },
        { id: 'project_management', name: 'Project Managers', style: 'supervisory', description: 'View team presence, approve WFH, short leaves, missed punch.' },
        { id: 'admin_operations', name: 'Admin / Operations', style: 'strict_shift', description: 'Strict shift, office presence, late penalties.' }
      ],
      attendanceCategories: [
        { id: 'fixed_shift', label: 'Fixed Shift', who: 'Admin staff', requiresPunch: true },
        { id: 'flexible_shift', label: 'Flexible Shift', who: 'Dev / Design / Marketing', requiresPunch: true },
        { id: 'field_worker', label: 'Field Worker', who: 'Sales', requiresPunch: true },
        { id: 'remote_worker', label: 'Remote Worker', who: 'Remote hires', requiresPunch: true },
        { id: 'hybrid_worker', label: 'Hybrid Worker', who: 'Most employees', requiresPunch: true },
        { id: 'exempt', label: 'Exempt', who: 'Leadership', requiresPunch: false }
      ],
      userTypes: [
        { id: 'attendance_super_admin', label: 'Attendance Super Admin', canConfigure: true, canEditLogs: true, canOverride: true },
        { id: 'attendance_manager', label: 'Attendance Manager (HR)', canApproveCorrections: true, canManageLeaves: true, canGenerateReports: true },
        { id: 'department_manager', label: 'Department Manager / PM', canViewTeam: true, canApproveWFH: true, canApproveMissedPunch: true },
        { id: 'employee', label: 'Employee', canCheckInOut: true, canApplyLeave: true, canRequestCorrection: true },
        { id: 'payroll_viewer', label: 'Payroll Viewer (Finance)', readOnly: true, canExportPayroll: true }
      ]
    };
  }

  /**
   * Get attendance reports (delegate to HR attendance service)
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - from, to, employeeId, department
   * @returns {Object} Report with records and statistics
   */
  async getAttendanceReports(tenantContext, options = {}) {
    const orgId = tenantContext.orgId;
    if (!orgId) return { records: [], statistics: {}, period: {}, generatedAt: new Date() };
    const AttendanceService = require('../hr/attendance.service');
    const result = await AttendanceService.getAttendanceReports(orgId, {
      startDate: options.from,
      endDate: options.to,
      employeeId: options.employeeId,
      department: options.department
    });
    if (!result.records || result.records.length === 0) return result;
    const models = this.getTenantModels(tenantContext);
    const Employee = models.Employee;
    const userIds = [...new Set(result.records.map(r => r.userId?._id || r.userId).filter(Boolean))];
    const employeeIds = [...new Set(result.records.map(r => r.employeeId).filter(Boolean))];
    const employees = await Employee.find({
      $or: [{ userId: { $in: userIds } }, { employeeId: { $in: employeeIds } }]
    }).lean();
    const employeeByUserId = {};
    const employeeByEmpId = {};
    employees.forEach(emp => {
      if (emp.userId) employeeByUserId[emp.userId.toString()] = emp;
      if (emp.employeeId) employeeByEmpId[emp.employeeId] = emp;
    });
    result.records = result.records.map(r => {
      const uid = r.userId?._id?.toString() || r.userId?.toString();
      const emp = employeeByUserId[uid] || employeeByEmpId[r.employeeId] || null;
      return {
        ...r,
        employeeInfo: emp ? { department: emp.department, attendanceCategory: emp.attendanceCategory || 'hybrid_worker', isAttendanceExempt: !!emp.isAttendanceExempt } : null
      };
    });
    return result;
  }

  /**
   * Get finance overview
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Finance overview data
   */
  async getFinanceOverview(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      // Try to get finance data, but handle cases where Finance model might not exist
      let totalRevenue = 0;
      let totalExpenses = 0;
      let accountsPayable = 0;
      let accountsReceivable = 0;
      let cashBalance = 0;
      let recentTransactions = [];
      
      try {
        if (models.Finance) {
          const [revenueResult, expenseResult, apResult, arResult, cashResult] = await Promise.all([
            models.Finance.aggregate([
              { $match: { ...filter, type: 'revenue', isActive: true } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => []),
            models.Finance.aggregate([
              { $match: { ...filter, type: 'expense', isActive: true } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => []),
            models.Finance.aggregate([
              { $match: { ...filter, type: 'accounts_payable', isActive: true } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => []),
            models.Finance.aggregate([
              { $match: { ...filter, type: 'accounts_receivable', isActive: true } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => []),
            models.Finance.aggregate([
              { $match: { ...filter, type: 'cash', isActive: true } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => [])
          ]);
          
          totalRevenue = (revenueResult && revenueResult[0] && revenueResult[0].total) || 0;
          totalExpenses = (expenseResult && expenseResult[0] && expenseResult[0].total) || 0;
          accountsPayable = (apResult && apResult[0] && apResult[0].total) || 0;
          accountsReceivable = (arResult && arResult[0] && arResult[0].total) || 0;
          cashBalance = (cashResult && cashResult[0] && cashResult[0].total) || 0;
          
          // Get recent transactions
          recentTransactions = await models.Finance.find({ ...filter, isActive: true })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
            .catch(() => []);
        }
      } catch (financeError) {
        console.warn('Finance model not available or error fetching finance data:', financeError.message);
      }

      const netIncome = totalRevenue - totalExpenses;

      return {
        totalRevenue: totalRevenue || 0,
        totalExpenses: totalExpenses || 0,
        netIncome: netIncome || 0,
        accountsPayable: accountsPayable || 0,
        accountsReceivable: accountsReceivable || 0,
        cashBalance: cashBalance || 0,
        recentTransactions: recentTransactions || [],
        financialMetrics: {
          profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting finance overview:', error);
      // Return empty data instead of throwing
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        accountsPayable: 0,
        accountsReceivable: 0,
        netIncome: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get projects overview
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Projects overview data
   */
  async getProjectsOverview(tenantContext) {
    try {
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const [totalProjects, activeProjects, completedProjects, totalTasks, completedTasks, projects, projectStatus] = await Promise.all([
        models.Project.countDocuments({ ...filter, isActive: true }).catch(() => 0),
        models.Project.countDocuments({ ...filter, status: { $in: ['active', 'in_progress'] }, isActive: true }).catch(() => 0),
        models.Project.countDocuments({ ...filter, status: 'completed', isActive: true }).catch(() => 0),
        models.Task.countDocuments({ ...filter, isActive: true }).catch(() => 0),
        models.Task.countDocuments({ ...filter, status: 'completed', isActive: true }).catch(() => 0),
        models.Project.find({ ...filter, isActive: true })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []),
        models.Project.aggregate([
          { $match: { ...filter, isActive: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).catch(() => [])
      ]);

      return {
        totalProjects: totalProjects || 0,
        activeProjects: activeProjects || 0,
        completedProjects: completedProjects || 0,
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        projects: projects || [],
        projectStatus: projectStatus || [],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting projects overview:', error);
      // Return empty data instead of throwing to prevent UI errors
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        projects: [],
        projectStatus: [],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get project tasks
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options
   * @returns {Object} Project tasks data
   */
  async getProjectTasks(tenantContext, options = {}) {
    const { tenantId } = tenantContext;
    const { page = 1, limit = 20, projectId, status, assignedTo } = options;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      const filter = { ...baseFilter, isActive: true };
      
      if (projectId) filter.project = projectId;
      if (status) filter.status = status;
      if (assignedTo) filter.assignedTo = assignedTo;

      const skip = (page - 1) * limit;
      
      const [tasks, total] = await Promise.all([
        models.Task.find(filter)
          .populate('assignedTo', 'fullName')
          .populate('project', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        models.Task.countDocuments(filter)
      ]);

      return {
        tasks: tasks || [],
        pagination: {
          current: page,
          pages: Math.ceil((total || 0) / limit),
          total: total || 0,
          limit
        }
      };
    } catch (error) {
      console.error('Error getting project tasks:', error);
      // Return empty result instead of throwing
      return {
        tasks: [],
        pagination: {
          current: page,
          pages: 0,
          total: 0,
          limit
        }
      };
    }
  }

  /**
   * Get project milestones
   * @param {Object} tenantContext - Tenant context
   * @param {Object} options - Query options
   * @returns {Object} Project milestones data
   */
  async getProjectMilestones(tenantContext, options = {}) {
    const { tenantId } = tenantContext;
    const { projectId, status } = options;
    
    try {
      const models = this.getTenantModels(tenantContext);
      const baseFilter = this.getTenantFilter(tenantContext);
      const filter = { ...baseFilter, isActive: true, type: 'milestone' };
      
      if (projectId) filter.project = projectId;
      if (status) filter.status = status;

      const milestones = await models.Task.find(filter)
        .populate('project', 'name')
        .sort({ dueDate: 1 });

      return milestones || [];
    } catch (error) {
      console.error('Error getting project milestones:', error);
      return [];
    }
  }

  /**
   * Get reports overview
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Reports overview data
   */
  async getReportsOverview(tenantContext) {
    const { tenantId } = tenantContext;
    
    try {
      const availableReports = [
        { id: 'user-report', name: 'User Report', description: 'Detailed user information and activity' },
        { id: 'project-report', name: 'Project Report', description: 'Project status and progress' },
        { id: 'task-report', name: 'Task Report', description: 'Task completion and performance' },
        { id: 'financial-report', name: 'Financial Report', description: 'Financial overview and transactions' },
        { id: 'hr-report', name: 'HR Report', description: 'Employee information and attendance' }
      ];

      return {
        availableReports,
        lastGenerated: new Date(),
        totalReports: availableReports.length
      };
    } catch (error) {
      console.error('Error getting reports overview:', error);
      throw error;
    }
  }

  /**
   * Generate report
   * @param {Object} tenantContext - Tenant context
   * @param {String} type - Report type
   * @param {Object} parameters - Report parameters
   * @returns {Object} Generated report
   */
  async generateReport(tenantContext, type, parameters) {
    const { tenantId } = tenantContext;
    
    try {
      // This is a placeholder for report generation
      // In a real implementation, you would generate actual reports
      const report = {
        id: `report-${Date.now()}`,
        type,
        parameters,
        generatedAt: new Date(),
        status: 'completed',
        data: {
          message: `Report of type ${type} generated successfully`,
          parameters
        }
      };

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get settings
   * @param {Object} tenantContext - Tenant context
   * @returns {Object} Settings data
   */
  async getSettings(tenantContext) {
    const { tenantId } = tenantContext;
    
    try {
      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        general: tenant.settings,
        branding: tenant.branding,
        features: tenant.features,
        subscription: tenant.subscription
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  /**
   * Update settings
   * @param {Object} tenantContext - Tenant context
   * @param {Object} settingsData - Settings data
   * @returns {Object} Updated settings
   */
  async updateSettings(tenantContext, settingsData) {
    const { tenantId } = tenantContext;
    
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { 
          ...settingsData,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        general: tenant.settings,
        branding: tenant.branding,
        features: tenant.features,
        subscription: tenant.subscription
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Helper methods
  async getAttendanceStats(tenantContext) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const models = this.getTenantModels(tenantContext);
      const orgId = tenantContext.orgId;
      const matchFilter = orgId
        ? { organizationId: orgId, date: { $gte: startOfMonth } }
        : { ...this.getTenantFilter(tenantContext), date: { $gte: startOfMonth } };

      const stats = await models.Attendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return stats || [];
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      return [];
    }
  }

  async getPayrollStats(tenantContext) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      
      const stats = await models.Payroll.aggregate([
        { $match: { ...filter, payPeriod: { $gte: startOfMonth }, isActive: true } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$grossPay' },
            employeeCount: { $sum: 1 }
          }
        }
      ]);

      return stats[0] || { totalAmount: 0, employeeCount: 0 };
    } catch (error) {
      console.error('Error getting payroll stats:', error);
      return { totalAmount: 0, employeeCount: 0 };
    }
  }
  
  /**
   * Get user departments (for navigation/filtering)
   * @param {Object} tenantContext - Tenant context
   * @param {String} userId - User ID (optional)
   * @returns {Array} Department access list
   */
  async getUserDepartments(tenantContext, userId = null, tenant = null) {
    try {
      // If tenant object is provided directly, use it (from req.tenant)
      // Otherwise, try to get it from tenantContext or look it up
      if (!tenant) {
        const { tenantId } = tenantContext;
        const Tenant = require('../../models/Tenant');
        
        // Try multiple ways to find the tenant
        tenant = await Tenant.findOne({
          $or: [
            { tenantId: tenantId },
            { _id: tenantId },
            { slug: tenantContext.tenantSlug }
          ]
        });
        
        if (!tenant) {
          console.warn('Tenant not found for getUserDepartments:', { tenantId, tenantSlug: tenantContext.tenantSlug });
          // Return default modules as fallback
          return this.getDefaultDepartments();
        }
      }
      
      // If tenant has ERP modules configured, return modules as departments
      if (tenant.erpModules && tenant.erpModules.length > 0) {
        // Map ERP modules to department-like objects for navigation
        const moduleToDepartmentMap = {
          'hr': { department: 'HR', module: 'hr', name: 'Human Resources' },
          'finance': { department: 'Finance', module: 'finance', name: 'Finance' },
          'projects': { department: 'Projects', module: 'projects', name: 'Projects' },
          'operations': { department: 'Operations', module: 'operations', name: 'Operations' },
          'clients': { department: 'Clients', module: 'clients', name: 'Clients' },
          'reports': { department: 'Reports', module: 'reports', name: 'Reports' },
          'messaging': { department: 'Messaging', module: 'messaging', name: 'Messaging' },
          'meetings': { department: 'Meetings', module: 'meetings', name: 'Meetings' },
          'attendance': { department: 'HR', module: 'hr', name: 'Human Resources' },
          'roles': { department: 'Users', module: 'users', name: 'Users' }
        };
        
        // Return departments based on tenant's ERP modules
        const departments = tenant.erpModules
          .map(module => moduleToDepartmentMap[module])
          .filter(Boolean)
          .map((dept, index) => ({
            _id: `dept-${index}`,
            department: dept.department,
            module: dept.module,
            name: dept.name,
            description: `${dept.name} module`,
            slug: dept.module
          }));
        
        // Always include Users and Settings for tenant owners
        if (!departments.find(d => d.module === 'users')) {
          departments.push({
            _id: 'dept-users',
            department: 'Users',
            module: 'users',
            name: 'Users',
            description: 'User Management',
            slug: 'users'
          });
        }
        
        departments.push({
          _id: 'dept-settings',
          department: 'Settings',
          module: 'settings',
          name: 'Settings',
          description: 'System Settings',
          slug: 'settings'
        });
        
        return departments;
      }
      
      // Fallback: Try to get departments from database
      try {
        const models = this.getTenantModels(tenantContext);
        const filter = this.getTenantFilter(tenantContext);
        
        const dbDepartments = await models.Department.find({ ...filter, status: 'active' })
          .select('name slug description')
          .sort({ name: 1 })
          .lean();
        
        if (dbDepartments && dbDepartments.length > 0) {
          return dbDepartments.map(dept => ({
            _id: dept._id,
            department: dept.name,
            name: dept.name,
            description: dept.description,
            slug: dept.slug
          }));
        }
      } catch (deptError) {
        console.warn('Could not fetch departments from database:', deptError.message);
      }
      
      // Default fallback: return common modules for software_house
      return this.getDefaultDepartments();
    } catch (error) {
      console.error('Error getting user departments:', error);
      // Return default modules even on error to ensure navigation is visible
      return this.getDefaultDepartments();
    }
  }

  /**
   * Get default departments/modules (fallback)
   * @returns {Array} Default department list
   */
  getDefaultDepartments() {
    return [
      { _id: 'dept-1', department: 'HR', module: 'hr', name: 'HR', description: 'Human Resources', slug: 'hr' },
      { _id: 'dept-2', department: 'Finance', module: 'finance', name: 'Finance', description: 'Finance Management', slug: 'finance' },
      { _id: 'dept-3', department: 'Projects', module: 'projects', name: 'Projects', description: 'Project Management', slug: 'projects' },
      { _id: 'dept-4', department: 'Users', module: 'users', name: 'Users', description: 'User Management', slug: 'users' },
      { _id: 'dept-5', department: 'Reports', module: 'reports', name: 'Reports', description: 'Reports & Analytics', slug: 'reports' },
      { _id: 'dept-6', department: 'Settings', module: 'settings', name: 'Settings', description: 'System Settings', slug: 'settings' }
    ];
  }

  // ==================== FINANCE SERVICE METHODS ====================

  /**
   * Get accounts payable
   */
  async getAccountsPayable(tenantContext, options = {}) {
    try {
      const { Invoice, Bill, Vendor } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { page = 1, limit = 20, status, vendor } = options;
      const skip = (page - 1) * limit;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;
      if (vendor) queryFilter.vendorId = vendor;

      const bills = await Bill.find(queryFilter)
        .populate('vendorId', 'name email')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Bill.countDocuments(queryFilter);

      // Calculate totals
      const stats = await Bill.aggregate([
        { $match: queryFilter },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            outstanding: { $sum: '$remainingAmount' },
            overdue: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$dueDate', new Date()] }, { $gt: ['$remainingAmount', 0] }] },
                  '$remainingAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        bills: bills || [],
        stats: stats[0] || { total: 0, outstanding: 0, overdue: 0 },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      console.error('Error getting accounts payable:', error);
      return { bills: [], stats: { total: 0, outstanding: 0, overdue: 0 }, pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  /**
   * Get accounts receivable
   */
  async getAccountsReceivable(tenantContext, options = {}) {
    try {
      const { Invoice, Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { page = 1, limit = 20, status, customer } = options;
      const skip = (page - 1) * limit;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;
      if (customer) queryFilter.clientId = customer;

      const invoices = await Invoice.find(queryFilter)
        .populate('clientId', 'name email')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Invoice.countDocuments(queryFilter);

      // Calculate totals
      const stats = await Invoice.aggregate([
        { $match: queryFilter },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            paid: { $sum: '$paidAmount' },
            outstanding: { $sum: '$remainingAmount' },
            overdue: {
              $sum: {
                $cond: [
                  { $and: [{ $lt: ['$dueDate', new Date()] }, { $gt: ['$remainingAmount', 0] }] },
                  '$remainingAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        invoices: invoices || [],
        stats: stats[0] || { total: 0, paid: 0, outstanding: 0, overdue: 0 },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      console.error('Error getting accounts receivable:', error);
      return { invoices: [], stats: { total: 0, paid: 0, outstanding: 0, overdue: 0 }, pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  /**
   * Get chart of accounts
   */
  async getChartOfAccounts(tenantContext, options = {}) {
    try {
      const { ChartOfAccounts } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { type, level } = options;

      const queryFilter = { ...filter, isActive: true };
      if (type) queryFilter.type = type;
      if (level) queryFilter.level = level;

      const accounts = await ChartOfAccounts.find(queryFilter)
        .populate('parentAccount', 'name code')
        .sort({ code: 1 });

      return { accounts: accounts || [] };
    } catch (error) {
      console.error('Error getting chart of accounts:', error);
      return { accounts: [] };
    }
  }

  /**
   * Create chart of accounts entry
   */
  async createChartOfAccountsEntry(tenantContext, accountData) {
    try {
      const { ChartOfAccounts } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const account = new ChartOfAccounts({
        ...accountData,
        ...filter
      });

      await account.save();
      return account;
    } catch (error) {
      console.error('Error creating chart of accounts entry:', error);
      throw error;
    }
  }

  /**
   * Update chart of accounts entry
   */
  async updateChartOfAccountsEntry(tenantContext, accountId, accountData) {
    try {
      const { ChartOfAccounts } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const account = await ChartOfAccounts.findOneAndUpdate(
        { _id: accountId, ...filter },
        { ...accountData, updatedAt: new Date() },
        { new: true }
      );

      if (!account) {
        throw new Error('Account not found');
      }

      return account;
    } catch (error) {
      console.error('Error updating chart of accounts entry:', error);
      throw error;
    }
  }

  /**
   * Delete chart of accounts entry
   */
  async deleteChartOfAccountsEntry(tenantContext, accountId) {
    try {
      const { ChartOfAccounts } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const account = await ChartOfAccounts.findOneAndUpdate(
        { _id: accountId, ...filter },
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!account) {
        throw new Error('Account not found');
      }

      return account;
    } catch (error) {
      console.error('Error deleting chart of accounts entry:', error);
      throw error;
    }
  }

  /**
   * Load chart of accounts template
   */
  async loadChartOfAccountsTemplate(tenantContext, templateName) {
    try {
      const { ChartOfAccounts } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      // Define templates
      const templates = {
        startup: require('../../templates/chartOfAccounts/startup'),
        enterprise: require('../../templates/chartOfAccounts/enterprise'),
        saas: require('../../templates/chartOfAccounts/saas'),
        it_consulting: require('../../templates/chartOfAccounts/itConsulting')
      };

      const template = templates[templateName];
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Create accounts from template
      const accounts = [];
      for (const accountData of template.accounts) {
        const account = new ChartOfAccounts({
          ...accountData,
          ...filter
        });
        await account.save();
        accounts.push(account);
      }

      return { accounts, count: accounts.length };
    } catch (error) {
      console.error('Error loading chart of accounts template:', error);
      // Return mock template if file doesn't exist
      return this.getMockChartOfAccountsTemplate(templateName, filter);
    }
  }

  /**
   * Get mock chart of accounts template (fallback)
   */
  getMockChartOfAccountsTemplate(templateName, filter) {
    const mockTemplates = {
      startup: [
        { code: '1000', name: 'Cash', type: 'asset', level: 1 },
        { code: '2000', name: 'Accounts Receivable', type: 'asset', level: 1 },
        { code: '3000', name: 'Accounts Payable', type: 'liability', level: 1 },
        { code: '4000', name: 'Revenue', type: 'revenue', level: 1 },
        { code: '5000', name: 'Expenses', type: 'expense', level: 1 }
      ],
      enterprise: [
        { code: '1000', name: 'Assets', type: 'asset', level: 1 },
        { code: '2000', name: 'Liabilities', type: 'liability', level: 1 },
        { code: '3000', name: 'Equity', type: 'equity', level: 1 },
        { code: '4000', name: 'Revenue', type: 'revenue', level: 1 },
        { code: '5000', name: 'Expenses', type: 'expense', level: 1 }
      ]
    };

    const template = mockTemplates[templateName] || mockTemplates.startup;
    return { accounts: template.map(acc => ({ ...acc, ...filter })), count: template.length };
  }

  /**
   * Get invoices
   */
  async getInvoices(tenantContext, options = {}) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { page = 1, limit = 20, status, clientId, projectId } = options;
      const skip = (page - 1) * limit;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;
      if (clientId) queryFilter.clientId = clientId;
      if (projectId) queryFilter.projectId = projectId;

      const invoices = await Invoice.find(queryFilter)
        .populate('clientId', 'name email')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Invoice.countDocuments(queryFilter);

      return {
        invoices: invoices || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      console.error('Error getting invoices:', error);
      return { invoices: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  /**
   * Create invoice
   */
  async createInvoice(tenantContext, invoiceData) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        const lastInvoice = await Invoice.findOne({ ...filter }).sort({ invoiceNumber: -1 });
        const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber?.split('-')[1] || '0') : 0;
        invoiceData.invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
      }

      const invoice = new Invoice({
        ...invoiceData,
        ...filter,
        status: invoiceData.status || 'draft'
      });

      await invoice.save();
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(tenantContext, invoiceId, invoiceData) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, ...filter },
        { ...invoiceData, updatedAt: new Date() },
        { new: true }
      ).populate('clientId', 'name email');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(tenantContext, invoiceId) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const invoice = await Invoice.findOneAndDelete({ _id: invoiceId, ...filter });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Record invoice payment
   */
  async recordInvoicePayment(tenantContext, invoiceId, paymentData) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const invoice = await Invoice.findOne({ _id: invoiceId, ...filter });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Update payment amounts
      invoice.paidAmount = (invoice.paidAmount || 0) + (paymentData.amount || 0);
      invoice.remainingAmount = invoice.total - invoice.paidAmount;
      
      if (invoice.remainingAmount <= 0) {
        invoice.status = 'paid';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partially_paid';
      }

      // Add payment to payments array
      if (!invoice.payments) invoice.payments = [];
      invoice.payments.push({
        ...paymentData,
        paymentDate: paymentData.paymentDate || new Date(),
        recordedAt: new Date()
      });

      await invoice.save();
      return invoice;
    } catch (error) {
      console.error('Error recording invoice payment:', error);
      throw error;
    }
  }

  /**
   * Get bills
   */
  async getBills(tenantContext, options = {}) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { page = 1, limit = 20, status, vendorId, projectId } = options;
      const skip = (page - 1) * limit;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;
      if (vendorId) queryFilter.vendorId = vendorId;
      if (projectId) queryFilter.projectId = projectId;

      const bills = await Bill.find(queryFilter)
        .populate('vendorId', 'name email')
        .populate('projectId', 'name')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Bill.countDocuments(queryFilter);

      return {
        bills: bills || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      console.error('Error getting bills:', error);
      return { bills: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  /**
   * Create bill
   */
  async createBill(tenantContext, billData) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      // Generate bill number if not provided
      if (!billData.billNumber) {
        const lastBill = await Bill.findOne({ ...filter }).sort({ billNumber: -1 });
        const lastNumber = lastBill ? parseInt(lastBill.billNumber?.split('-')[1] || '0') : 0;
        billData.billNumber = `BILL-${String(lastNumber + 1).padStart(4, '0')}`;
      }

      const bill = new Bill({
        ...billData,
        ...filter,
        status: billData.status || 'draft'
      });

      await bill.save();
      return bill;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  }

  /**
   * Update bill
   */
  async updateBill(tenantContext, billId, billData) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const bill = await Bill.findOneAndUpdate(
        { _id: billId, ...filter },
        { ...billData, updatedAt: new Date() },
        { new: true }
      ).populate('vendorId', 'name email');

      if (!bill) {
        throw new Error('Bill not found');
      }

      return bill;
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  }

  /**
   * Delete bill
   */
  async deleteBill(tenantContext, billId) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const bill = await Bill.findOneAndDelete({ _id: billId, ...filter });

      if (!bill) {
        throw new Error('Bill not found');
      }

      return bill;
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
    }
  }

  /**
   * Record bill payment
   */
  async recordBillPayment(tenantContext, billId, paymentData) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const bill = await Bill.findOne({ _id: billId, ...filter });

      if (!bill) {
        throw new Error('Bill not found');
      }

      // Update payment amounts
      bill.paidAmount = (bill.paidAmount || 0) + (paymentData.amount || 0);
      bill.remainingAmount = bill.total - bill.paidAmount;
      
      if (bill.remainingAmount <= 0) {
        bill.status = 'paid';
      } else if (bill.paidAmount > 0) {
        bill.status = 'partially_paid';
      }

      // Add payment to payments array
      if (!bill.payments) bill.payments = [];
      bill.payments.push({
        ...paymentData,
        paymentDate: paymentData.paymentDate || new Date(),
        recordedAt: new Date()
      });

      await bill.save();
      return bill;
    } catch (error) {
      console.error('Error recording bill payment:', error);
      throw error;
    }
  }

  /**
   * Get vendors
   */
  async getVendors(tenantContext, options = {}) {
    try {
      const { Vendor } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { status } = options;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;

      const vendors = await Vendor.find(queryFilter).sort({ name: 1 });

      return { vendors: vendors || [] };
    } catch (error) {
      console.error('Error getting vendors:', error);
      return { vendors: [] };
    }
  }

  /**
   * Create vendor
   */
  async createVendor(tenantContext, vendorData) {
    try {
      const { Vendor } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const vendor = new Vendor({
        ...vendorData,
        ...filter,
        status: vendorData.status || 'active'
      });

      await vendor.save();
      return vendor;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  /**
   * Get clients
   */
  async getClients(tenantContext, options = {}) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { status } = options;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;

      const clients = await Client.find(queryFilter).sort({ name: 1 });

      return { clients: clients || [] };
    } catch (error) {
      console.error('Error getting clients:', error);
      return { clients: [] };
    }
  }

  /**
   * Create client
   */
  async createClient(tenantContext, clientData) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const client = new Client({
        ...clientData,
        ...filter,
        status: clientData.status || 'active'
      });

      await client.save();
      return client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Update client
   */
  async updateClient(tenantContext, clientId, clientData) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const client = await Client.findOne({ _id: clientId, ...filter });
      if (!client) {
        throw new Error('Client not found');
      }

      // Update client fields
      Object.keys(clientData).forEach(key => {
        if (key !== '_id' && key !== '__v' && clientData[key] !== undefined) {
          client[key] = clientData[key];
        }
      });

      await client.save();
      return client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete client (soft delete)
   */
  async deleteClient(tenantContext, clientId) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const client = await Client.findOne({ _id: clientId, ...filter });
      if (!client) {
        throw new Error('Client not found');
      }

      // Soft delete - set status to inactive
      client.status = 'inactive';
      await client.save();

      return client;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Update client
   */
  async updateClient(tenantContext, clientId, clientData) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const client = await Client.findOne({ _id: clientId, ...filter });
      if (!client) {
        throw new Error('Client not found');
      }

      Object.keys(clientData).forEach(key => {
        if (clientData[key] !== undefined) {
          client[key] = clientData[key];
        }
      });

      await client.save();
      return client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete client (soft delete)
   */
  async deleteClient(tenantContext, clientId) {
    try {
      const { Client } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const client = await Client.findOne({ _id: clientId, ...filter });
      if (!client) {
        throw new Error('Client not found');
      }

      // Soft delete - set status to inactive
      client.status = 'inactive';
      await client.save();

      return client;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Get project profitability
   */
  async getProjectProfitability(tenantContext, options = {}) {
    try {
      const { ProjectCosting } = require('../../models/Finance');
      const models = this.getTenantModels(tenantContext);
      const filter = this.getTenantFilter(tenantContext);
      const { projectId, clientId, status } = options;

      const queryFilter = { ...filter };
      if (projectId) queryFilter.projectId = projectId;
      if (clientId) queryFilter.clientId = clientId;

      const projectCostings = await ProjectCosting.find(queryFilter)
        .populate('projectId', 'name status')
        .populate('clientId', 'name email');

      // If no project costing found, get from projects
      if (projectCostings.length === 0 && models.Project) {
        const projects = await models.Project.find({ ...filter, ...(status && { status }) })
          .populate('clientId', 'name email')
          .limit(50);

        return projects.map(project => ({
          _id: project._id,
          name: project.name,
          clientName: project.clientId?.name || 'N/A',
          budget: project.budget || 0,
          actualCost: project.actualCost || 0,
          revenue: project.revenue || project.budget || 0,
          profit: (project.revenue || project.budget || 0) - (project.actualCost || 0),
          margin: project.budget > 0 
            ? (((project.revenue || project.budget || 0) - (project.actualCost || 0)) / (project.revenue || project.budget || 1)) * 100 
            : 0,
          status: project.status || 'active'
        }));
      }

      return projectCostings.map(costing => ({
        _id: costing.projectId?._id,
        name: costing.projectId?.name,
        clientName: costing.clientId?.name || 'N/A',
        budget: costing.budget?.total || 0,
        actualCost: costing.actualCosts?.total || 0,
        revenue: costing.revenue || 0,
        profit: (costing.revenue || 0) - (costing.actualCosts?.total || 0),
        margin: costing.revenue > 0 
          ? (((costing.revenue || 0) - (costing.actualCosts?.total || 0)) / costing.revenue) * 100 
          : 0,
        status: costing.projectId?.status || 'active'
      }));
    } catch (error) {
      console.error('Error getting project profitability:', error);
      return [];
    }
  }

  /**
   * Get cash flow
   */
  async getCashFlow(tenantContext, options = {}) {
    try {
      const { Transaction, CashFlowForecast } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { period = 'month' } = options;

      const periodFilter = this.getPeriodFilter(period);

      const transactions = await Transaction.find({
        ...filter,
        ...periodFilter
      })
        .populate('accountId', 'name')
        .sort({ date: -1 });

      return {
        transactions: transactions || []
      };
    } catch (error) {
      console.error('Error getting cash flow:', error);
      return { transactions: [] };
    }
  }

  /**
   * Get cash flow forecasts
   */
  async getCashFlowForecasts(tenantContext, options = {}) {
    try {
      const { CashFlowForecast } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { status, confidence } = options;

      const queryFilter = { ...filter };
      if (status) queryFilter.status = status;
      if (confidence) queryFilter.confidence = confidence;

      const forecasts = await CashFlowForecast.find(queryFilter)
        .populate('accountId', 'name')
        .sort({ date: 1 });

      return forecasts || [];
    } catch (error) {
      console.error('Error getting cash flow forecasts:', error);
      return [];
    }
  }

  /**
   * Create cash flow forecast
   */
  async createCashFlowForecast(tenantContext, forecastData) {
    try {
      const { CashFlowForecast } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const forecast = new CashFlowForecast({
        ...forecastData,
        ...filter
      });

      await forecast.save();
      return forecast;
    } catch (error) {
      console.error('Error creating cash flow forecast:', error);
      throw error;
    }
  }

  /**
   * Update cash flow forecast
   */
  async updateCashFlowForecast(tenantContext, forecastId, forecastData) {
    try {
      const { CashFlowForecast } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const forecast = await CashFlowForecast.findOneAndUpdate(
        { _id: forecastId, ...filter },
        { ...forecastData, updatedAt: new Date() },
        { new: true }
      );

      if (!forecast) {
        throw new Error('Forecast not found');
      }

      return forecast;
    } catch (error) {
      console.error('Error updating cash flow forecast:', error);
      throw error;
    }
  }

  /**
   * Delete cash flow forecast
   */
  async deleteCashFlowForecast(tenantContext, forecastId) {
    try {
      const { CashFlowForecast } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const forecast = await CashFlowForecast.findOneAndDelete({ _id: forecastId, ...filter });

      if (!forecast) {
        throw new Error('Forecast not found');
      }

      return forecast;
    } catch (error) {
      console.error('Error deleting cash flow forecast:', error);
      throw error;
    }
  }

  /**
   * Get time entries
   */
  async getTimeEntries(tenantContext, options = {}) {
    try {
      const { TimeEntry } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { projectId, employeeId, clientId, from, to, status, billable } = options;

      const queryFilter = { ...filter };
      if (projectId) queryFilter.projectId = projectId;
      if (employeeId) queryFilter.employeeId = employeeId;
      if (clientId) queryFilter.clientId = clientId;
      if (status) queryFilter.status = status;
      if (billable !== undefined) queryFilter.billable = billable === 'true' || billable === true;

      if (from || to) {
        queryFilter.date = {};
        if (from) queryFilter.date.$gte = new Date(from);
        if (to) queryFilter.date.$lte = new Date(to);
      }

      const timeEntries = await TimeEntry.find(queryFilter)
        .populate('employeeId', 'fullName email')
        .populate('projectId', 'name')
        .populate('clientId', 'name')
        .sort({ date: -1 });

      return timeEntries || [];
    } catch (error) {
      console.error('Error getting time entries:', error);
      return [];
    }
  }

  /**
   * Create time entry
   */
  async createTimeEntry(tenantContext, timeEntryData) {
    try {
      const { TimeEntry } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const timeEntry = new TimeEntry({
        ...timeEntryData,
        ...filter,
        status: timeEntryData.status || 'draft',
        billable: timeEntryData.billable !== false
      });

      await timeEntry.save();
      return timeEntry;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(tenantContext, timeEntryId, timeEntryData) {
    try {
      const { TimeEntry } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const timeEntry = await TimeEntry.findOneAndUpdate(
        { _id: timeEntryId, ...filter },
        { ...timeEntryData, updatedAt: new Date() },
        { new: true }
      ).populate('employeeId', 'fullName email')
       .populate('projectId', 'name');

      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      return timeEntry;
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(tenantContext, timeEntryId) {
    try {
      const { TimeEntry } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const timeEntry = await TimeEntry.findOneAndDelete({ _id: timeEntryId, ...filter });

      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      return timeEntry;
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  }

  /**
   * Get expenses
   */
  async getExpenses(tenantContext, options = {}) {
    try {
      const Expense = require('../../models/Expense');
      const filter = this.getTenantFilter(tenantContext);
      const { projectId, employeeId, category, from, to, billable } = options;

      const queryFilter = { ...filter };
      if (projectId) queryFilter.projectId = projectId;
      if (employeeId) queryFilter.employeeId = employeeId;
      if (category) queryFilter.category = category;
      if (billable !== undefined) queryFilter.billable = billable === 'true' || billable === true;

      if (from || to) {
        queryFilter.date = {};
        if (from) queryFilter.date.$gte = new Date(from);
        if (to) queryFilter.date.$lte = new Date(to);
      }

      const expenses = await Expense.find(queryFilter)
        .populate('employeeId', 'fullName email')
        .populate('projectId', 'name')
        .sort({ date: -1 });

      return expenses || [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  /**
   * Create expense
   */
  async createExpense(tenantContext, expenseData, file) {
    try {
      const Expense = require('../../models/Expense');
      const filter = this.getTenantFilter(tenantContext);

      // Handle file upload if present
      if (file) {
        expenseData.receipt = file.filename || file.path;
      }

      const expense = new Expense({
        ...expenseData,
        ...filter,
        billable: expenseData.billable !== false
      });

      await expense.save();
      return expense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Update expense
   */
  async updateExpense(tenantContext, expenseId, expenseData, file) {
    try {
      const Expense = require('../../models/Expense');
      const filter = this.getTenantFilter(tenantContext);

      // Handle file upload if present
      if (file) {
        expenseData.receipt = file.filename || file.path;
      }

      const expense = await Expense.findOneAndUpdate(
        { _id: expenseId, ...filter },
        { ...expenseData, updatedAt: new Date() },
        { new: true }
      ).populate('employeeId', 'fullName email')
       .populate('projectId', 'name');

      if (!expense) {
        throw new Error('Expense not found');
      }

      return expense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  /**
   * Delete expense
   */
  async deleteExpense(tenantContext, expenseId) {
    try {
      const Expense = require('../../models/Expense');
      const filter = this.getTenantFilter(tenantContext);

      const expense = await Expense.findOneAndDelete({ _id: expenseId, ...filter });

      if (!expense) {
        throw new Error('Expense not found');
      }

      return expense;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(tenantContext, options = {}) {
    try {
      const { Transaction } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const { limit = 10 } = options;

      const transactions = await Transaction.find(filter)
        .populate('accountId', 'name code')
        .sort({ date: -1 })
        .limit(parseInt(limit));

      return transactions || [];
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantContext) {
    try {
      const { Invoice } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);

      const overdueInvoices = await Invoice.find({
        ...filter,
        dueDate: { $lt: new Date() },
        status: { $in: ['sent', 'partially_paid'] },
        remainingAmount: { $gt: 0 }
      })
        .populate('clientId', 'name email')
        .sort({ dueDate: 1 })
        .limit(10);

      return overdueInvoices || [];
    } catch (error) {
      console.error('Error getting overdue invoices:', error);
      return [];
    }
  }

  /**
   * Get upcoming bills
   */
  async getUpcomingBills(tenantContext) {
    try {
      const { Bill } = require('../../models/Finance');
      const filter = this.getTenantFilter(tenantContext);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingBills = await Bill.find({
        ...filter,
        dueDate: { $gte: new Date(), $lte: nextWeek },
        status: { $in: ['draft', 'pending_approval', 'approved'] },
        remainingAmount: { $gt: 0 }
      })
        .populate('vendorId', 'name email')
        .sort({ dueDate: 1 })
        .limit(10);

      return upcomingBills || [];
    } catch (error) {
      console.error('Error getting upcoming bills:', error);
      return [];
    }
  }

  /**
   * Generate finance report
   */
  async generateFinanceReport(tenantContext, reportId, startDate, endDate) {
    try {
      const { Invoice, Bill, Transaction, TimeEntry, ProjectCosting } = require('../../models/Finance');
      const Expense = require('../../models/Expense');
      const filter = this.getTenantFilter(tenantContext);
      const dateFilter = {
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      let reportData = {};

      switch (reportId) {
        case 'profit-loss':
          const [revenue, expenses] = await Promise.all([
            Transaction.aggregate([
              { $match: { ...filter, ...dateFilter, type: 'revenue' } },
              {
                $group: {
                  _id: '$category',
                  amount: { $sum: '$amount' }
                }
              }
            ]),
            Transaction.aggregate([
              { $match: { ...filter, ...dateFilter, type: 'expense' } },
              {
                $group: {
                  _id: '$category',
                  amount: { $sum: '$amount' }
                }
              }
            ])
          ]);

          const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

          reportData = {
            title: 'Profit & Loss Statement',
            period: `${startDate} to ${endDate}`,
            revenue: {
              total: totalRevenue,
              breakdown: revenue.map(r => ({ category: r._id, amount: r.amount }))
            },
            expenses: {
              total: totalExpenses,
              breakdown: expenses.map(e => ({ category: e._id, amount: e.amount }))
            },
            netProfit: totalRevenue - totalExpenses,
            grossMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
          };
          break;

        case 'project-profitability':
          const projects = await this.getProjectProfitability(tenantContext);
          reportData = {
            title: 'Project Profitability Report',
            period: `${startDate} to ${endDate}`,
            projects: projects.map(p => ({
              name: p.name,
              client: p.clientName,
              revenue: p.revenue || 0,
              costs: p.actualCost || 0,
              profit: p.profit || 0,
              margin: p.margin || 0
            }))
          };
          break;

        case 'client-analysis':
          const invoices = await Invoice.find({ ...filter, ...dateFilter })
            .populate('clientId', 'name email')
            .lean();

          const clientMap = {};
          invoices.forEach(inv => {
            const clientId = inv.clientId?._id?.toString();
            if (!clientMap[clientId]) {
              clientMap[clientId] = {
                name: inv.clientName || inv.clientId?.name,
                revenue: 0,
                projects: new Set(),
                invoices: 0
              };
            }
            clientMap[clientId].revenue += inv.total || 0;
            clientMap[clientId].invoices += 1;
            if (inv.projectId) clientMap[clientId].projects.add(inv.projectId.toString());
          });

          reportData = {
            title: 'Client Analysis Report',
            period: `${startDate} to ${endDate}`,
            clients: Object.values(clientMap).map(client => ({
              name: client.name,
              revenue: client.revenue,
              projects: client.projects.size,
              avgProjectValue: client.projects.size > 0 ? client.revenue / client.projects.size : 0,
              paymentTerms: '30 days',
              status: 'active'
            }))
          };
          break;

        default:
          reportData = {
            title: 'Report Generated',
            period: `${startDate} to ${endDate}`,
            message: 'Report data will be available here'
          };
      }

      return reportData;
    } catch (error) {
      console.error('Error generating finance report:', error);
      throw error;
    }
  }

  /**
   * Export finance report
   */
  async exportFinanceReport(tenantContext, reportId, format, startDate, endDate) {
    try {
      // Generate the report first
      const reportData = await this.generateFinanceReport(tenantContext, reportId, startDate, endDate);

      // In a real implementation, you would use libraries like:
      // - pdfkit or puppeteer for PDF
      // - exceljs for Excel
      // - csv-writer for CSV
      
      // For now, return the data structure that can be processed by frontend
      return {
        format,
        reportId,
        data: reportData,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error exporting finance report:', error);
      throw error;
    }
  }

  /**
   * Helper: Get period filter
   */
  getPeriodFilter(period) {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      date: { $gte: startDate, $lte: endDate }
    };
  }
}

module.exports = new TenantOrgService();
