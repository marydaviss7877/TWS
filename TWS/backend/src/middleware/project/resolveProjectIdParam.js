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

async function resolveSlugToId(req, value) {
  const orgId = await ensureOrgId(req);
  if (!orgId) return { error: 'no-org' };
  const project = await Project.findOne({ orgId, slug: value }).select('_id').lean();
  if (!project) return { error: 'not-found' };
  return { id: String(project._id) };
}

function resolveProjectIdParam(paramName = 'projectId') {
  return async function resolveProjectIdParamMiddleware(req, res, next) {
    try {
      const value = req.params[paramName];
      if (!value || OBJECT_ID_RE.test(value)) {
        return next();
      }

      const result = await resolveSlugToId(req, value);
      if (result.error === 'no-org') {
        return res.status(500).json({ success: false, message: 'Organization context not available' });
      }
      if (result.error === 'not-found') {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      req.params[paramName] = result.id;
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

/**
 * Same resolution, but for `projectId` carried as a query string value (GET /tasks?projectId=...)
 * or a JSON body field (POST /tasks { projectId }) rather than a URL path segment. Most
 * project-scoped sub-resources (tasks, milestones, sprints, resources, timesheets, boards) take
 * projectId this way instead of as a route param, so this needs to run for every request on
 * this router, not just the routes that literally have :projectId in their path.
 */
async function resolveProjectIdInQueryAndBody(req, res, next) {
  try {
    const fromQuery = typeof req.query?.projectId === 'string' ? req.query.projectId : null;
    const fromBody = req.body && typeof req.body.projectId === 'string' ? req.body.projectId : null;

    for (const [source, value] of [['query', fromQuery], ['body', fromBody]]) {
      if (!value || OBJECT_ID_RE.test(value)) continue;

      const result = await resolveSlugToId(req, value);
      if (result.error === 'no-org') {
        return res.status(500).json({ success: false, message: 'Organization context not available' });
      }
      if (result.error === 'not-found') {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      if (source === 'query') req.query.projectId = result.id;
      else req.body.projectId = result.id;
    }

    next();
  } catch (error) {
    console.error('resolveProjectIdInQueryAndBody error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve project'
    });
  }
}

module.exports = resolveProjectIdParam;
module.exports.resolveProjectIdInQueryAndBody = resolveProjectIdInQueryAndBody;
