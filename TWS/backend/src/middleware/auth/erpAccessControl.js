/**
 * ERP Access Control Middleware (Plan §11 — 7-step pattern)
 * Every protected API should use this (after verifyERPToken) for consistent security.
 *
 * Steps: 1) Tenant context 2) User active 3) Revocation list (if checkRevocation)
 *       4) Department access 5) Role/permission 6) Project membership 7) Audit
 */
const User = require('../../models/User');
const TenantDepartmentAccess = require('../../models/TenantDepartmentAccess');
const Workspace = require('../../models/Workspace');
const Project = require('../../models/Project');
const Employee = require('../../models/Employee');
const permissionCache = require('../../services/tenant/permissionCache.service');
const { getResolvedPermissions, hasPermission, hasAnyPermission } = require('../../services/tenant/permissionResolver.service');

const GENERIC_FORBIDDEN_MESSAGE = 'Access denied';

/**
 * @param {Object} options
 * @param {string[]} [options.allowedRoles] — Require req.user.role in this list (step 5, legacy)
 * @param {string} [options.module] — Module for permission check (e.g. 'payroll', 'projects'); used with options.action
 * @param {string|string[]} [options.action] — Action or array of actions (e.g. 'read' or ['read','read_own']); pass if any matches
 * @param {boolean} [options.checkRevocation] — If true, step 3 checks revocation list (sensitive routes)
 * @param {string} [options.resourceDepartmentIdParam] — Param name for departmentId to check (step 4)
 * @param {string} [options.projectIdParam] — Param name for projectId; if set, step 6 checks project membership
 * @param {boolean} [options.sensitive] — If true, log access to TenantAuditLog
 * @param {string} [options.auditResourceType] — Resource type for audit (e.g. 'payroll', 'project')
 */
function requireErpAccess(options = {}) {
  const {
    allowedRoles,
    module: permissionModule,
    action: permissionAction,
    checkRevocation = false,
    resourceDepartmentIdParam,
    projectIdParam = 'projectId',
    sensitive = false,
    auditResourceType = 'module'
  } = options;

  return async (req, res, next) => {
    try {
      // Step 1: Tenant context (fallback: org->tenant for business routes not under /api/tenant/:slug)
      let tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
      if (!tenantId && req.user?._id && req.user?.orgId) {
        try {
          const Organization = require('../../models/Organization');
          const org = await Organization.findById(req.user.orgId).select('tenantId').lean();
          tenantId = org?.tenantId;
        } catch (_) {
          // Ignore org lookup fallback failures; access checks continue with available tenant context.
        }
      }
      const orgId = req.tenantContext?.orgId || req.user?.orgId;
      if (!tenantId || !req.user?._id) {
        return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
      }

      // Step 2: User is active (not suspended/terminated)
      const user = await User.findById(req.user._id).select('status').lean();
      if (!user || user.status !== 'active') {
        return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
      }

      // Step 3: Revocation list (sensitive routes only)
      if (checkRevocation) {
        const revoked = await permissionCache.isRevoked(tenantId.toString(), req.user._id.toString());
        if (revoked) {
          return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
        }
      }

      // Step 4: Department access (if resource has department)
      if (resourceDepartmentIdParam) {
        const resourceDeptId = req.params[resourceDepartmentIdParam] || req.body?.[resourceDepartmentIdParam];
        if (resourceDeptId) {
          const userDepts = await TenantDepartmentAccess.findActiveForUser(tenantId, req.user._id);
          const userDeptIds = userDepts.map(d => (d.departmentId && (d.departmentId._id || d.departmentId)).toString()).filter(Boolean);
          if (userDeptIds.length > 0 && !userDeptIds.includes(resourceDeptId.toString())) {
            return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
          }
        }
      }

      // Step 5: Role / permission (resolved UPR or legacy allowedRoles)
      if (permissionModule && permissionAction) {
        const resolved = await getResolvedPermissions(req.user._id, tenantId, {
          hrSubRole: req.user.hrSubRole,
          financeSubRole: req.user.financeSubRole
        });
        const actions = Array.isArray(permissionAction) ? permissionAction : [permissionAction];
        let permitted = hasAnyPermission(resolved.permissions, permissionModule, actions);
        // Self-service: employees may read only their own row via ?userId=<login user id>
        if (!permitted && permissionModule === 'employees' && actions.includes('read')) {
          const qUid = req.query?.userId;
          if (
            qUid &&
            String(qUid) === String(req.user._id) &&
            hasPermission(resolved.permissions, 'employees', 'read_own')
          ) {
            permitted = true;
          }
        }
        // Self-service: employees may write only their own attendance rows with attendance:write_own
        if (!permitted && permissionModule === 'attendance' && actions.includes('write')) {
          const targetEmployeeId = req.body?.employeeId || req.query?.employeeId;
          if (targetEmployeeId && hasPermission(resolved.permissions, 'attendance', 'write_own')) {
            const ownEmployeeQuery = {
              $or: [{ _id: targetEmployeeId }, { employeeId: targetEmployeeId }, { userId: targetEmployeeId }],
              userId: req.user._id
            };
            if (orgId) {
              ownEmployeeQuery.$and = [{ $or: [{ organizationId: orgId }, { orgId }] }];
            }
            const ownEmployee = await Employee.findOne(ownEmployeeQuery).select('_id userId').lean();
            if (ownEmployee && String(ownEmployee.userId) === String(req.user._id)) {
              permitted = true;
            }
          }
        }
        if (!permitted) {
          return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
        }
      } else if (allowedRoles && allowedRoles.length > 0) {
        const role = req.user.role || req.user.roles?.[0]?.role;
        if (!role || !allowedRoles.includes(role)) {
          return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
        }
      }

      // Step 5: Project membership (if project-scoped and param provided)
      if (projectIdParam != null) {
        const projectId = req.params[projectIdParam] || req.body?.[projectIdParam];
        if (projectId) {
          const role = String(req.user.role || '').toLowerCase();
          const isClientRole = role === 'client' || role === 'customer';
          // Client portal routes enforce ownership in their own handlers.
          // Skipping workspace membership here avoids false 403 for valid clients.
          if (isClientRole) {
            return next();
          }
          const project = await Project.findById(projectId).select('workspaceId').lean();
          if (project?.workspaceId) {
            const workspace = await Workspace.findById(project.workspaceId).select('ownerId members').lean();
            if (workspace) {
              const isOwner = workspace.ownerId && workspace.ownerId.toString() === req.user._id.toString();
              const isMember = workspace.members?.some(m => m.userId?.toString() === req.user._id.toString() && m.status === 'active');
              if (!isOwner && !isMember) {
                return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
              }
            }
          }
        }
      }

      // Step 7: Audit if sensitive
      if (sensitive && tenantId && orgId) {
        try {
          const TenantAuditLog = require('../../models/TenantAuditLog');
          await TenantAuditLog.logEvent({
            tenantId,
            orgId,
            userId: req.user._id,
            action: 'READ',
            resourceType: auditResourceType,
            resourceId: req.path || req.originalUrl,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
            metadata: { method: req.method }
          });
        } catch (auditErr) {
          console.warn('Audit log write failed:', auditErr.message);
        }
      }

      next();
    } catch (err) {
      console.error('ErpAccessControl error:', err);
      return res.status(403).json({ success: false, message: GENERIC_FORBIDDEN_MESSAGE });
    }
  };
}

module.exports = { requireErpAccess, GENERIC_FORBIDDEN_MESSAGE };
