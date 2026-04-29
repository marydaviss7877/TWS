const Project = require('../../models/project-delivery/Project');
const Task = require('../../models/project-delivery/Task');
const Department = require('../../models/org/Department');

/**
 * Department Dashboard Service
 * Provides department-level statistics and data aggregation
 */
class DepartmentDashboardService {
  /**
   * Get department statistics
   * @param {ObjectId} orgId - Organization ID
   * @param {ObjectId} departmentId - Department ID
   * @returns {Promise<Object>} Department statistics
   */
  static async getDepartmentStats(orgId, departmentId) {
    try {
      const [projects, tasks, completedTasks, activeProjects] = await Promise.all([
        // Total projects in department (primary or in departments array)
        Project.countDocuments({
          orgId,
          $or: [
            { primaryDepartmentId: departmentId },
            { departments: departmentId }
          ]
        }),
        
        // Total tasks in department
        Task.countDocuments({ orgId, departmentId }),
        
        // Completed tasks
        Task.countDocuments({
          orgId,
          departmentId,
          status: 'completed'
        }),
        
        // Active projects
        Project.countDocuments({
          orgId,
          $or: [
            { primaryDepartmentId: departmentId },
            { departments: departmentId }
          ],
          status: 'active'
        })
      ]);
      
      const completionRate = tasks > 0 ? (completedTasks / tasks) * 100 : 0;
      
      return {
        totalProjects: projects,
        activeProjects,
        totalTasks: tasks,
        completedTasks,
        pendingTasks: tasks - completedTasks,
        completionRate: Math.round(completionRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting department stats:', error);
      throw error;
    }
  }
  
  /**
   * Get department projects
   * @param {ObjectId} orgId - Organization ID
   * @param {ObjectId} departmentId - Department ID
   * @param {Object} options - Query options (status, limit, skip)
   * @returns {Promise<Array>} List of projects
   */
  static async getDepartmentProjects(orgId, departmentId, options = {}) {
    try {
      const { status, limit = 20, skip = 0 } = options;
      
      const query = {
        orgId,
        $or: [
          { primaryDepartmentId: departmentId },
          { departments: departmentId }
        ]
      };
      
      if (status) query.status = status;
      
      return await Project.find(query)
        .populate('clientId', 'name company')
        .populate('primaryDepartmentId', 'name code')
        .populate('departments', 'name code')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();
    } catch (error) {
      console.error('Error getting department projects:', error);
      throw error;
    }
  }
  
  /**
   * Get department tasks
   * @param {ObjectId} orgId - Organization ID
   * @param {ObjectId} departmentId - Department ID
   * @param {Object} options - Query options (status, assignee, limit, skip)
   * @returns {Promise<Array>} List of tasks
   */
  static async getDepartmentTasks(orgId, departmentId, options = {}) {
    try {
      const { status, assignee, limit = 50, skip = 0 } = options;
      
      const query = { orgId, departmentId };
      
      if (status) query.status = status;
      if (assignee) query.assignee = assignee;
      
      return await Task.find(query)
        .populate('projectId', 'name slug')
        .populate('assignee', 'fullName email')
        .populate('departmentId', 'name code')
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();
    } catch (error) {
      console.error('Error getting department tasks:', error);
      throw error;
    }
  }
  
  /**
   * Get department task statistics by status
   * @param {ObjectId} orgId - Organization ID
   * @param {ObjectId} departmentId - Department ID
   * @returns {Promise<Object>} Task statistics by status
   */
  static async getDepartmentTaskStats(orgId, departmentId) {
    try {
      const stats = await Task.aggregate([
        {
          $match: {
            orgId: orgId,
            departmentId: departmentId
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const result = {
        todo: 0,
        in_progress: 0,
        under_review: 0,
        completed: 0,
        cancelled: 0
      };
      
      stats.forEach(stat => {
        const status = stat._id;
        if (result.hasOwnProperty(status)) {
          result[status] = stat.count;
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting department task stats:', error);
      throw error;
    }
  }
  
  /**
   * Get all departments with their statistics
   * @param {ObjectId} orgId - Organization ID
   * @returns {Promise<Array>} List of departments with stats
   */
  static async getAllDepartmentsWithStats(orgId) {
    try {
      const departments = await Department.find({ orgId, status: 'active' })
        .populate('departmentHead', 'fullName email')
        .lean();
      
      const departmentsWithStats = await Promise.all(
        departments.map(async (dept) => {
          const stats = await this.getDepartmentStats(orgId, dept._id);
          return {
            ...dept,
            stats
          };
        })
      );
      
      return departmentsWithStats;
    } catch (error) {
      console.error('Error getting all departments with stats:', error);
      throw error;
    }
  }
  
  /**
   * Get department workload (tasks per assignee)
   * @param {ObjectId} orgId - Organization ID
   * @param {ObjectId} departmentId - Department ID
   * @returns {Promise<Array>} Workload distribution
   */
  static async getDepartmentWorkload(orgId, departmentId) {
    try {
      const workload = await Task.aggregate([
        {
          $match: {
            orgId: orgId,
            departmentId: departmentId,
            assignee: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$assignee',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
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
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            assigneeId: '$_id',
            assigneeName: { $concat: ['$user.fullName', ''] },
            assigneeEmail: '$user.email',
            totalTasks: 1,
            completedTasks: 1,
            inProgressTasks: 1
          }
        },
        {
          $sort: { totalTasks: -1 }
        }
      ]);
      
      return workload;
    } catch (error) {
      console.error('Error getting department workload:', error);
      throw error;
    }
  }
}

module.exports = DepartmentDashboardService;

