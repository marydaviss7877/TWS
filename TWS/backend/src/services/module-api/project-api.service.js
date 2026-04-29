/**
 * Project Module API
 * 
 * Single source of truth for project data access across modules.
 * Other modules MUST use this API instead of directly requiring Project model.
 * 
 * Module Boundary: Projects module owns Project, Task, Milestone, Sprint models.
 */

const Project = require('../../models/project-delivery/Project');
const ProjectMember = require('../../models/project-delivery/ProjectMember');

class ProjectModuleAPI {
  /**
   * Get project by ID
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @param {Object} options - { populate: ['clientId', 'primaryDepartmentId'] }
   * @returns {Object|null} Project document or null
   */
  async getProjectById(orgId, projectId, options = {}) {
    const query = Project.findOne({ _id: projectId, orgId });
    
    if (options.populate) {
      options.populate.forEach(field => query.populate(field));
    }
    
    return query.lean();
  }

  /**
   * Get project with client details for billing/invoicing
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object|null} Project with clientId populated, or null
   */
  async getProjectWithClient(orgId, projectId) {
    return Project.findOne({ _id: projectId, orgId })
      .populate('clientId', 'name email company contact billing paymentTerms')
      .lean();
  }

  /**
   * Get projects by organization with filters
   * @param {string} orgId - Organization ID
   * @param {Object} filters - { status, clientId, departmentId, limit, skip }
   * @returns {Object} { projects, total }
   */
  async getProjectsByOrg(orgId, filters = {}) {
    const { status, clientId, departmentId, limit = 50, skip = 0, sort = 'updatedAt' } = filters;
    
    const query = { orgId };
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    if (departmentId) query.departments = departmentId;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('clientId', 'name company')
        .sort({ [sort]: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      Project.countDocuments(query)
    ]);

    return { projects, total };
  }

  /**
   * Validate project exists
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {boolean}
   */
  async validateProjectExists(orgId, projectId) {
    const count = await Project.countDocuments({ _id: projectId, orgId });
    return count > 0;
  }

  /**
   * Get project budget info (for costing - minimal data)
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object|null} { budget, hourlyRate, clientId }
   */
  async getProjectBudgetInfo(orgId, projectId) {
    const project = await Project.findOne(
      { _id: projectId, orgId },
      { budget: 1, hourlyRate: 1, clientId: 1 }
    ).lean();
    return project;
  }

  /**
   * Get project members for user (HR/Projects cross-module)
   * @param {string} userId - User ID
   * @param {Object} options - { populateProject: true }
   * @returns {Array} Project assignments with project info
   */
  async getProjectMembersForUser(userId, options = {}) {
    const query = ProjectMember.find({ userId }).select('projectId role');
    if (options.populateProject !== false) {
      query.populate('projectId', 'name status timeline');
    }
    return query.lean();
  }

  /**
   * Get projects for client (Client module cross-module)
   * @param {string} orgId - Organization ID
   * @param {string} clientId - Client ID
   * @param {Object} options - { fields: string } - optional field selection
   * @returns {Array} Projects for client
   */
  async getProjectsForClient(orgId, clientId, options = {}) {
    const fields = options.fields || 'name status budget timeline metrics';
    return Project.find({ orgId, clientId })
      .select(fields)
      .lean();
  }
}

module.exports = new ProjectModuleAPI();
