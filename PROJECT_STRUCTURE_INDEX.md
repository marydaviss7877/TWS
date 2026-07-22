# TWS Project Structure Index

Generated: 2026-07-22T08:14:14.816Z

## Summary
- Total Files: 880
- Frontend Files: 460
- Backend Files: 420
- Files with Dependencies: 550
- Total Dependencies: 2156

## Frontend Structure

### Pages (260 files)

- features/admin/pages/PartnerManagement.js
- features/admin/pages/RoleManagement.js
- features/admin/pages/SupraAdmin/SupraAdmin.js
- features/admin/pages/SupraAdmin/Users.js
- features/admin/pages/SupraAdmin/analytics/Analytics.js
- features/admin/pages/SupraAdmin/analytics/SessionAnalytics.js
- features/admin/pages/SupraAdmin/billing/BillingManagement.js
- features/admin/pages/SupraAdmin/dashboard/Dashboard.js
- features/admin/pages/SupraAdmin/dashboard/SupraAdminDashboard.js
- features/admin/pages/SupraAdmin/departments/DepartmentAccess.js
- features/admin/pages/SupraAdmin/departments/DepartmentManagement.js
- features/admin/pages/SupraAdmin/departments/Departments.js
- features/admin/pages/SupraAdmin/erp/ERPManagement.js
- features/admin/pages/SupraAdmin/infrastructure/Infrastructure.js
- features/admin/pages/SupraAdmin/monitoring/SystemHealth.js
- features/admin/pages/SupraAdmin/sessions/SessionManagement.js
- features/admin/pages/SupraAdmin/settings/Settings.js
- features/admin/pages/SupraAdmin/tenants/TenantManagement.js
- features/admin/pages/SupraAdmin/tenants/TenantUsers.js
- features/admin/pages/SupraAdmin/users/Users.js
- features/admin/pages/SystemAdmin.js
- features/admin/pages/admin/ModerationDashboard.js
- features/admin/pages/admin/ProjectManagement.js
- features/admin/pages/admin/projects/Milestones.js
- features/admin/pages/admin/projects/MyProjects.js
- features/admin/pages/admin/projects/ProjectOverview.js
- features/admin/pages/admin/projects/Resources.js
- features/admin/pages/admin/projects/TaskBoard.js
- features/admin/pages/admin/projects/Templates.js
- features/admin/pages/admin/projects/Timesheets.js
- ... and 230 more files

### Components (130 files)

- components/AdminPageTemplate/AdminPageTemplate.jsx
- components/AdminPageTemplate/index.js
- components/ConfirmDialog/ConfirmDialog.jsx
- components/ConfirmDialog/index.js
- components/finance/RoleBasedAccessInfo.js
- components/ui/Avatar/Avatar.jsx
- components/ui/Avatar/index.js
- components/ui/Badge/Badge.jsx
- components/ui/Badge/index.js
- components/ui/Button/Button.jsx
- components/ui/Button/index.js
- components/ui/Command/Command.jsx
- components/ui/Command/index.js
- components/ui/Dialog/Dialog.jsx
- components/ui/Dialog/index.js
- components/ui/DropdownMenu/DropdownMenu.jsx
- components/ui/DropdownMenu/index.js
- components/ui/Input/Input.jsx
- components/ui/Input/index.js
- components/ui/ScrollArea/ScrollArea.jsx
- components/ui/ScrollArea/index.js
- components/ui/Separator/Separator.jsx
- components/ui/Separator/index.js
- components/ui/Sheet/Sheet.jsx
- components/ui/Sheet/index.js
- components/ui/Tooltip/Tooltip.jsx
- components/ui/Tooltip/index.js
- components/ui/avatar.jsx
- components/ui/badge.jsx
- components/ui/button.jsx
- ... and 100 more files

### Services (17 files)

- features/projects/services/listApiService.js
- features/projects/services/projectApiService.js
- shared/services/analytics/ai-insights.service.js
- shared/services/analytics/analytics.service.js
- shared/services/auth/token-refresh.service.js
- shared/services/business/billing.service.js
- shared/services/business/form-management.service.js
- shared/services/business/resource.service.js
- shared/services/business/task.service.js
- shared/services/business/usage-tracking.service.js
- shared/services/index.js
- shared/services/industry/config/apiConfig.js
- shared/services/industry/index.js
- shared/services/industry/softwareHouseApi.js
- shared/services/industry/utils/apiClientFactory.js
- shared/services/industry/utils/tokenUtils.js
- shared/services/tenant/tenant-api.service.js

### Utils (19 files)

- features/projects/utils/dateUtils.js
- features/projects/utils/errorHandler.js
- features/projects/utils/validation.js
- features/tenant/utils/industryMenuBuilder.js
- features/tenant/utils/themeConfig.js
- features/tenant/utils/useThemeStyles.js
- features/tenant/utils/useToken.js
- lib/utils.js
- shared/utils/apiClient.js
- shared/utils/auth.js
- shared/utils/axiosInstance.js
- shared/utils/debugExternalScripts.js
- shared/utils/errorHandler.js
- shared/utils/logger.js
- shared/utils/setupMockAuth.js
- shared/utils/statusUtils.js
- shared/utils/subdomain.js
- shared/utils/tenantRoutes.js
- shared/utils/websocket.js

### Layouts (1 files)

- layouts/SupraAdminLayout.js

### Providers (6 files)

- app/providers/AuthContext.js
- app/providers/SocketContext.js
- app/providers/TenantAuthContext.js
- app/providers/TenantContext.js
- app/providers/ThemeContext.js
- features/tenant/providers/TenantThemeProvider.js

### Hooks (11 files)

- features/tenant/hooks/__tests__/useMenuFiltering.test.js
- features/tenant/hooks/useAppNavigation.js
- features/tenant/hooks/useMenuFiltering.js
- features/tenant/hooks/useTenantTheme.js
- hooks/useFullscreen.js
- hooks/useKeyboardShortcuts.js
- shared/hooks/useKeyboardShortcuts.js
- shared/hooks/useResponsive.js
- shared/hooks/useRoleBasedUI.js
- shared/hooks/useSocket.js
- shared/hooks/useTenantSlug.js

### Config (2 files)

- app/config/api.js
- app/config/firebase.js

## Backend Structure

### Routes (105 files)

- modules/admin/routes/admin.js
- modules/admin/routes/attendancePanel.js
- modules/admin/routes/index.js
- modules/admin/routes/moderation.js
- modules/admin/routes/supra-admin/access.js
- modules/admin/routes/supra-admin/billing.js
- modules/admin/routes/supra-admin/dashboard.js
- modules/admin/routes/supra-admin/departments.js
- modules/admin/routes/supra-admin/index.js
- modules/admin/routes/supra-admin/masterErp.js
- modules/admin/routes/supra-admin/shared.js
- modules/admin/routes/supra-admin/system.js
- modules/admin/routes/supra-admin/tenants.js
- modules/admin/routes/supra-admin/users.js
- modules/admin/routes/supraReports.js
- modules/admin/routes/supraSessions.js
- modules/admin/routes/supraTenantERP.js
- modules/auth/routes/authentication.js
- modules/auth/routes/index.js
- modules/auth/routes/sessions.js
- modules/auth/routes/tenantAuth.js
- modules/auth/routes/users.js
- modules/business/routes/attendance.js
- modules/business/routes/attendanceIntegration.js
- modules/business/routes/billing.js
- modules/business/routes/boards.js
- modules/business/routes/cards.js
- modules/business/routes/clientPortal.js
- modules/business/routes/clients.js
- modules/business/routes/developmentMetrics.js
- ... and 75 more files

### Controllers (2 files)

- controllers/tenant/projectsController.js
- controllers/tenantController.js

### Models (88 files)

- models/admin-platform/OnboardingChecklist.js
- models/admin-platform/PlatformAdminApproval.js
- models/admin-platform/SoftwareHouseRole.js
- models/admin-platform/SupraAdmin.js
- models/admin-platform/TWSAdmin.js
- models/analytics/Activity.js
- models/analytics/Analytics.js
- models/analytics/ClientHealth.js
- models/analytics/ClientTouchpoint.js
- models/analytics/CodeQuality.js
- models/analytics/DevelopmentMetrics.js
- models/core/Approval.js
- models/core/AuditLog.js
- models/core/Permission.js
- models/core/Resource.js
- models/core/Role.js
- models/core/Session.js
- models/core/TenantAwareModel.js
- models/documents/DocumentFolder.js
- models/documents/DocumentShare.js
- models/documents/DocumentTag.js
- models/documents/File.js
- models/documents/FormResponse.js
- models/documents/FormTemplate.js
- models/documents/OrgDocument.js
- models/documents/OrgDocumentAudit.js
- models/documents/OrgDocumentComment.js
- models/documents/OrgDocumentVersion.js
- models/finance/Billing.js
- models/finance/Equity.js
- ... and 58 more files

### Services (128 files)

- services/MonitoringWebSocketService.js
- services/StandaloneMonitoringService.js
- services/SystemMonitoringService.js
- services/aiPayrollService.js
- services/analytics/ai-insights.service.js
- services/analytics/analytics.service.js
- services/analytics/data-warehouse.service.js
- services/analytics/department-dashboard.service.js
- services/analytics/metrics.service.js
- services/attendanceIntegrationService.js
- services/attendanceService.js
- services/attendanceSocketService.js
- services/auth/jwt.service.js
- services/auth/token-blacklist.service.js
- services/billingService.js
- services/biometricService.js
- services/business/timeAggregation.service.js
- services/cachingService.js
- services/clientHealthService.js
- services/compliance/audit-log.service.js
- services/compliance/audit.service.js
- services/compliance/compliance.service.js
- services/compliance/retention.service.js
- services/core/cache.service.js
- services/core/connectionPool.service.js
- services/core/databaseProvisioning.service.js
- services/core/e2eEncryption.service.js
- services/core/encryption.service.js
- services/core/logger.service.js
- services/core/redis.service.js
- ... and 98 more files

### Middleware (47 files)

- middleware/audit/auditLog.js
- middleware/audit/auditLogger.js
- middleware/audit/metricsMiddleware.js
- middleware/audit/observability.js
- middleware/auth/auth.js
- middleware/auth/erpAccessControl.js
- middleware/auth/permissions.js
- middleware/auth/platformAdminAccessMiddleware.js
- middleware/auth/platformRBAC.js
- middleware/auth/portalAuth.js
- middleware/auth/projectManagementPermissions.js
- middleware/auth/rbac.js
- middleware/auth/requirePlatformAdminAccessReason.js
- middleware/auth/unifiedPermissionMiddleware.js
- middleware/auth/unifiedSoftwareHouseAuth.js
- middleware/auth/unifiedTenantAuth.js
- middleware/auth/verifyERPToken.js
- middleware/auth/verifyERPToken.secure.js
- middleware/auth/workspaceIsolation.js
- middleware/common/cache.js
- middleware/common/errorHandler.js
- middleware/common/featureGate.js
- middleware/common/idempotency.js
- middleware/common/pagination.js
- middleware/common/sessionTimeout.js
- middleware/compliance/healthcareFileUpload.js
- middleware/rateLimiting/rateLimiter.js
- middleware/rateLimiting/uploadRateLimiter.js
- middleware/security/cookieSecurity.js
- middleware/security/csrfProtection.js
- ... and 17 more files

### Utils (9 files)

- utils/complianceTesting.js
- utils/errorHandler.js
- utils/logger.js
- utils/modelSchemaHelper.js
- utils/nucleusHelpers.js
- utils/orgIdHelper.js
- utils/pagination.js
- utils/projectDepartmentView.js
- utils/tenantModelHelper.js

### Config (14 files)

- config/authTokenStrategy.js
- config/billingConfig.js
- config/ecosystem.config.js
- config/environment-validator.js
- config/environment.js
- config/firebase-admin.js
- config/logging.js
- config/permissions.js
- config/projectManagementPermissions.js
- config/redis.js
- config/s3.js
- config/security.js
- config/swagger.js
- migrations/005-project-department-configs.js

### Modules (10 files)

- modules/auth/__tests__/critical-workflow-access.integration.test.js
- modules/auth/__tests__/login.nosql-injection.security.test.js
- modules/auth/__tests__/role-aware-workflows.integration.test.js
- modules/auth/__tests__/route-level-critical-workflows.integration.test.js
- modules/business/erp/software-house/index.js
- modules/business/erp/software-house/nucleusPM.js
- modules/index.js
- modules/tenant/__tests__/settings-general-route-access.integration.test.js
- modules/tenant/erp/software-house/index.js
- modules/tenant/erp/software-house/softwareHouse.js

## Key Dependencies

### App.jsx (123 dependencies)
  - app/providers/AuthContext.js
  - app/providers/ThemeContext.js
  - app/providers/SocketContext.js
  - shared/utils/errorHandler.js
  - shared/utils/tenantRoutes.js
  - shared/utils/subdomain.js
  - pages/Auth/SupraAdminLogin/SupraAdminLogin.jsx
  - pages/Auth/SoftwareHouseSignup/SoftwareHouseSignup.jsx
  - pages/Auth/SoftwareHouseLogin/SoftwareHouseLogin.jsx
  - pages/Auth/SoftwareHouseForgotPassword/SoftwareHouseForgotPassword.jsx
  - ... and 113 more

### services/tenant/tenant-org.service.js (70 dependencies)
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/users-auth/User.js
  - models/hr-payroll/Employee.js
  - models/project-delivery/Project.js
  - models/project-delivery/Task.js
  - models/finance/Finance.js
  - models/hr-payroll/Attendance.js
  - models/hr-payroll/Payroll.js
  - models/org/Department.js
  - ... and 60 more

### modules/tenant/routes/organization.js (48 dependencies)
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/org/DepartmentAccess.js
  - models/users-auth/User.js
  - models/hr-payroll/Employee.js
  - models/hr-payroll/LeaveRequest.js
  - models/hr-payroll/Payroll.js
  - services/hr/payroll-time-sync.service.js
  - models/org/OrgLeavePolicy.js
  - models/tenant/TenantSettings.js
  - ... and 38 more

### modules/business/routes/index.js (33 dependencies)
  - modules/business/routes/employees.js
  - modules/business/routes/attendance.js
  - modules/business/routes/attendanceIntegration.js
  - modules/business/routes/payroll.js
  - modules/business/routes/finance.js
  - modules/business/routes/billing.js
  - routes/projects.routes.js
  - modules/business/routes/projectAccess.js
  - modules/business/routes/tasks.js
  - modules/business/routes/teams.js
  - ... and 23 more

### controllers/tenant/projectsController.js (25 dependencies)
  - models/project-delivery/Project.js
  - models/project-delivery/Task.js
  - models/org/Organization.js
  - models/industry/Client.js
  - models/project-delivery/Milestone.js
  - models/core/Resource.js
  - models/project-delivery/Sprint.js
  - models/finance/Finance.js
  - models/users-auth/User.js
  - models/project-delivery/TaskDependency.js
  - ... and 15 more

### modules/tenant/routes/softwareHouse.js (24 dependencies)
  - middleware/auth/rbac.js
  - middleware/common/errorHandler.js
  - models/tenant/Tenant.js
  - models/admin-platform/SoftwareHouseRole.js
  - models/project-delivery/Project.js
  - models/industry/Card.js
  - models/project-delivery/Sprint.js
  - models/analytics/DevelopmentMetrics.js
  - models/finance/Finance.js
  - models/finance/Expense.js
  - ... and 14 more

### services/tenant/tenant-lifecycle.service.js (22 dependencies)
  - models/tenant/Tenant.js
  - models/users-auth/User.js
  - models/org/Organization.js
  - services/auth/token-blacklist.service.js
  - models/core/AuditLog.js
  - models/finance/Billing.js
  - models/core/Session.js
  - models/tenant/TenantSettings.js
  - models/tenant/TenantUser.js
  - models/tenant/TenantRole.js
  - ... and 12 more

### features/tenant/components/TenantOrgLayout.js (20 dependencies)
  - shared/hooks/useTenantSlug.js
  - app/providers/TenantAuthContext.js
  - app/providers/ThemeContext.js
  - features/tenant/utils/industryMenuBuilder.js
  - features/tenant/providers/TenantThemeProvider.js
  - features/tenant/utils/useThemeStyles.js
  - hooks/useFullscreen.js
  - hooks/useKeyboardShortcuts.js
  - features/tenant/hooks/useMenuFiltering.js
  - features/tenant/hooks/useAppNavigation.js
  - ... and 10 more

### modules/admin/routes/supra-admin/shared.js (20 dependencies)
  - middleware/auth/auth.js
  - middleware/auth/platformRBAC.js
  - middleware/auth/requirePlatformAdminAccessReason.js
  - middleware/common/errorHandler.js
  - middleware/validation/validation.js
  - models/admin-platform/TWSAdmin.js
  - models/tenant/Tenant.js
  - models/users-auth/User.js
  - models/org/Organization.js
  - models/finance/Billing.js
  - ... and 10 more

### jobs/scheduler.js (19 dependencies)
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/hr-payroll/EmployeeMetrics.js
  - models/hr-payroll/Employee.js
  - models/project-delivery/Project.js
  - models/industry/Client.js
  - services/usageTrackerService.js
  - services/projectProfitabilityService.js
  - services/hrPerformanceService.js
  - services/clientHealthService.js
  - ... and 9 more

### modules/auth/routes/authentication.js (15 dependencies)
  - middleware/auth/auth.js
  - middleware/auth/verifyERPToken.js
  - middleware/common/errorHandler.js
  - middleware/rateLimiting/rateLimiter.js
  - middleware/security/cookieSecurity.js
  - models/users-auth/User.js
  - models/org/Organization.js
  - models/admin-platform/TWSAdmin.js
  - models/org/Organization.js
  - models/tenant/Tenant.js
  - ... and 5 more

### modules/business/erp/software-house/nucleusPM.js (15 dependencies)
  - middleware/auth/auth.js
  - middleware/auth/workspaceIsolation.js
  - middleware/common/errorHandler.js
  - models/project-delivery/Project.js
  - models/project-delivery/Deliverable.js
  - models/project-delivery/Task.js
  - models/core/Approval.js
  - models/project-delivery/ChangeRequest.js
  - models/org/Workspace.js
  - models/users-auth/User.js
  - ... and 5 more

### features/tenant/pages/tenant/org/software-house/employee-portal/EmployeePortal.js (14 dependencies)
  - app/providers/AuthContext.js
  - app/providers/TenantAuthContext.js
  - features/tenant/contexts/TenantPermissionsContext.js
  - shared/services/tenant/tenant-api.service.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeProfileView.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeAttendanceView.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeLeaveRequests.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeePerformanceView.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeePayrollView.js
  - features/tenant/pages/tenant/org/software-house/employee-portal/EmployeeDocumentsView.js
  - ... and 4 more

### modules/business/routes/employees.js (14 dependencies)
  - middleware/auth/erpAccessControl.js
  - middleware/common/errorHandler.js
  - middleware/validation/validation.js
  - models/hr-payroll/Employee.js
  - models/users-auth/User.js
  - middleware/security/resourceAccessCheck.js
  - models/org/Organization.js
  - models/tenant/TenantUser.js
  - services/tenant/permissionResolver.service.js
  - models/org/Organization.js
  - ... and 4 more

### modules/tenant/erp/software-house/softwareHouse.js (14 dependencies)
  - middleware/auth/auth.js
  - middleware/common/errorHandler.js
  - models/tenant/Tenant.js
  - models/admin-platform/SoftwareHouseRole.js
  - models/project-delivery/Project.js
  - models/industry/Card.js
  - models/project-delivery/Sprint.js
  - models/analytics/DevelopmentMetrics.js
  - models/finance/Finance.js
  - models/industry/Client.js
  - ... and 4 more

### services/integrations/project-integration.service.js (14 dependencies)
  - models/project-delivery/Task.js
  - models/project-delivery/Sprint.js
  - models/project-delivery/Milestone.js
  - models/project-delivery/ProjectTypeSettings.js
  - models/finance/Finance.js
  - models/project-delivery/TaskDependency.js
  - services/ganttChartService.js
  - services/module-api/project-api.service.js
  - models/finance/Finance.js
  - models/finance/Finance.js
  - ... and 4 more

### routes/projects.routes.js (13 dependencies)
  - controllers/tenant/projectsController.js
  - middleware/auth/rbac.js
  - middleware/rateLimiting/rateLimiter.js
  - middleware/common/errorHandler.js
  - middleware/validation/requestValidation.js
  - middleware/common/idempotency.js
  - middleware/auth/verifyERPToken.js
  - middleware/rateLimiting/rateLimiter.js
  - middleware/common/featureGate.js
  - middleware/validation/ownershipMiddleware.js
  - ... and 3 more

### services/notifications/notification.service.js (13 dependencies)
  - models/notifications/Notification.js
  - models/users-auth/User.js
  - models/notifications/NotificationPreference.js
  - services/integrations/email.service.js
  - models/project-delivery/Project.js
  - models/project-delivery/Deliverable.js
  - models/core/Approval.js
  - models/project-delivery/ChangeRequest.js
  - models/users-auth/User.js
  - models/users-auth/User.js
  - ... and 3 more

### services/tenant/self-serve-signup.service.js (13 dependencies)
  - models/users-auth/User.js
  - models/tenant/Tenant.js
  - models/tenant/TenantRole.js
  - models/tenant/TenantUser.js
  - models/org/Organization.js
  - services/integrations/email-verification.service.js
  - services/tenantProvisioningService/index.js
  - services/integrations/email.service.js
  - services/masterERPService.js
  - config/environment-validator.js
  - ... and 3 more

### services/tenant/tenant-data.service.js (13 dependencies)
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/org/Department.js
  - models/users-auth/User.js
  - models/project-delivery/Project.js
  - models/project-delivery/Task.js
  - models/industry/Client.js
  - models/hr-payroll/Employee.js
  - services/tenant/tenant-model.service.js
  - services/tenant/tenant-connection-pool.service.js
  - ... and 3 more

### services/documentHub/documentHub.service.js (12 dependencies)
  - models/documents/OrgDocument.js
  - models/documents/OrgDocumentVersion.js
  - models/documents/OrgDocumentAudit.js
  - models/documents/OrgDocumentComment.js
  - models/documents/DocumentShare.js
  - models/documents/DocumentFolder.js
  - models/documents/DocumentTag.js
  - models/org/Department.js
  - models/tenant/TenantDepartmentAccess.js
  - models/users-auth/User.js
  - ... and 2 more

### middleware/auth/verifyERPToken.js (11 dependencies)
  - services/auth/jwt.service.js
  - services/auth/token-blacklist.service.js
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/users-auth/User.js
  - models/org/Workspace.js
  - models/tenant/TenantUser.js
  - services/compliance/audit.service.js
  - config/environment-validator.js
  - services/tenant/platform-admin-access.service.js
  - ... and 1 more

### modules/business/routes/attendance.js (11 dependencies)
  - middleware/auth/erpAccessControl.js
  - middleware/common/errorHandler.js
  - middleware/validation/validation.js
  - models/hr-payroll/Attendance.js
  - models/hr-payroll/AttendancePolicy.js
  - models/hr-payroll/AttendanceShift.js
  - models/hr-payroll/AttendanceAudit.js
  - models/hr-payroll/Employee.js
  - services/hr/attendance.service.js
  - services/tenant/permissionResolver.service.js
  - ... and 1 more

### modules/business/routes/payroll.js (11 dependencies)
  - middleware/auth/erpAccessControl.js
  - middleware/common/errorHandler.js
  - middleware/validation/validation.js
  - middleware/common/featureGate.js
  - models/hr-payroll/Payroll.js
  - services/tenant/permissionResolver.service.js
  - models/hr-payroll/AIPayroll.js
  - models/hr-payroll/Employee.js
  - models/users-auth/User.js
  - services/aiPayrollService.js
  - ... and 1 more

### modules/tenant/routes/documents.js (11 dependencies)
  - middleware/common/errorHandler.js
  - middleware/validation/validation.js
  - services/documentHub/documentHub.service.js
  - config/s3.js
  - models/users-auth/User.js
  - models/tenant/Tenant.js
  - models/finance/SubscriptionPlan.js
  - services/usageTrackerService.js
  - middleware/auth/verifyERPToken.js
  - middleware/common/featureGate.js
  - ... and 1 more

### services/tenantProvisioningService/seeders/defaultSeeder.js (11 dependencies)
  - models/tenant/Tenant.js
  - services/tenantProvisioningService/defaultDataCreators/attendancePolicy.js
  - services/tenantProvisioningService/defaultDataCreators/departmentsAndTeams.js
  - services/tenantProvisioningService/defaultDataCreators/employeesAndPayroll.js
  - services/tenantProvisioningService/defaultDataCreators/projectTemplates.js
  - services/tenantProvisioningService/defaultDataCreators/sampleProject.js
  - services/tenantProvisioningService/defaultDataCreators/chartOfAccounts.js
  - services/tenantProvisioningService/defaultDataCreators/financeTransactions.js
  - services/tenantProvisioningService/defaultDataCreators/clientsAndVendors.js
  - services/tenantProvisioningService/defaultDataCreators/notificationTemplates.js
  - ... and 1 more

### middleware/auth/unifiedSoftwareHouseAuth.js (10 dependencies)
  - services/auth/jwt.service.js
  - services/auth/token-blacklist.service.js
  - models/users-auth/User.js
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/org/Workspace.js
  - services/compliance/audit.service.js
  - config/environment-validator.js
  - utils/orgIdHelper.js
  - models/tenant/TenantUser.js

### middleware/auth/unifiedTenantAuth.js (10 dependencies)
  - services/auth/jwt.service.js
  - services/auth/token-blacklist.service.js
  - models/users-auth/User.js
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/org/Workspace.js
  - services/compliance/audit.service.js
  - config/environment-validator.js
  - utils/orgIdHelper.js
  - models/tenant/TenantUser.js

### modules/tenant/routes/changeRequests.js (10 dependencies)
  - models/project-delivery/ChangeRequest.js
  - models/project-delivery/ChangeRequestAudit.js
  - models/project-delivery/Milestone.js
  - models/project-delivery/Deliverable.js
  - models/project-delivery/Project.js
  - models/project-delivery/ProjectMember.js
  - middleware/common/errorHandler.js
  - services/notifications/notification.service.js
  - utils/orgIdHelper.js
  - models/users-auth/User.js

### modules/tenant/routes/departmentAccess.js (10 dependencies)
  - middleware/auth/auth.js
  - middleware/auth/verifyERPToken.js
  - middleware/common/errorHandler.js
  - middleware/auth/erpAccessControl.js
  - models/tenant/TenantDepartmentAccess.js
  - models/org/Department.js
  - models/users-auth/User.js
  - utils/orgIdHelper.js
  - services/tenant/permissionResolver.service.js
  - services/tenant/permissionCache.service.js

### modules/tenant/routes/departments.js (10 dependencies)
  - middleware/auth/auth.js
  - middleware/auth/verifyERPToken.js
  - middleware/auth/erpAccessControl.js
  - middleware/common/errorHandler.js
  - models/org/Department.js
  - services/analytics/department-dashboard.service.js
  - services/tenant/departmentAssignmentSync.service.js
  - utils/orgIdHelper.js
  - middleware/validation/ownershipMiddleware.js
  - middleware/security/resourceAccessCheck.js

### modules/tenant/routes/index.js (10 dependencies)
  - modules/tenant/routes/management.js
  - modules/tenant/routes/dashboard.js
  - modules/tenant/routes/switching.js
  - modules/tenant/routes/organization.js
  - modules/tenant/routes/permissions.js
  - modules/tenant/routes/roles.js
  - modules/tenant/routes/departments.js
  - modules/tenant/routes/departmentAccess.js
  - modules/tenant/routes/audit.js
  - modules/tenant/routes/softwareHouse.js

### services/tenant/tenant.service.js (10 dependencies)
  - models/tenant/Tenant.js
  - models/users-auth/User.js
  - models/org/Organization.js
  - services/core/databaseProvisioning.service.js
  - services/tenant/tenant-connection-pool.service.js
  - utils/logger.js
  - utils/modelSchemaHelper.js
  - services/tenant/tenant-lifecycle.service.js
  - services/tenant/tenant-lifecycle.service.js
  - services/tenant/tenant-lifecycle.service.js

### services/tenantProvisioningService/index.js (10 dependencies)
  - models/tenant/Tenant.js
  - models/users-auth/User.js
  - models/org/Organization.js
  - services/tenantProvisioningService/tenantCreation.js
  - services/tenantProvisioningService/userAndOrgCreation.js
  - services/tenantProvisioningService/seeders/index.js
  - services/tenantProvisioningService/seeders/defaultSeeder.js
  - services/tenantProvisioningService/onboarding.js
  - services/tenantProvisioningService/tenantManagement.js
  - services/tenantProvisioningService/emailService.js

### features/tenant/pages/tenant/org/projects/DeliverableDetail.js (9 dependencies)
  - features/tenant/pages/tenant/org/projects/services/tenantProjectApiService.js
  - features/tenant/pages/tenant/org/projects/utils/errorHandler.js
  - features/tenant/pages/tenant/org/projects/utils/toastNotifications.js
  - features/tenant/pages/tenant/org/projects/components/deliverables/index.js
  - features/tenant/pages/tenant/org/projects/components/approvals/index.js
  - features/tenant/pages/tenant/org/projects/components/approvals/ApprovalChainSetup.js
  - features/tenant/pages/tenant/org/projects/components/deliverables/index.js
  - features/tenant/pages/tenant/org/projects/components/changeRequests/index.js
  - features/tenant/pages/tenant/org/projects/components/deliverables/DeliverableCardSkeleton.js

### features/tenant/pages/tenant/org/projects/ProjectTasks.js (9 dependencies)
  - features/tenant/pages/tenant/org/projects/services/tenantProjectApiService.js
  - features/tenant/pages/tenant/org/projects/constants/projectConstants.js
  - features/tenant/pages/tenant/org/projects/components/CreateTaskModal.js
  - features/tenant/pages/tenant/org/projects/components/QuickAddTask.js
  - features/tenant/pages/tenant/org/projects/utils/toastNotifications.js
  - features/tenant/components/ProjectWorkspaceLayout.js
  - features/tenant/pages/tenant/org/projects/utils/validation.js
  - shared/components/feedback/LoadingSpinner.js
  - shared/components/feedback/EmptyState.js

### middleware/auth/erpAccessControl.js (9 dependencies)
  - models/users-auth/User.js
  - models/tenant/TenantDepartmentAccess.js
  - models/org/Workspace.js
  - models/project-delivery/Project.js
  - models/hr-payroll/Employee.js
  - services/tenant/permissionCache.service.js
  - services/tenant/permissionResolver.service.js
  - models/org/Organization.js
  - models/tenant/TenantAuditLog.js

### modules/admin/routes/supra-admin/index.js (9 dependencies)
  - modules/admin/routes/supra-admin/shared.js
  - modules/admin/routes/supra-admin/dashboard.js
  - modules/admin/routes/supra-admin/tenants.js
  - modules/admin/routes/supra-admin/users.js
  - modules/admin/routes/supra-admin/billing.js
  - modules/admin/routes/supra-admin/departments.js
  - modules/admin/routes/supra-admin/access.js
  - modules/admin/routes/supra-admin/masterErp.js
  - modules/admin/routes/supra-admin/system.js

### modules/business/routes/cards.js (9 dependencies)
  - models/industry/Card.js
  - models/project-delivery/List.js
  - models/project-delivery/Board.js
  - models/project-delivery/Project.js
  - models/project-delivery/ProjectMember.js
  - models/analytics/Activity.js
  - models/notifications/Notification.js
  - models/finance/Finance.js
  - middleware/auth/verifyERPToken.js

### modules/business/routes/nucleusAnalytics.js (9 dependencies)
  - middleware/auth/verifyERPToken.js
  - middleware/auth/workspaceIsolation.js
  - middleware/common/errorHandler.js
  - utils/nucleusHelpers.js
  - models/project-delivery/Project.js
  - models/project-delivery/Deliverable.js
  - models/core/Approval.js
  - models/project-delivery/ChangeRequest.js
  - models/project-delivery/Task.js

### modules/business/routes/nucleusBatch.js (9 dependencies)
  - middleware/auth/verifyERPToken.js
  - middleware/auth/workspaceIsolation.js
  - middleware/common/errorHandler.js
  - models/project-delivery/Deliverable.js
  - models/project-delivery/Task.js
  - models/core/Approval.js
  - services/nucleusAutoCalculationService.js
  - validators/nucleusValidators.js
  - utils/nucleusHelpers.js

### modules/tenant/routes/approvals.js (9 dependencies)
  - models/core/Approval.js
  - models/project-delivery/Milestone.js
  - models/project-delivery/Deliverable.js
  - models/users-auth/User.js
  - models/project-delivery/Project.js
  - models/project-delivery/ProjectMember.js
  - middleware/common/errorHandler.js
  - services/notifications/notification.service.js
  - utils/orgIdHelper.js

### modules/tenant/routes/dashboard.js (9 dependencies)
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/org/Department.js
  - models/users-auth/User.js
  - models/project-delivery/Project.js
  - models/project-delivery/Task.js
  - services/tenant/tenant-data.service.js
  - middleware/auth/verifyERPToken.js
  - middleware/auth/erpAccessControl.js

### services/tenant/platform-admin-access.service.js (9 dependencies)
  - services/compliance/audit.service.js
  - models/notifications/Notification.js
  - models/tenant/Tenant.js
  - models/users-auth/User.js
  - services/integrations/email.service.js
  - models/admin-platform/PlatformAdminApproval.js
  - models/admin-platform/PlatformAdminApproval.js
  - models/admin-platform/PlatformAdminApproval.js
  - models/admin-platform/PlatformAdminApproval.js

### features/projects/pages/Projects.js (8 dependencies)
  - app/providers/AuthContext.js
  - features/projects/components/ProjectPortal/ProjectCard.js
  - features/projects/components/ProjectPortal/CreateProjectModal.js
  - features/projects/components/ConfirmDialog.js
  - features/projects/components/ErrorBoundary.js
  - features/projects/services/projectApiService.js
  - features/projects/utils/errorHandler.js
  - features/projects/constants/projectConstants.js

### features/tenant/guards/TenantOrgGuards.jsx (8 dependencies)
  - app/providers/TenantAuthContext.js
  - shared/hooks/useTenantSlug.js
  - features/tenant/contexts/TenantPermissionsContext.js
  - features/tenant/pages/tenant/org/dashboard/AppHome.jsx
  - features/tenant/pages/tenant/org/settings/OrgProfile.js
  - features/tenant/components/ClientPortal/ClientOrganizationProfile.js
  - features/tenant/pages/tenant/org/settings/SettingsOverview.js
  - shared/pages/PageNotFound.js

### features/tenant/pages/tenant/org/projects/ChangeRequestDetailPage.js (8 dependencies)
  - features/tenant/pages/tenant/org/projects/services/tenantProjectApiService.js
  - features/tenant/pages/tenant/org/projects/utils/errorHandler.js
  - features/tenant/pages/tenant/org/projects/utils/toastNotifications.js
  - app/providers/TenantAuthContext.js
  - features/tenant/contexts/TenantPermissionsContext.js
  - features/tenant/pages/tenant/org/projects/components/changeRequests/ChangeRequestAuditTrail.js
  - features/tenant/pages/tenant/org/projects/components/changeRequests/ChangeRequestEvaluationForm.js
  - features/tenant/pages/tenant/org/projects/components/deliverables/DeliverableCardSkeleton.js

### features/tenant/pages/tenant/org/projects/ProjectsOverview.js (8 dependencies)
  - features/tenant/pages/tenant/org/projects/services/tenantProjectApiService.js
  - shared/services/tenant/tenant-api.service.js
  - features/tenant/pages/tenant/org/projects/constants/projectConstants.js
  - features/tenant/pages/tenant/org/projects/components/CreateProjectModal.js
  - features/tenant/pages/tenant/org/projects/components/ErrorBoundary.js
  - shared/components/feedback/LoadingSpinner.js
  - shared/components/feedback/ErrorState.js
  - shared/components/feedback/EmptyState.js

### middleware/auth/auth.js (8 dependencies)
  - services/auth/jwt.service.js
  - services/auth/token-blacklist.service.js
  - models/users-auth/User.js
  - models/admin-platform/TWSAdmin.js
  - services/compliance/audit.service.js
  - middleware/security/cookieSecurity.js
  - models/core/AuditLog.js
  - config/environment-validator.js

### middleware/auth/verifyERPToken.secure.js (8 dependencies)
  - services/auth/jwt.service.js
  - services/auth/token-blacklist.service.js
  - models/tenant/Tenant.js
  - models/org/Organization.js
  - models/users-auth/User.js
  - models/org/Workspace.js
  - services/compliance/audit.service.js
  - config/environment-validator.js

