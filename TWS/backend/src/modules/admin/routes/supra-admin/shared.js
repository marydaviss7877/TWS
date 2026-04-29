/**
 * Shared imports and utilities for Supra Admin routes
 * Used by all split route modules to avoid duplication
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const os = require('os');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { authenticateToken } = require('../../../../middleware/auth/auth');
const {
  PlatformRBAC,
  requirePlatformPermission,
  requirePlatformRole,
  PLATFORM_PERMISSIONS
} = require('../../../../middleware/auth/platformRBAC');
const requirePlatformAdminAccessReason = require('../../../../middleware/auth/requirePlatformAdminAccessReason');
const ErrorHandler = require('../../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../../middleware/validation/validation');

// Models
const TWSAdmin = require('../../../../models/admin-platform/TWSAdmin');
const Tenant = require('../../../../models/tenant/Tenant');
const User = require('../../../../models/users-auth/User');
const Organization = require('../../../../models/org/Organization');
const Billing = require('../../../../models/finance/Billing');
const MasterERP = require('../../../../models/integrations/MasterERP');
const Department = require('../../../../models/org/Department');
const PlatformAdminApproval = require('../../../../models/admin-platform/PlatformAdminApproval');
const PortalUser = require('../../../../models/users-auth/PortalUser');

// Services
const tenantService = require('../../../../services/tenant/tenant.service');
const platformAdminAccessService = require('../../../../services/tenant/platform-admin-access.service');
const analyticsService = require('../../../../services/analytics/analytics.service');
const systemMonitoringService = require('../../../../services/SystemMonitoringService');
const billingService = require('../../../../services/billingService');
const auditService = require('../../../../services/compliance/audit.service');

module.exports = {
  express,
  body,
  validationResult,
  os,
  mongoose,
  bcrypt,
  authenticateToken,
  PlatformRBAC,
  requirePlatformPermission,
  requirePlatformRole,
  PLATFORM_PERMISSIONS,
  requirePlatformAdminAccessReason,
  ErrorHandler,
  ValidationMiddleware,
  TWSAdmin,
  Tenant,
  User,
  Organization,
  Billing,
  MasterERP,
  Department,
  PlatformAdminApproval,
  PortalUser,
  tenantService,
  platformAdminAccessService,
  analyticsService,
  systemMonitoringService,
  billingService,
  auditService
};
