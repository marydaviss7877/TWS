/**
 * Resolves a project route param that may be either a Mongo ObjectId or a
 * project slug (e.g. "acme-website-redesign-a1b2c3") into the real ObjectId,
 * scoped to the authenticated org, before the route handler runs.
 *
 * This lets URLs show a readable project slug instead of the raw ObjectId
 * while every downstream controller keeps working against req.params[paramName]
 * exactly as before.
 */
const Project = require('../../models/project-delivery/Project');
const { ensureOrgId } = require('../../utils/orgIdHelper');

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function resolveProjectIdParam(paramName = 'projectId') {
  return async function resolveProjectIdParamMiddleware(req, res, next) {
    try {
      const value = req.params[paramName];
      if (!value || OBJECT_ID_RE.test(value)) {
        return next();
      }

      const orgId = await ensureOrgId(req);
      if (!orgId) {
        return res.status(500).json({
          success: false,
          message: 'Organization context not available'
        });
      }

      const project = await Project.findOne({ orgId, slug: value }).select('_id').lean();
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      req.params[paramName] = String(project._id);
      next();
    } catch (error) {
      console.error('resolveProjectIdParam error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve project'
      });
    }
  };
}

module.exports = resolveProjectIdParam;
