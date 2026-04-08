/**
 * Frontend Services Index
 * 
 * This file provides a centralized, organized interface to all frontend services.
 * Services are organized by category for better navigation and maintainability.
 * 
 * Structure:
 * - Analytics: Analytics & insights services
 * - Auth: Authentication & token services
 * - Tenant: Tenant management services
 * - Business: Business logic services
 * - Industry: Industry-specific APIs
 */

// ============================================================================
// ANALYTICS SERVICES - Analytics & insights
// ============================================================================
export { default as analyticsService } from './analytics/analytics.service';
export { default as aiInsightsService } from './analytics/ai-insights.service';

// ============================================================================
// AUTH SERVICES - Authentication & token management
// ============================================================================
export { default as secureTokenService } from './auth/secure-token.service';
export { default as tokenRefreshService } from './auth/token-refresh.service';

// ============================================================================
// TENANT SERVICES - Tenant management
// ============================================================================
export { default as tenantApiService } from './tenant/tenant-api.service';

// ============================================================================
// BUSINESS SERVICES - Business logic
// ============================================================================
export { default as billingService } from './business/billing.service';
export { default as formManagementService } from './business/form-management.service';
export { default as partnerService } from './business/partner.service';
export { default as resourceService } from './business/resource.service';
export { default as taskService } from './business/task.service';
export { default as usageTrackingService } from './business/usage-tracking.service';
export { default as workspaceService } from './business/workspace.service';

// ============================================================================
// INDUSTRY SERVICES - Industry-specific APIs
// ============================================================================
export * from './industry';

// ============================================================================
// ORGANIZED EXPORTS - Category-based access
// ============================================================================
export const analytics = {
  analyticsService: () => import('./analytics/analytics.service'),
  aiInsightsService: () => import('./analytics/ai-insights.service')
};

export const auth = {
  secureTokenService: () => import('./auth/secure-token.service'),
  tokenRefreshService: () => import('./auth/token-refresh.service')
};

export const tenant = {
  tenantApiService: () => import('./tenant/tenant-api.service')
};

export const business = {
  billingService: () => import('./business/billing.service'),
  formManagementService: () => import('./business/form-management.service'),
  partnerService: () => import('./business/partner.service'),
  resourceService: () => import('./business/resource.service'),
  taskService: () => import('./business/task.service'),
  usageTrackingService: () => import('./business/usage-tracking.service'),
  workspaceService: () => import('./business/workspace.service')
};

// Re-export industry services
export * as industry from './industry';
