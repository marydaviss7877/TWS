# Comprehensive Service Reorganization Script
# Moves and renames all services to organized folders with consistent naming

$ErrorActionPreference = "Stop"
$servicesPath = $PSScriptRoot

Write-Host "Starting comprehensive service reorganization..." -ForegroundColor Green

# Helper function to convert camelCase to kebab-case
function ConvertTo-KebabCase {
    param([string]$input)
    $result = $input -creplace '([a-z])([A-Z])', '$1-$2'
    $result = $result.ToLower()
    return $result
}

# Helper function to get service name
function Get-ServiceName {
    param([string]$fileName)
    $name = $fileName -replace '\.js$', ''
    $name = $name -replace 'Service$', ''
    $name = $name -replace 'Handler$', '-handler'
    $name = $name -replace 'Integration$', '-integration'
    $kebab = ConvertTo-KebabCase $name
    return "$kebab.service.js"
}

# Define service mappings
$serviceMappings = @{
    # Auth Services
    "jwtService.js" = @{folder="auth"; name="jwt.service.js"}
    "tokenBlacklistService.js" = @{folder="auth"; name="token-blacklist.service.js"}
    
    # Tenant Services
    "tenantService.js" = @{folder="tenant"; name="tenant.service.js"}
    "tenantLifecycleService.js" = @{folder="tenant"; name="tenant-lifecycle.service.js"}
    "tenantSwitchingService.js" = @{folder="tenant"; name="tenant-switching.service.js"}
    "tenantDataService.js" = @{folder="tenant"; name="tenant-data.service.js"}
    "tenantOrgService.js" = @{folder="tenant"; name="tenant-org.service.js"}
    "tenantConnectionPool.js" = @{folder="tenant"; name="tenant-connection-pool.service.js"}
    "tenantModelService.js" = @{folder="tenant"; name="tenant-model.service.js"}
    "selfServeSignupService.js" = @{folder="tenant"; name="self-serve-signup.service.js"}
    "platformAdminAccessService.js" = @{folder="tenant"; name="platform-admin-access.service.js"}
    
    
    # Education Services
    "gradeCalculationService.js" = @{folder="legacy"; name="grade-calculation.service.js"}
    
    # Integration Services
    "calendarIntegration.js" = @{folder="integrations"; name="calendar-integration.service.js"}
    "calendarService.js" = @{folder="integrations"; name="calendar.service.js"}
    "emailService.js" = @{folder="integrations"; name="email.service.js"}
    "emailValidationService.js" = @{folder="integrations"; name="email-validation.service.js"}
    "emailVerificationService.js" = @{folder="integrations"; name="email-verification.service.js"}
    "integrationService.js" = @{folder="integrations"; name="integration.service.js"}
    "paymentService.js" = @{folder="integrations"; name="payment.service.js"}
    "platformIntegration.js" = @{folder="integrations"; name="platform-integration.service.js"}
    "portalERPIntegrationService.js" = @{folder="integrations"; name="portal-erp-integration.service.js"}
    "projectIntegrationService.js" = @{folder="integrations"; name="project-integration.service.js"}
    "slackService.js" = @{folder="integrations"; name="slack.service.js"}
    "SlackIntegration.js" = @{folder="integrations"; name="slack-integration.service.js"}
    "webrtcService.js" = @{folder="integrations"; name="webrtc.service.js"}
    "timezoneService.js" = @{folder="integrations"; name="timezone.service.js"}
    
    # Analytics Services
    "analyticsService.js" = @{folder="analytics"; name="analytics.service.js"}
    "dataWarehouseService.js" = @{folder="analytics"; name="data-warehouse.service.js"}
    "departmentDashboardService.js" = @{folder="analytics"; name="department-dashboard.service.js"}
    "meetingAnalyticsService.js" = @{folder="analytics"; name="meeting-analytics.service.js"}
    "metricsService.js" = @{folder="analytics"; name="metrics.service.js"}
    "aiInsightsService.js" = @{folder="analytics"; name="ai-insights.service.js"}
    
    # Notification Services
    "notificationService.js" = @{folder="notifications"; name="notification.service.js"}
    "notificationBatchingService.js" = @{folder="notifications"; name="notification-batching.service.js"}
    "messagingNotificationService.js" = @{folder="notifications"; name="messaging-notification.service.js"}
    "meetingReminderService.js" = @{folder="notifications"; name="meeting-reminder.service.js"}
    "pushNotificationService.js" = @{folder="notifications"; name="push-notification.service.js"}
    
    # Compliance Services
    "auditService.js" = @{folder="compliance"; name="audit.service.js"}
    "auditLogService.js" = @{folder="compliance"; name="audit-log.service.js"}
    "complianceService.js" = @{folder="compliance"; name="compliance.service.js"}
    "retentionService.js" = @{folder="compliance"; name="retention.service.js"}
}

$movedCount = 0
$skippedCount = 0

foreach ($mapping in $serviceMappings.GetEnumerator()) {
    $sourceFile = $mapping.Key
    $targetFolder = $mapping.Value.folder
    $newName = $mapping.Value.name
    $sourcePath = Join-Path $servicesPath $sourceFile
    $targetDir = Join-Path $servicesPath $targetFolder
    $targetPath = Join-Path $targetDir $newName
    
    if (Test-Path $sourcePath) {
        # Create target directory if it doesn't exist
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            Write-Host "Created directory: $targetFolder" -ForegroundColor Yellow
        }
        
        # Move file
        Move-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "Moved: $sourceFile -> $targetFolder/$newName" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "Skipped: $sourceFile (not found)" -ForegroundColor Gray
        $skippedCount++
    }
}

Write-Host "`nReorganization complete!" -ForegroundColor Green
Write-Host "Moved: $movedCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount files" -ForegroundColor Yellow
