const Tenant = require('../../models/tenant/Tenant');
const Organization = require('../../models/org/Organization');
const Department = require('../../models/org/Department');
const User = require('../../models/users-auth/User');
const Project = require('../../models/project-delivery/Project');
const Task = require('../../models/project-delivery/Task');
const Client = require('../../models/industry/Client');
const Employee = require('../../models/hr-payroll/Employee');
const tenantModelService = require('./tenant-model.service');
const tenantConnectionPool = require('./tenant-connection-pool.service');
const { getModelForTenant } = require('../../utils/tenantModelHelper');
const { getOrCreateModelOnConnection } = require('../../utils/modelSchemaHelper');
const logger = require('../../utils/logger');

class TenantDataService {
  /**
   * Get tenant dashboard overview data
   */
  static async getDashboardOverview(tenantId) {
    try {
      // Tenant model always uses default connection (shared database)
      const tenant = await Tenant.findOne({
        $or: [
          { _id: tenantId },
          { tenantId: tenantId },
          { slug: tenantId }
        ]
      });
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const actualTenantId = tenant.tenantId || tenant._id.toString();
      const hasSeparateDatabase = tenant.database?.status === 'active' && tenant.database?.connectionString;

      // Get models - use tenant database if available, otherwise use shared database
      let OrganizationModel = Organization;
      let DepartmentModel = Department;
      let UserModel = User;
      let ProjectModel = Project;
      let TaskModel = Task;

      if (hasSeparateDatabase) {
        try {
          const tenantConnection = await tenantConnectionPool.getTenantConnection(actualTenantId, tenant.slug);
          if (tenantConnection && tenantConnection.readyState === 1) {
            // Get or create models on tenant connection using schema helper
            OrganizationModel = getOrCreateModelOnConnection(tenantConnection, 'Organization', Organization);
            DepartmentModel = getOrCreateModelOnConnection(tenantConnection, 'Department', Department);
            UserModel = getOrCreateModelOnConnection(tenantConnection, 'User', User);
            ProjectModel = getOrCreateModelOnConnection(tenantConnection, 'Project', Project);
            TaskModel = getOrCreateModelOnConnection(tenantConnection, 'Task', Task);
          }
        } catch (connError) {
          logger.warn(`Using shared database for tenant ${actualTenantId}:`, connError.message);
        }
      }

      // Get organization data (no tenantId filter needed in separate DB, but keep for shared DB compatibility)
      const orgQuery = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      const organization = await OrganizationModel.findOne(orgQuery);
      
      // Get departments count
      const deptQuery = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      const departmentsCount = await DepartmentModel.countDocuments(deptQuery);
      
      // Get users count
      const userQuery = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      const usersCount = await UserModel.countDocuments(userQuery);
      
      // Get projects count
      const projectQuery = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      const projectsCount = await ProjectModel.countDocuments(projectQuery);
      
      // Get active tasks count
      const taskQuery = hasSeparateDatabase 
        ? { status: { $in: ['in_progress', 'pending'] } }
        : { tenantId: actualTenantId, status: { $in: ['in_progress', 'pending'] } };
      const activeTasksCount = await TaskModel.countDocuments(taskQuery);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentUserQuery = hasSeparateDatabase
        ? { createdAt: { $gte: sevenDaysAgo } }
        : { tenantId: actualTenantId, createdAt: { $gte: sevenDaysAgo } };
      const recentUsers = await UserModel.countDocuments(recentUserQuery);
      
      const recentProjectQuery = hasSeparateDatabase
        ? { createdAt: { $gte: sevenDaysAgo } }
        : { tenantId: actualTenantId, createdAt: { $gte: sevenDaysAgo } };
      const recentProjects = await ProjectModel.countDocuments(recentProjectQuery);

      return {
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.subscription?.plan || 'trial',
          createdAt: tenant.createdAt
        },
        organization: organization ? {
          name: organization.name,
          industry: organization.industry,
          size: organization.size,
          status: organization.status
        } : null,
        stats: {
          totalUsers: usersCount,
          totalDepartments: departmentsCount,
          totalProjects: projectsCount,
          activeTasks: activeTasksCount,
          recentUsers,
          recentProjects
        },
        usage: tenant.usage || {
          storageUsed: '0 MB',
          apiCalls: 0,
          lastActivity: tenant.updatedAt
        }
      };
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get tenant departments with real-time data
   */
  static async getDepartments(tenantId) {
    try {
      // Get tenant info
      const tenant = await Tenant.findOne({
        $or: [
          { _id: tenantId },
          { tenantId: tenantId },
          { slug: tenantId }
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const actualTenantId = tenant.tenantId || tenant._id.toString();
      const hasSeparateDatabase = tenant.database?.status === 'active' && tenant.database?.connectionString;

      // Get models
      let DepartmentModel = Department;
      let UserModel = User;
      let ProjectModel = Project;

      if (hasSeparateDatabase) {
        try {
          const tenantConnection = await tenantConnectionPool.getTenantConnection(actualTenantId, tenant.slug);
          if (tenantConnection && tenantConnection.readyState === 1) {
            DepartmentModel = getOrCreateModelOnConnection(tenantConnection, 'Department', Department);
            UserModel = getOrCreateModelOnConnection(tenantConnection, 'User', User);
            ProjectModel = getOrCreateModelOnConnection(tenantConnection, 'Project', Project);
          }
        } catch (connError) {
          logger.warn(`Using shared database for departments:`, connError.message);
        }
      }

      const deptQuery = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      const departments = await DepartmentModel.find(deptQuery)
        .populate('departmentHead', 'fullName email')
        .sort({ createdAt: -1 });

      const departmentsWithStats = await Promise.all(
        departments.map(async (dept) => {
          const userQuery = hasSeparateDatabase
            ? { department: dept._id }
            : { tenantId: actualTenantId, department: dept._id };
          const userCount = await UserModel.countDocuments(userQuery);
          
          const projectQuery = hasSeparateDatabase
            ? { department: dept._id }
            : { tenantId: actualTenantId, department: dept._id };
          const projectCount = await ProjectModel.countDocuments(projectQuery);

          return {
            _id: dept._id,
            name: dept.name,
            code: dept.code,
            description: dept.description,
            status: dept.status,
            departmentHead: dept.departmentHead,
            userCount,
            projectCount,
            createdAt: dept.createdAt
          };
        })
      );

      return departmentsWithStats;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  }

  /**
   * Get tenant users with real-time data
   */
  static async getUsers(tenantId, options = {}) {
    try {
      // Get tenant info
      const tenant = await Tenant.findOne({
        $or: [
          { _id: tenantId },
          { tenantId: tenantId },
          { slug: tenantId }
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const actualTenantId = tenant.tenantId || tenant._id.toString();
      const hasSeparateDatabase = tenant.database?.status === 'active' && tenant.database?.connectionString;

      // Get User model
      let UserModel = User;
      if (hasSeparateDatabase) {
        try {
          const tenantConnection = await tenantConnectionPool.getTenantConnection(actualTenantId, tenant.slug);
          if (tenantConnection && tenantConnection.readyState === 1) {
            UserModel = getOrCreateModelOnConnection(tenantConnection, 'User', User);
          }
        } catch (connError) {
          logger.warn(`Using shared database for users:`, connError.message);
        }
      }

      const { page = 1, limit = 20, department, status } = options;
      const skip = (page - 1) * limit;

      const filter = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      if (department) filter.department = department;
      if (status) filter.status = status;

      const users = await UserModel.find(filter)
        .populate('department', 'name code')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalUsers = await UserModel.countDocuments(filter);

      return {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalUsers / limit),
          count: totalUsers
        }
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get tenant projects with real-time data
   */
  static async getProjects(tenantId, options = {}) {
    try {
      // Get tenant info
      const tenant = await Tenant.findOne({
        $or: [
          { _id: tenantId },
          { tenantId: tenantId },
          { slug: tenantId }
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const actualTenantId = tenant.tenantId || tenant._id.toString();
      const hasSeparateDatabase = tenant.database?.status === 'active' && tenant.database?.connectionString;

      // Get Project and Task models
      let ProjectModel = Project;
      let TaskModel = Task;
      if (hasSeparateDatabase) {
        try {
          const tenantConnection = await tenantConnectionPool.getTenantConnection(actualTenantId, tenant.slug);
          if (tenantConnection && tenantConnection.readyState === 1) {
            ProjectModel = getOrCreateModelOnConnection(tenantConnection, 'Project', Project);
            TaskModel = getOrCreateModelOnConnection(tenantConnection, 'Task', Task);
          }
        } catch (connError) {
          logger.warn(`Using shared database for projects:`, connError.message);
        }
      }

      const { page = 1, limit = 20, status, department } = options;
      const skip = (page - 1) * limit;

      const filter = hasSeparateDatabase ? {} : { tenantId: actualTenantId };
      if (status) filter.status = status;
      if (department) filter.department = department;

      const projects = await ProjectModel.find(filter)
        .populate('department', 'name code')
        .populate('manager', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalProjects = await ProjectModel.countDocuments(filter);

      // Get project statistics
      const projectStats = await Promise.all(
        projects.map(async (project) => {
          // Use regular Task model with orgId instead of tenant-aware model
          const taskCount = await TaskModel.countDocuments({ 
            projectId: project._id 
          });
          
          const completedTasks = await TaskModel.countDocuments({ 
            projectId: project._id, 
            status: 'completed' 
          });

          return {
            ...project.toObject(),
            taskCount,
            completedTasks,
            progress: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
          };
        })
      );

      return {
        projects: projectStats,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalProjects / limit),
          count: totalProjects
        }
      };
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(tenantId, limit = 20) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get recent users
      const recentUsers = await User.find({ 
        tenantId, 
        createdAt: { $gte: sevenDaysAgo } 
      })
      .populate('department', 'name')
      .select('fullName email department createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

      // Get recent projects
      const recentProjects = await Project.find({ 
        tenantId, 
        createdAt: { $gte: sevenDaysAgo } 
      })
      .populate('department', 'name')
      .populate('manager', 'fullName')
      .select('name description department manager createdAt status')
      .sort({ createdAt: -1 })
      .limit(5);

      // Get recent tasks - use regular Task model
      const recentTasks = await Task.find({ 
        updatedAt: { $gte: sevenDaysAgo } 
      })
      .populate('projectId', 'name')
      .populate('assignee', 'fullName')
      .select('title description projectId assignee status updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5);

      const activities = [
        ...recentUsers.map(user => ({
          type: 'user_created',
          message: `New user ${user.fullName} joined`,
          timestamp: user.createdAt,
          user: user.fullName,
          department: user.department?.name
        })),
        ...recentProjects.map(project => ({
          type: 'project_created',
          message: `New project ${project.name} created`,
          timestamp: project.createdAt,
          project: project.name,
          department: project.department?.name,
          manager: project.manager?.fullName
        })),
        ...recentTasks.map(task => ({
          type: 'task_updated',
          message: `Task ${task.title} updated`,
          timestamp: task.updatedAt,
          task: task.title,
          project: task.projectId?.name,
          assignedTo: task.assignee?.fullName,
          status: task.status
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, parseInt(limit));

      return activities;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(tenantId, period = '30d') {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // User growth
      const userGrowth = await User.aggregate([
        { $match: { tenantId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Project status distribution
      const projectStatus = await Project.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Task status distribution - use regular Task model
      const taskStatus = await Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Department user distribution
      const departmentStats = await User.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department'
          }
        },
        {
          $unwind: { path: '$department', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            name: '$department.name',
            count: 1
          }
        }
      ]);

      return {
        userGrowth,
        projectStatus,
        taskStatus,
        departmentStats
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get HR dashboard data
   */
  static async getHRDashboard(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const organization = await Organization.findOne({ tenantId });
      const departmentsCount = await Department.countDocuments({ tenantId });
      const usersCount = await User.countDocuments({ tenantId });
      const activeUsersCount = await User.countDocuments({ tenantId, status: 'active' });
      const onLeaveCount = await User.countDocuments({ tenantId, status: 'on_leave' });
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newHiresCount = await User.countDocuments({ tenantId, createdAt: { $gte: thirtyDaysAgo } });

      // Get departments with employee counts
      const departments = await Department.find({ tenantId }).select('name description');
      const departmentsWithCounts = await Promise.all(
        departments.map(async (dept) => {
          const employeeCount = await User.countDocuments({ tenantId, department: dept._id });
          return {
            name: dept.name,
            employees: employeeCount,
            budget: Math.floor(Math.random() * 10000) + 5000 // Mock budget data
          };
        })
      );

      // Get recent HR activity
      const recentActivity = [
        {
          id: 1,
          type: 'hire',
          message: `${newHiresCount} new employee(s) joined this month`,
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
          id: 2,
          type: 'leave',
          message: `${onLeaveCount} employee(s) currently on leave`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
          id: 3,
          type: 'department',
          message: `${departmentsCount} departments active`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
        }
      ];

      return {
        stats: {
          totalEmployees: usersCount,
          activeEmployees: activeUsersCount,
          onLeave: onLeaveCount,
          newHires: newHiresCount,
          monthlyPayroll: Math.floor(Math.random() * 50000) + 20000, // Mock payroll data
          averageSalary: Math.floor(Math.random() * 2000) + 3000 // Mock salary data
        },
        departments: departmentsWithCounts,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting HR dashboard:', error);
      throw error;
    }
  }

  /**
   * Get Finance dashboard data
   */
  static async getFinanceDashboard(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const organization = await Organization.findOne({ tenantId });
      const projectsCount = await Project.countDocuments({ tenantId });
      
      // Mock financial data - in a real implementation, this would come from financial records
      const totalRevenue = Math.floor(Math.random() * 200000) + 100000;
      const monthlyRevenue = Math.floor(totalRevenue * 0.1);
      const totalExpenses = Math.floor(totalRevenue * 0.7);
      const monthlyExpenses = Math.floor(totalExpenses * 0.1);
      const profit = totalRevenue - totalExpenses;
      const monthlyProfit = monthlyRevenue - monthlyExpenses;
      const profitMargin = ((profit / totalRevenue) * 100).toFixed(1);

      // Mock recent transactions
      const recentTransactions = [
        {
          id: 1,
          type: 'revenue',
          description: 'Payment from Client - Project Alpha',
          amount: Math.floor(Math.random() * 10000) + 5000,
          date: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
          id: 2,
          type: 'expense',
          description: 'Office rent payment',
          amount: -(Math.floor(Math.random() * 3000) + 2000),
          date: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
          id: 3,
          type: 'revenue',
          description: 'Payment from Client - Project Beta',
          amount: Math.floor(Math.random() * 15000) + 7000,
          date: new Date(Date.now() - 1000 * 60 * 60 * 4)
        },
        {
          id: 4,
          type: 'expense',
          description: 'Software licenses renewal',
          amount: -(Math.floor(Math.random() * 2000) + 1000),
          date: new Date(Date.now() - 1000 * 60 * 60 * 6)
        }
      ];

      return {
        stats: {
          totalRevenue,
          monthlyRevenue,
          totalExpenses,
          monthlyExpenses,
          profit,
          monthlyProfit,
          accountsReceivable: Math.floor(Math.random() * 20000) + 10000,
          accountsPayable: Math.floor(Math.random() * 15000) + 5000,
          cashFlow: Math.floor(Math.random() * 30000) + 20000,
          profitMargin: parseFloat(profitMargin)
        },
        recentTransactions
      };
    } catch (error) {
      console.error('Error getting finance dashboard:', error);
      throw error;
    }
  }

  /**
   * Create sample data for a tenant (projects, clients, tasks, employees, departments, users)
   */
  static async createSampleData(tenantId, orgId) {
    try {
      // 1. Create sample departments
      const departments = await Department.insertMany([
        { name: 'Development', code: 'DEV', description: 'Software development team', tenantId, orgId, status: 'active' },
        { name: 'QA', code: 'QA', description: 'Quality assurance team', tenantId, orgId, status: 'active' },
        { name: 'Design', code: 'DES', description: 'UI/UX design team', tenantId, orgId, status: 'active' },
        { name: 'DevOps', code: 'OPS', description: 'Infrastructure and operations', tenantId, orgId, status: 'active' },
        { name: 'Product', code: 'PDT', description: 'Product management', tenantId, orgId, status: 'active' }
      ]);

      // 2. Create sample users
      const users = await User.insertMany([
        { email: 'john.doe@testorg.com', password: 'password123', fullName: 'John Doe', role: 'admin', orgId, department: 'Development', status: 'active' },
        { email: 'jane.smith@testorg.com', password: 'password123', fullName: 'Jane Smith', role: 'employee', orgId, department: 'Development', status: 'active' },
        { email: 'mike.johnson@testorg.com', password: 'password123', fullName: 'Mike Johnson', role: 'employee', orgId, department: 'QA', status: 'active' },
        { email: 'sara.williams@testorg.com', password: 'password123', fullName: 'Sara Williams', role: 'employee', orgId, department: 'Design', status: 'active' },
        { email: 'alex.chen@testorg.com', password: 'password123', fullName: 'Alex Chen', role: 'project_manager', orgId, department: 'Product', status: 'active' },
        { email: 'emma.brown@testorg.com', password: 'password123', fullName: 'Emma Brown', role: 'employee', orgId, department: 'DevOps', status: 'active' }
      ]);

      // 3. Create sample clients
      const clients = await Client.insertMany([
        {
          orgId,
          name: 'TechCorp Solutions',
          slug: 'techcorp-solutions',
          type: 'company',
          contact: { primary: { name: 'Sarah Johnson', email: 'sarah@techcorp.com', phone: '+1-555-1001', title: 'CTO' }, billing: { name: 'Mike Davis', email: 'mike@techcorp.com', phone: '+1-555-1002' } },
          company: { name: 'TechCorp Solutions', website: 'https://techcorp.com', industry: 'Technology', size: '201-500', description: 'Leading technology solutions provider' },
          address: { street: '123 Tech Blvd', city: 'San Francisco', state: 'CA', zipCode: '94105', country: 'US' },
          billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 8.5 },
          status: 'active'
        },
        {
          orgId,
          name: 'StartupXYZ',
          slug: 'startupxyz',
          type: 'company',
          contact: { primary: { name: 'Emily Rodriguez', email: 'emily@startupxyz.com', phone: '+1-555-2001', title: 'Founder' }, billing: { name: 'Emily Rodriguez', email: 'emily@startupxyz.com', phone: '+1-555-2001' } },
          company: { name: 'StartupXYZ', website: 'https://startupxyz.com', industry: 'SaaS', size: '11-50', description: 'Fast-growing SaaS startup' },
          address: { street: '456 Innovation Dr', city: 'Palo Alto', state: 'CA', zipCode: '94301', country: 'US' },
          billing: { currency: 'USD', paymentTerms: 'net_15', taxRate: 8.5 },
          status: 'active'
        },
        {
          orgId,
          name: 'FinanceHub Inc',
          slug: 'financehub-inc',
          type: 'company',
          contact: { primary: { name: 'Robert Kim', email: 'robert@financehub.com', phone: '+1-555-3001', title: 'VP Engineering' }, billing: { name: 'Jennifer Lee', email: 'jennifer@financehub.com', phone: '+1-555-3002' } },
          company: { name: 'FinanceHub Inc', website: 'https://financehub.com', industry: 'Finance', size: '51-200', description: 'Financial technology platform' },
          address: { street: '789 Wall St', city: 'New York', state: 'NY', zipCode: '10005', country: 'US' },
          billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 8.875 },
          status: 'active'
        },
        {
          orgId,
          name: 'CloudTech Solutions',
          slug: 'cloudtech-solutions',
          type: 'company',
          contact: { primary: { name: 'Jane Smith', email: 'jane@cloudtech.com', phone: '+1-555-4001', title: 'CTO' }, billing: { name: 'John Doe', email: 'john@cloudtech.com', phone: '+1-555-4002' } },
          company: { name: 'CloudTech Solutions', website: 'https://cloudtech.com', industry: 'Technology', size: '201-500', description: 'Cloud and DevOps consulting' },
          address: { street: '200 Tech Park Dr', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' },
          billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 0 },
          status: 'active'
        },
        {
          orgId,
          name: 'RetailMax',
          slug: 'retailmax',
          type: 'company',
          contact: { primary: { name: 'David Moore', email: 'david@retailmax.com', phone: '+1-555-5001', title: 'Head of Digital' }, billing: { name: 'David Moore', email: 'david@retailmax.com', phone: '+1-555-5001' } },
          company: { name: 'RetailMax', website: 'https://retailmax.com', industry: 'Retail', size: '201-500', description: 'E-commerce and retail chain' },
          address: { street: '500 Commerce St', city: 'Chicago', state: 'IL', zipCode: '60601', country: 'US' },
          billing: { currency: 'USD', paymentTerms: 'net_30', taxRate: 10.25 },
          status: 'active'
        }
      ]);

      // 4. Create sample projects (use primaryDepartmentId and optional clientId)
      const projects = await Project.insertMany([
        { name: 'E-commerce Platform', slug: 'ecommerce-platform', description: 'Modern e-commerce platform with payments and inventory', orgId, primaryDepartmentId: departments[0]._id, clientId: clients[0]._id, status: 'active', priority: 'high', methodology: 'scrum', projectType: 'web_application', budget: { total: 150000, currency: 'USD', spent: 45000, remaining: 105000 }, timeline: { startDate: new Date('2025-01-15'), endDate: new Date('2025-06-30'), estimatedHours: 2000, actualHours: 600 } },
        { name: 'Mobile Banking App', slug: 'mobile-banking-app', description: 'Secure mobile banking with biometric auth', orgId, primaryDepartmentId: departments[0]._id, clientId: clients[2]._id, status: 'active', priority: 'high', methodology: 'agile', projectType: 'mobile_app', budget: { total: 200000, currency: 'USD', spent: 75000, remaining: 125000 }, timeline: { startDate: new Date('2025-02-01'), endDate: new Date('2025-07-15'), estimatedHours: 2500, actualHours: 1000 } },
        { name: 'REST API Development', slug: 'rest-api-development', description: 'RESTful API for third-party integrations', orgId, primaryDepartmentId: departments[0]._id, clientId: clients[1]._id, status: 'active', priority: 'medium', methodology: 'agile', projectType: 'api_development', budget: { total: 80000, currency: 'USD', spent: 20000, remaining: 60000 }, timeline: { startDate: new Date('2025-03-01'), endDate: new Date('2025-05-31'), estimatedHours: 800, actualHours: 200 } },
        { name: 'Customer Portal', slug: 'customer-portal', description: 'Customer-facing portal and appointment booking', orgId, primaryDepartmentId: departments[0]._id, clientId: clients[3]._id, status: 'active', priority: 'high', methodology: 'scrum', projectType: 'web_application', budget: { total: 120000, currency: 'USD', spent: 30000, remaining: 90000 }, timeline: { startDate: new Date('2025-02-15'), endDate: new Date('2025-08-30'), estimatedHours: 1500, actualHours: 400 } },
        { name: 'RetailMax Mobile App', slug: 'retailmax-mobile-app', description: 'Mobile app for loyalty and checkout', orgId, primaryDepartmentId: departments[0]._id, clientId: clients[4]._id, status: 'planning', priority: 'medium', methodology: 'agile', projectType: 'mobile_app', budget: { total: 95000, currency: 'USD', spent: 0, remaining: 95000 }, timeline: { startDate: new Date('2025-04-01'), endDate: new Date('2025-10-31'), estimatedHours: 1100, actualHours: 0 } },
        { name: 'Internal DevOps Pipeline', slug: 'internal-devops-pipeline', description: 'CI/CD and deployment automation', orgId, primaryDepartmentId: departments[3]._id, status: 'active', priority: 'medium', methodology: 'kanban', projectType: 'system_integration', budget: { total: 50000, currency: 'USD', spent: 25000, remaining: 25000 }, timeline: { startDate: new Date('2024-11-01'), endDate: new Date('2025-03-31'), estimatedHours: 500, actualHours: 280 } }
      ]);

      // 5. Create sample tasks (departmentId required)
      const devDept = departments[0]._id;
      const qaDept = departments[1]._id;
      const designDept = departments[2]._id;
      await Task.insertMany([
        { title: 'Database Design', description: 'Design the database schema', orgId, projectId: projects[0]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[0]._id, status: 'completed' },
        { title: 'API Development', description: 'Develop REST API endpoints', orgId, projectId: projects[0]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[0]._id, status: 'in_progress' },
        { title: 'Frontend Dashboard', description: 'Build admin and client dashboards', orgId, projectId: projects[0]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[0]._id, status: 'in_progress' },
        { title: 'Payment Integration', description: 'Stripe and payment gateway integration', orgId, projectId: projects[0]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[0]._id, status: 'todo' },
        { title: 'UI Design', description: 'Create user interface designs', orgId, projectId: projects[1]._id, departmentId: designDept, assignee: users[3]._id, reporter: users[0]._id, status: 'in_progress' },
        { title: 'Auth & Biometrics', description: 'Implement auth and biometric login', orgId, projectId: projects[1]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[4]._id, status: 'todo' },
        { title: 'API Documentation', description: 'OpenAPI docs and Postman collection', orgId, projectId: projects[2]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[4]._id, status: 'completed' },
        { title: 'Integration Tests', description: 'E2E and integration test suite', orgId, projectId: projects[2]._id, departmentId: qaDept, assignee: users[2]._id, reporter: users[4]._id, status: 'in_progress' },
        { title: 'Customer Portal Wireframes', description: 'Wireframes and user flows', orgId, projectId: projects[3]._id, departmentId: designDept, assignee: users[3]._id, reporter: users[4]._id, status: 'completed' },
        { title: 'Appointment Booking Module', description: 'Booking and calendar integration', orgId, projectId: projects[3]._id, departmentId: devDept, assignee: users[1]._id, reporter: users[4]._id, status: 'in_progress' },
        { title: 'CI Pipeline Setup', description: 'Jenkins/GitHub Actions pipeline', orgId, projectId: projects[5]._id, departmentId: devDept, assignee: users[5]._id, reporter: users[0]._id, status: 'completed' },
        { title: 'Docker & K8s Config', description: 'Container and orchestration config', orgId, projectId: projects[5]._id, departmentId: devDept, assignee: users[5]._id, reporter: users[0]._id, status: 'in_progress' }
      ]);

      // 6. Create sample employees (linked to users)
      const hireBase = new Date('2024-06-01');
      const employees = await Employee.insertMany([
        { userId: users[0]._id, employeeId: 'EMP001', jobTitle: 'Engineering Manager', department: 'Development', hireDate: hireBase, contractType: 'full-time', salary: { base: 140000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' },
        { userId: users[1]._id, employeeId: 'EMP002', jobTitle: 'Senior Developer', department: 'Development', hireDate: new Date('2024-07-15'), contractType: 'full-time', salary: { base: 115000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' },
        { userId: users[2]._id, employeeId: 'EMP003', jobTitle: 'QA Engineer', department: 'QA', hireDate: new Date('2024-08-01'), contractType: 'full-time', salary: { base: 85000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' },
        { userId: users[3]._id, employeeId: 'EMP004', jobTitle: 'UI/UX Designer', department: 'Design', hireDate: new Date('2024-09-01'), contractType: 'full-time', salary: { base: 92000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' },
        { userId: users[4]._id, employeeId: 'EMP005', jobTitle: 'Project Manager', department: 'Product', hireDate: new Date('2024-07-01'), contractType: 'full-time', salary: { base: 105000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' },
        { userId: users[5]._id, employeeId: 'EMP006', jobTitle: 'DevOps Engineer', department: 'DevOps', hireDate: new Date('2024-10-01'), contractType: 'full-time', salary: { base: 118000, currency: 'USD', payFrequency: 'monthly' }, status: 'active' }
      ]);

      return {
        departments: departments.length,
        users: users.length,
        clients: clients.length,
        projects: projects.length,
        tasks: 12,
        employees: employees.length
      };
    } catch (error) {
      console.error('Error creating sample data:', error);
      throw error;
    }
  }
}

module.exports = TenantDataService;
