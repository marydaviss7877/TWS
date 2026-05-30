const express = require('express');
const router = express.Router();

const coreRoutes = require('./core.routes');
const tenantRoutes = require('./tenant.routes');
const attendanceRoutes = require('./attendance.routes');
const projectsRoutes = require('./projects.routes');
const timeTrackingRoutes = require('./timeTracking.routes');
const softwareHouseRolesRoutes = require('./softwareHouseRoles.routes');

// Mount core routes at root (so /health and /metrics work as before)
router.use('/', coreRoutes);

// Mount tenant routes at root (because tenant.routes.js defines /api/tenant/:tenantSlug/info)
router.use('/', tenantRoutes);

// Mount unified attendance domain
router.use('/attendance', attendanceRoutes);

// Mount unified projects domain
router.use('/projects', projectsRoutes);

// Mount unified time tracking domain
router.use('/time-tracking', timeTrackingRoutes);

// Mount unified software-house roles domain
router.use('/software-house-roles', softwareHouseRolesRoutes);

module.exports = router;
