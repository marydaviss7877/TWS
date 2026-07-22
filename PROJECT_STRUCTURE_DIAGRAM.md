# TWS Project Structure Flow Diagram

This diagram shows the structure and relationships between frontend and backend files.

## Mermaid Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend"]
        direction TB
        subgraph FE_pages["Pages"]
            FE_pages_features_admin_pages_PartnerManagement_js["PartnerManagement"]
            FE_pages_features_admin_pages_RoleManagement_js["RoleManagement"]
            FE_pages_features_admin_pages_SupraAdmin_SupraAdmin_js["SupraAdmin"]
            FE_pages_features_admin_pages_SupraAdmin_Users_js["Users"]
            FE_pages_features_admin_pages_SupraAdmin_analytics_Analytics_js["Analytics"]
            FE_pages_features_admin_pages_SupraAdmin_analytics_SessionAnalytics_js["SessionAnalytics"]
            FE_pages_features_admin_pages_SupraAdmin_billing_BillingManagement_js["BillingManagement"]
            FE_pages_features_admin_pages_SupraAdmin_dashboard_Dashboard_js["Dashboard"]
            FE_pages_features_admin_pages_SupraAdmin_dashboard_SupraAdminDashboard_js["SupraAdminDashboard"]
            FE_pages_features_admin_pages_SupraAdmin_departments_DepartmentAccess_js["DepartmentAccess"]
            FE_pages_features_admin_pages_SupraAdmin_departments_DepartmentManagement_js["DepartmentManagement"]
            FE_pages_features_admin_pages_SupraAdmin_departments_Departments_js["Departments"]
            FE_pages_features_admin_pages_SupraAdmin_erp_ERPManagement_js["ERPManagement"]
            FE_pages_features_admin_pages_SupraAdmin_infrastructure_Infrastructure_js["Infrastructure"]
            FE_pages_features_admin_pages_SupraAdmin_monitoring_SystemHealth_js["SystemHealth"]
            FE_pages_features_admin_pages_SupraAdmin_sessions_SessionManagement_js["SessionManagement"]
            FE_pages_features_admin_pages_SupraAdmin_settings_Settings_js["Settings"]
            FE_pages_features_admin_pages_SupraAdmin_tenants_TenantManagement_js["TenantManagement"]
            FE_pages_features_admin_pages_SupraAdmin_tenants_TenantUsers_js["TenantUsers"]
            FE_pages_features_admin_pages_SupraAdmin_users_Users_js["Users"]
        end
        subgraph FE_components["Components"]
            FE_components_components_AdminPageTemplate_AdminPageTemplate_jsx["AdminPageTemplate"]
            FE_components_components_AdminPageTemplate_index_js["index"]
            FE_components_components_ConfirmDialog_ConfirmDialog_jsx["ConfirmDialog"]
            FE_components_components_ConfirmDialog_index_js["index"]
            FE_components_components_finance_RoleBasedAccessInfo_js["RoleBasedAccessInfo"]
            FE_components_components_ui_Avatar_Avatar_jsx["Avatar"]
            FE_components_components_ui_Avatar_index_js["index"]
            FE_components_components_ui_Badge_Badge_jsx["Badge"]
            FE_components_components_ui_Badge_index_js["index"]
            FE_components_components_ui_Button_Button_jsx["Button"]
            FE_components_components_ui_Button_index_js["index"]
            FE_components_components_ui_Command_Command_jsx["Command"]
            FE_components_components_ui_Command_index_js["index"]
            FE_components_components_ui_Dialog_Dialog_jsx["Dialog"]
            FE_components_components_ui_Dialog_index_js["index"]
            FE_components_components_ui_DropdownMenu_DropdownMenu_jsx["DropdownMenu"]
            FE_components_components_ui_DropdownMenu_index_js["index"]
            FE_components_components_ui_Input_Input_jsx["Input"]
            FE_components_components_ui_Input_index_js["index"]
            FE_components_components_ui_ScrollArea_ScrollArea_jsx["ScrollArea"]
        end
        subgraph FE_services["Services"]
            FE_services_features_projects_services_listApiService_js["listApiService"]
            FE_services_features_projects_services_projectApiService_js["projectApiService"]
            FE_services_shared_services_analytics_ai_insights_service_js["ai-insights.service"]
            FE_services_shared_services_analytics_analytics_service_js["analytics.service"]
            FE_services_shared_services_auth_token_refresh_service_js["token-refresh.service"]
            FE_services_shared_services_business_billing_service_js["billing.service"]
            FE_services_shared_services_business_form_management_service_js["form-management.service"]
            FE_services_shared_services_business_resource_service_js["resource.service"]
            FE_services_shared_services_business_task_service_js["task.service"]
            FE_services_shared_services_business_usage_tracking_service_js["usage-tracking.service"]
            FE_services_shared_services_index_js["index"]
            FE_services_shared_services_industry_config_apiConfig_js["apiConfig"]
            FE_services_shared_services_industry_index_js["index"]
            FE_services_shared_services_industry_softwareHouseApi_js["softwareHouseApi"]
            FE_services_shared_services_industry_utils_apiClientFactory_js["apiClientFactory"]
            FE_services_shared_services_industry_utils_tokenUtils_js["tokenUtils"]
            FE_services_shared_services_tenant_tenant_api_service_js["tenant-api.service"]
        end
        subgraph FE_utils["Utils"]
            FE_utils_features_projects_utils_dateUtils_js["dateUtils"]
            FE_utils_features_projects_utils_errorHandler_js["errorHandler"]
            FE_utils_features_projects_utils_validation_js["validation"]
            FE_utils_features_tenant_utils_industryMenuBuilder_js["industryMenuBuilder"]
            FE_utils_features_tenant_utils_themeConfig_js["themeConfig"]
            FE_utils_features_tenant_utils_useThemeStyles_js["useThemeStyles"]
            FE_utils_features_tenant_utils_useToken_js["useToken"]
            FE_utils_lib_utils_js["utils"]
            FE_utils_shared_utils_apiClient_js["apiClient"]
            FE_utils_shared_utils_auth_js["auth"]
            FE_utils_shared_utils_axiosInstance_js["axiosInstance"]
            FE_utils_shared_utils_debugExternalScripts_js["debugExternalScripts"]
            FE_utils_shared_utils_errorHandler_js["errorHandler"]
            FE_utils_shared_utils_logger_js["logger"]
            FE_utils_shared_utils_setupMockAuth_js["setupMockAuth"]
            FE_utils_shared_utils_statusUtils_js["statusUtils"]
            FE_utils_shared_utils_subdomain_js["subdomain"]
            FE_utils_shared_utils_tenantRoutes_js["tenantRoutes"]
            FE_utils_shared_utils_websocket_js["websocket"]
        end
        subgraph FE_layouts["Layouts"]
            FE_layouts_layouts_SupraAdminLayout_js["SupraAdminLayout"]
        end
        subgraph FE_providers["Providers"]
            FE_providers_app_providers_AuthContext_js["AuthContext"]
            FE_providers_app_providers_SocketContext_js["SocketContext"]
            FE_providers_app_providers_TenantAuthContext_js["TenantAuthContext"]
            FE_providers_app_providers_TenantContext_js["TenantContext"]
            FE_providers_app_providers_ThemeContext_js["ThemeContext"]
            FE_providers_features_tenant_providers_TenantThemeProvider_js["TenantThemeProvider"]
        end
        subgraph FE_hooks["Hooks"]
            FE_hooks_features_tenant_hooks___tests___useMenuFiltering_test_js["useMenuFiltering.test"]
            FE_hooks_features_tenant_hooks_useAppNavigation_js["useAppNavigation"]
            FE_hooks_features_tenant_hooks_useMenuFiltering_js["useMenuFiltering"]
            FE_hooks_features_tenant_hooks_useTenantTheme_js["useTenantTheme"]
            FE_hooks_hooks_useFullscreen_js["useFullscreen"]
            FE_hooks_hooks_useKeyboardShortcuts_js["useKeyboardShortcuts"]
            FE_hooks_shared_hooks_useKeyboardShortcuts_js["useKeyboardShortcuts"]
            FE_hooks_shared_hooks_useResponsive_js["useResponsive"]
            FE_hooks_shared_hooks_useRoleBasedUI_js["useRoleBasedUI"]
            FE_hooks_shared_hooks_useSocket_js["useSocket"]
            FE_hooks_shared_hooks_useTenantSlug_js["useTenantSlug"]
        end
        subgraph FE_config["Config"]
            FE_config_app_config_api_js["api"]
            FE_config_app_config_firebase_js["firebase"]
        end
    end
    
    subgraph Backend["Backend"]
        direction TB
        subgraph BE_routes["Routes"]
            BE_routes_modules_admin_routes_admin_js["admin"]
            BE_routes_modules_admin_routes_attendancePanel_js["attendancePanel"]
            BE_routes_modules_admin_routes_index_js["index"]
            BE_routes_modules_admin_routes_moderation_js["moderation"]
            BE_routes_modules_admin_routes_supra_admin_access_js["access"]
            BE_routes_modules_admin_routes_supra_admin_billing_js["billing"]
            BE_routes_modules_admin_routes_supra_admin_dashboard_js["dashboard"]
            BE_routes_modules_admin_routes_supra_admin_departments_js["departments"]
            BE_routes_modules_admin_routes_supra_admin_index_js["index"]
            BE_routes_modules_admin_routes_supra_admin_masterErp_js["masterErp"]
            BE_routes_modules_admin_routes_supra_admin_shared_js["shared"]
            BE_routes_modules_admin_routes_supra_admin_system_js["system"]
            BE_routes_modules_admin_routes_supra_admin_tenants_js["tenants"]
            BE_routes_modules_admin_routes_supra_admin_users_js["users"]
            BE_routes_modules_admin_routes_supraReports_js["supraReports"]
            BE_routes_modules_admin_routes_supraSessions_js["supraSessions"]
            BE_routes_modules_admin_routes_supraTenantERP_js["supraTenantERP"]
            BE_routes_modules_auth_routes_authentication_js["authentication"]
            BE_routes_modules_auth_routes_index_js["index"]
            BE_routes_modules_auth_routes_sessions_js["sessions"]
        end
        subgraph BE_controllers["Controllers"]
            BE_controllers_controllers_tenant_projectsController_js["projectsController"]
            BE_controllers_controllers_tenantController_js["tenantController"]
        end
        subgraph BE_models["Models"]
            BE_models_models_admin_platform_OnboardingChecklist_js["OnboardingChecklist"]
            BE_models_models_admin_platform_PlatformAdminApproval_js["PlatformAdminApproval"]
            BE_models_models_admin_platform_SoftwareHouseRole_js["SoftwareHouseRole"]
            BE_models_models_admin_platform_SupraAdmin_js["SupraAdmin"]
            BE_models_models_admin_platform_TWSAdmin_js["TWSAdmin"]
            BE_models_models_analytics_Activity_js["Activity"]
            BE_models_models_analytics_Analytics_js["Analytics"]
            BE_models_models_analytics_ClientHealth_js["ClientHealth"]
            BE_models_models_analytics_ClientTouchpoint_js["ClientTouchpoint"]
            BE_models_models_analytics_CodeQuality_js["CodeQuality"]
            BE_models_models_analytics_DevelopmentMetrics_js["DevelopmentMetrics"]
            BE_models_models_core_Approval_js["Approval"]
            BE_models_models_core_AuditLog_js["AuditLog"]
            BE_models_models_core_Permission_js["Permission"]
            BE_models_models_core_Resource_js["Resource"]
            BE_models_models_core_Role_js["Role"]
            BE_models_models_core_Session_js["Session"]
            BE_models_models_core_TenantAwareModel_js["TenantAwareModel"]
            BE_models_models_documents_DocumentFolder_js["DocumentFolder"]
            BE_models_models_documents_DocumentShare_js["DocumentShare"]
        end
        subgraph BE_services["Services"]
            BE_services_services_MonitoringWebSocketService_js["MonitoringWebSocketService"]
            BE_services_services_StandaloneMonitoringService_js["StandaloneMonitoringService"]
            BE_services_services_SystemMonitoringService_js["SystemMonitoringService"]
            BE_services_services_aiPayrollService_js["aiPayrollService"]
            BE_services_services_analytics_ai_insights_service_js["ai-insights.service"]
            BE_services_services_analytics_analytics_service_js["analytics.service"]
            BE_services_services_analytics_data_warehouse_service_js["data-warehouse.service"]
            BE_services_services_analytics_department_dashboard_service_js["department-dashboard.service"]
            BE_services_services_analytics_metrics_service_js["metrics.service"]
            BE_services_services_attendanceIntegrationService_js["attendanceIntegrationService"]
            BE_services_services_attendanceService_js["attendanceService"]
            BE_services_services_attendanceSocketService_js["attendanceSocketService"]
            BE_services_services_auth_jwt_service_js["jwt.service"]
            BE_services_services_auth_token_blacklist_service_js["token-blacklist.service"]
            BE_services_services_billingService_js["billingService"]
            BE_services_services_biometricService_js["biometricService"]
            BE_services_services_business_timeAggregation_service_js["timeAggregation.service"]
            BE_services_services_cachingService_js["cachingService"]
            BE_services_services_clientHealthService_js["clientHealthService"]
            BE_services_services_compliance_audit_log_service_js["audit-log.service"]
        end
        subgraph BE_middleware["Middleware"]
            BE_middleware_middleware_audit_auditLog_js["auditLog"]
            BE_middleware_middleware_audit_auditLogger_js["auditLogger"]
            BE_middleware_middleware_audit_metricsMiddleware_js["metricsMiddleware"]
            BE_middleware_middleware_audit_observability_js["observability"]
            BE_middleware_middleware_auth_auth_js["auth"]
            BE_middleware_middleware_auth_erpAccessControl_js["erpAccessControl"]
            BE_middleware_middleware_auth_permissions_js["permissions"]
            BE_middleware_middleware_auth_platformAdminAccessMiddleware_js["platformAdminAccessMiddleware"]
            BE_middleware_middleware_auth_platformRBAC_js["platformRBAC"]
            BE_middleware_middleware_auth_portalAuth_js["portalAuth"]
            BE_middleware_middleware_auth_projectManagementPermissions_js["projectManagementPermissions"]
            BE_middleware_middleware_auth_rbac_js["rbac"]
            BE_middleware_middleware_auth_requirePlatformAdminAccessReason_js["requirePlatformAdminAccessReason"]
            BE_middleware_middleware_auth_unifiedPermissionMiddleware_js["unifiedPermissionMiddleware"]
            BE_middleware_middleware_auth_unifiedSoftwareHouseAuth_js["unifiedSoftwareHouseAuth"]
            BE_middleware_middleware_auth_unifiedTenantAuth_js["unifiedTenantAuth"]
            BE_middleware_middleware_auth_verifyERPToken_js["verifyERPToken"]
            BE_middleware_middleware_auth_verifyERPToken_secure_js["verifyERPToken.secure"]
            BE_middleware_middleware_auth_workspaceIsolation_js["workspaceIsolation"]
            BE_middleware_middleware_common_cache_js["cache"]
        end
        subgraph BE_utils["Utils"]
            BE_utils_utils_complianceTesting_js["complianceTesting"]
            BE_utils_utils_errorHandler_js["errorHandler"]
            BE_utils_utils_logger_js["logger"]
            BE_utils_utils_modelSchemaHelper_js["modelSchemaHelper"]
            BE_utils_utils_nucleusHelpers_js["nucleusHelpers"]
            BE_utils_utils_orgIdHelper_js["orgIdHelper"]
            BE_utils_utils_pagination_js["pagination"]
            BE_utils_utils_projectDepartmentView_js["projectDepartmentView"]
            BE_utils_utils_tenantModelHelper_js["tenantModelHelper"]
        end
        subgraph BE_config["Config"]
            BE_config_config_authTokenStrategy_js["authTokenStrategy"]
            BE_config_config_billingConfig_js["billingConfig"]
            BE_config_config_ecosystem_config_js["ecosystem.config"]
            BE_config_config_environment_validator_js["environment-validator"]
            BE_config_config_environment_js["environment"]
            BE_config_config_firebase_admin_js["firebase-admin"]
            BE_config_config_logging_js["logging"]
            BE_config_config_permissions_js["permissions"]
            BE_config_config_projectManagementPermissions_js["projectManagementPermissions"]
            BE_config_config_redis_js["redis"]
            BE_config_config_s3_js["s3"]
            BE_config_config_security_js["security"]
            BE_config_config_swagger_js["swagger"]
            BE_config_migrations_005_project_department_configs_js["005-project-department-configs"]
        end
        subgraph BE_modules["Modules"]
            BE_modules_modules_auth___tests___critical_workflow_access_integration_test_js["critical-workflow-access.integration.test"]
            BE_modules_modules_auth___tests___login_nosql_injection_security_test_js["login.nosql-injection.security.test"]
            BE_modules_modules_auth___tests___role_aware_workflows_integration_test_js["role-aware-workflows.integration.test"]
            BE_modules_modules_auth___tests___route_level_critical_workflows_integration_test_js["route-level-critical-workflows.integration.test"]
            BE_modules_modules_business_erp_software_house_index_js["index"]
            BE_modules_modules_business_erp_software_house_nucleusPM_js["nucleusPM"]
            BE_modules_modules_index_js["index"]
            BE_modules_modules_tenant___tests___settings_general_route_access_integration_test_js["settings-general-route-access.integration.test"]
            BE_modules_modules_tenant_erp_software_house_index_js["index"]
            BE_modules_modules_tenant_erp_software_house_softwareHouse_js["softwareHouse"]
        end
    end
    
    %% Key Relationships
    Frontend -->|API Calls| Backend
    FE_other_App_jsx -.->|uses| FE_providers_app_providers_AuthContext_js
    FE_other_App_jsx -.->|uses| FE_providers_app_providers_ThemeContext_js
    FE_other_App_jsx -.->|uses| FE_providers_app_providers_SocketContext_js
    FE_other_App_jsx -.->|uses| FE_utils_shared_utils_errorHandler_js
    FE_other_App_jsx -.->|uses| FE_utils_shared_utils_tenantRoutes_js
    FE_other_App_jsx -.->|uses| FE_utils_shared_utils_subdomain_js
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_SupraAdminLogin_SupraAdminLogin_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_SoftwareHouseSignup_SoftwareHouseSignup_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_SoftwareHouseLogin_SoftwareHouseLogin_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_SoftwareHouseForgotPassword_SoftwareHouseForgotPassword_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_SoftwareHouseLanding_SoftwareHouseLanding_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_InviteAccept_InviteAccept_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_FinanceSystemPage_FinanceSystemPage_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_HRMSystemPage_HRMSystemPage_jsx
    FE_other_App_jsx -.->|uses| FE_pages_pages_Auth_ProjectSystemPage_ProjectSystemPage_jsx
    FE_other_App_jsx -.->|uses| FE_components_shared_components_feedback_LoadingSpinner_js
    FE_other_App_jsx -.->|uses| FE_pages_shared_pages_PageNotFound_js
    FE_other_App_jsx -.->|uses| FE_components_shared_components_monitoring_BackendHealthCheck_js
    FE_other_App_jsx -.->|uses| FE_components_shared_components_monitoring_MonitoringSystemStatus_js
    FE_other_App_jsx -.->|uses| FE_components_shared_components_feedback_AccessDenied_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_TenantDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_TenantOrg_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_SupraAdmin_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_dashboard_SupraAdminDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_tenants_TenantManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_billing_BillingManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_analytics_Analytics_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_users_Users_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_sessions_SessionManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_departments_DepartmentAccess_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_departments_Departments_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_analytics_SessionAnalytics_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_monitoring_SystemHealth_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_infrastructure_Infrastructure_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_settings_Settings_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_departments_DepartmentManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_admin_pages_SupraAdmin_erp_ERPManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_dashboard_DashboardAnalytics_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_dashboard_DynamicDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_my_work_MyWork_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_analytics_AnalyticsOverview_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_users_UserList_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_users_UserProfile_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_users_UserCreate_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HROverview_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_EmployeeList_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_EmployeeCreate_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_EmployeeDetail_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_hr_EmployeeCreate_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_PayrollManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_AttendanceManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HRLeaveRequests_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HRPerformance_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HRRecruitment_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HROnboarding_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_hr_HRTraining_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ClientPortal_ClientSettings_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ClientPortal_ClientOrganizationProfile_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ClientPortal_ClientDashboard_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ClientPortal_ClientProjectsView_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ClientPortal_ClientTimesheetsView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_EmployeeProfileView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_EmployeeAttendanceView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_EmployeeLeaveRequests_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_EmployeePerformanceView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_EmployeePayrollView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_software_house_employee_portal_ContractorDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_FinanceOverview_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_AccountsPayable_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_AccountsReceivable_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_ChartOfAccounts_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_BillingEngine_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_ProjectCosting_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_CashFlow_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_TimeExpenses_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_Reporting_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_finance_FinanceBudgeting_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectsOverview_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectsList_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectTasks_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectMilestones_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectResources_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectTimesheets_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_SprintManagement_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectGantt_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectGanttStandalone_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectBoardView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectCalendarView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectTimelineView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectActivityView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectWorkloadView_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ProjectTableView_js
    FE_other_App_jsx -.->|uses| FE_components_features_tenant_components_ProjectWorkspaceLayout_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_components_changeRequests_ChangeRequestDashboard_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ChangeRequestDetailPage_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_DeliverablesPage_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_DeliverableDetail_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_ApprovalsQueuePage_js
    FE_other_App_jsx -.->|uses| FE_pages_features_tenant_pages_tenant_org_projects_NucleusAnalyticsPage_js

    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1

```

## How to View

1. Copy the mermaid code above
2. Paste it into [Mermaid Live Editor](https://mermaid.live)
3. Or use a Markdown viewer that supports Mermaid (like GitHub, GitLab, or VS Code with Mermaid extension)

## File Categories

### Frontend
- **Pages**: Main page components
- **Components**: Reusable UI components
- **Services**: API service layers
- **Utils**: Utility functions
- **Layouts**: Layout components
- **Providers**: Context providers
- **Hooks**: Custom React hooks
- **Config**: Configuration files

### Backend
- **Routes**: API route definitions
- **Controllers**: Request handlers
- **Models**: Database models
- **Services**: Business logic services
- **Middleware**: Express middleware
- **Utils**: Utility functions
- **Config**: Configuration files
- **Modules**: Feature modules

## Notes

- The diagram shows key relationships between files
- Due to the large number of files, only representative samples are shown
- Solid arrows indicate direct dependencies
- Dotted arrows indicate usage relationships
