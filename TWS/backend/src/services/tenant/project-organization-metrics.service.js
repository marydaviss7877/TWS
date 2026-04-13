/**
 * Shared project KPI logic for tenant organization routes.
 * Used by GET /organization/projects/metrics and software-house dashboard so counts stay aligned.
 */

const Project = require('../../models/Project');
const { getUserDepartmentIds, shouldFilterByDepartment } = require('./userDepartmentsService');

async function resolveOrgIdForProjects(req) {
  try {
    const { ensureOrgId } = require('../../utils/orgIdHelper');
    return await ensureOrgId(req);
  } catch (error) {
    return (
      req.orgId ||
      req.workspace?.organizationId ||
      req.tenantContext?.orgId ||
      req.tenant?.organizationId ||
      req.tenant?.orgId ||
      req.user?.orgId ||
      null
    );
  }
}

/**
 * Same filter shape as projectsController.getProjectMetrics (org + optional department scope).
 */
async function buildProjectMetricsQuery(req) {
  const orgId = await resolveOrgIdForProjects(req);
  if (!orgId) return null;

  const metricsQuery = { orgId };
  const tenantId = req.tenant?._id || req.tenantContext?.tenantId;
  const userId = req.user?._id;
  if (tenantId && userId) {
    const filterByDept = await shouldFilterByDepartment(tenantId, userId);
    if (filterByDept) {
      const userDeptIds = await getUserDepartmentIds(tenantId, userId);
      if (userDeptIds.length > 0) {
        metricsQuery.$or = [
          { primaryDepartmentId: { $in: userDeptIds } },
          { departments: { $in: userDeptIds } }
        ];
      }
    }
  }
  return metricsQuery;
}

async function computeProjectMetricsFromQuery(metricsQuery) {
  const [
    totalProjects,
    activeProjects,
    completedProjects,
    projects
  ] = await Promise.all([
    Project.countDocuments(metricsQuery),
    Project.countDocuments({ ...metricsQuery, status: 'active' }),
    Project.countDocuments({ ...metricsQuery, status: 'completed' }),
    Project.find(metricsQuery)
      .select('status budget metrics.timeline')
      .lean()
  ]);

  const onTrackProjects = projects.filter(p =>
    p.status === 'active' && p.metrics?.completionRate >= 70
  ).length;

  const atRiskProjects = projects.filter(p =>
    p.status === 'active' && p.metrics?.completionRate < 70 && p.metrics?.completionRate >= 50
  ).length;

  const delayedProjects = projects.filter(p => {
    if (p.timeline?.endDate) {
      return new Date(p.timeline.endDate) < new Date() && p.status !== 'completed';
    }
    return false;
  }).length;

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget?.total || 0), 0);
  const spentBudget = projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0);
  const totalHours = projects.reduce((sum, p) => sum + (p.timeline?.estimatedHours || 0), 0);
  const utilization = totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0;

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    onTrackProjects,
    atRiskProjects,
    delayedProjects,
    totalTeamMembers: 0,
    totalBudget,
    spentBudget,
    totalHours,
    utilization: Math.round(utilization)
  };
}

/**
 * @returns {Promise<{ metricsQuery: object|null, data: object|null }>}
 */
async function getProjectMetricsForRequest(req) {
  const metricsQuery = await buildProjectMetricsQuery(req);
  if (!metricsQuery) {
    return { metricsQuery: null, data: null };
  }
  const data = await computeProjectMetricsFromQuery(metricsQuery);
  return { metricsQuery, data };
}

module.exports = {
  buildProjectMetricsQuery,
  computeProjectMetricsFromQuery,
  getProjectMetricsForRequest
};
