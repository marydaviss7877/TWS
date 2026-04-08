/**
 * ProjectDepartmentConfig view helper (Plan §8.2).
 * Returns viewConfig/actionConfig for a department on a project, or null.
 * Use to filter project/deliverable response by what that department can see.
 */
function getConfigForDepartment(project, departmentId) {
  if (!project?.projectDepartmentConfigs?.length || !departmentId) return null;
  const id = departmentId.toString();
  const config = project.projectDepartmentConfigs.find(
    (c) => (c.departmentId && (c.departmentId._id || c.departmentId).toString()) === id
  );
  return config || null;
}

/**
 * Apply viewConfig to a project plain object: remove fields the department cannot see.
 * Modifies obj in place; returns the same object.
 */
function applyViewConfigToProject(obj, viewConfig) {
  if (!viewConfig || !obj) return obj;
  if (viewConfig.canSeeBudget === false && obj.budget) obj.budget = undefined;
  if (viewConfig.canSeeTeamMembers === false) {
    obj.team = undefined;
    obj.members = undefined;
    obj.resources = undefined;
  }
  if (viewConfig.canSeeClientDetails === false && obj.clientId) obj.clientId = undefined;
  if (viewConfig.canSeeTimeEntries === false) {
    obj.timeline = obj.timeline ? { startDate: obj.timeline.startDate, endDate: obj.timeline.endDate } : undefined;
    obj.actualHours = undefined;
  }
  if (viewConfig.canSeeDeliverables === false) obj.deliverables = undefined;
  if (viewConfig.canSeeChangeRequests === false) obj.changeRequests = undefined;
  if (viewConfig.canSeeInvoices === false) obj.invoices = undefined;
  return obj;
}

/**
 * Get the first department ID the user has access to (for view config lookup).
 * Caller should pass user's department IDs from userDepartmentsService.getUserDepartmentIds.
 */
function getViewConfigForUserDepartments(project, userDepartmentIds) {
  if (!userDepartmentIds?.length) return null;
  for (const deptId of userDepartmentIds) {
    const config = getConfigForDepartment(project, deptId);
    if (config) return config;
  }
  return null;
}

/** Presets for projectDepartmentConfigs (Plan Phase 3). */
const PRESETS = {
  dev: {
    roleInProject: 'dev',
    viewConfig: { canSeeTasks: true, canSeeDeliverables: true, canSeeChangeRequests: true, canSeeTimeEntries: true },
    actionConfig: { canCreateTasks: true, canLogTime: true, canUploadFiles: true, canCommentInternally: true }
  },
  design: {
    roleInProject: 'design',
    viewConfig: { canSeeTasks: true, canSeeDeliverables: true, canSeeChangeRequests: true, canSeeTimeEntries: true },
    actionConfig: { canCreateTasks: true, canLogTime: true, canUploadFiles: true, canCommentInternally: true }
  },
  qa: {
    roleInProject: 'qa',
    viewConfig: { canSeeTasks: true, canSeeDeliverables: true, canSeeChangeRequests: true, canSeeTimeEntries: true },
    actionConfig: { canCreateTasks: true, canLogTime: true, canUploadFiles: true, canCommentInternally: true }
  },
  pm: {
    roleInProject: 'pm',
    viewConfig: { canSeeTasks: true, canSeeBudget: true, canSeeDeliverables: true, canSeeChangeRequests: true, canSeeTimeEntries: true },
    actionConfig: { canCreateTasks: true, canApproveTasks: true, canLogTime: true, canUploadFiles: true, canCommentInternally: true }
  },
  finance_observer: {
    roleInProject: 'finance_observer',
    viewConfig: { canSeeTasks: false, canSeeBudget: true, canSeeDeliverables: false, canSeeTimeEntries: true },
    actionConfig: { canCreateTasks: false, canLogTime: false }
  },
  sales_observer: {
    roleInProject: 'sales_observer',
    viewConfig: { canSeeTasks: false, canSeeBudget: false, canSeeDeliverables: false },
    actionConfig: { canCreateTasks: false, canLogTime: false }
  }
};

/**
 * Normalize projectDepartmentConfigs from UI: if an entry has only departmentId + roleInProject, expand from PRESETS.
 * @param {Array} configs — e.g. [{ departmentId, roleInProject }, ...]
 * @returns {Array} full configs with viewConfig/actionConfig
 */
function normalizeProjectDepartmentConfigs(configs) {
  if (!Array.isArray(configs)) return [];
  return configs.map((c) => {
    const preset = PRESETS[c.roleInProject];
    if (preset && (!c.viewConfig || !c.actionConfig)) {
      return { departmentId: c.departmentId, ...preset };
    }
    return c;
  });
}

/**
 * Build default projectDepartmentConfigs from primaryDepartmentId and departments array.
 * Primary department gets dev preset; others get sales_observer. Used on project create/update.
 * @param {ObjectId} primaryDepartmentId
 * @param {ObjectId[]} departments
 * @returns {Array}
 */
function buildDefaultProjectDepartmentConfigs(primaryDepartmentId, departments = []) {
  const configs = [];
  const seen = new Set();
  if (primaryDepartmentId) {
    const id = primaryDepartmentId.toString();
    seen.add(id);
    configs.push({
      departmentId: primaryDepartmentId,
      ...PRESETS.dev
    });
  }
  const deptIds = Array.isArray(departments) ? departments : [];
  for (const d of deptIds) {
    const id = (d && (d._id || d)).toString();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    configs.push({
      departmentId: d,
      ...PRESETS.sales_observer
    });
  }
  return configs;
}

module.exports = {
  getConfigForDepartment,
  applyViewConfigToProject,
  getViewConfigForUserDepartments,
  buildDefaultProjectDepartmentConfigs,
  normalizeProjectDepartmentConfigs,
  PRESETS
};
