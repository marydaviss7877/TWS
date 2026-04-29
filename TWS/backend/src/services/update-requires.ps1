# Update all require() statements to use new service paths
$ErrorActionPreference = "Stop"

$backendPath = Join-Path $PSScriptRoot "..\.."
$servicesPath = Join-Path $backendPath "src\services"

# Mapping of old paths to new paths
$pathMappings = @{
    # Core services
    "require\('./cacheService'\)" = "require('./core/cache.service')"
    "require\('\.\.\/services\/cacheService'\)" = "require('../../services/core/cache.service')"
    "require\('\.\.\/\.\.\/services\/cacheService'\)" = "require('../../../services/core/cache.service')"
    "require\('\.\.\/\.\.\/\.\.\/services\/cacheService'\)" = "require('../../../../services/core/cache.service')"
    
    "require\('./connectionPoolService'\)" = "require('./core/connection-pool.service')"
    "require\('\.\.\/services\/connectionPoolService'\)" = "require('../../services/core/connection-pool.service')"
    
    "require\('./databaseProvisioningService'\)" = "require('./core/database-provisioning.service')"
    "require\('./encryptionService'\)" = "require('./core/encryption.service')"
    "require\('./e2eEncryptionService'\)" = "require('./core/e2e-encryption.service')"
    "require\('./redisService'\)" = "require('./core/redis.service')"
    "require\('./socketHandler'\)" = "require('./core/socket-handler.service')"
    "require\('./loggerService'\)" = "require('./core/logger.service')"
    
    # Auth services
    "require\('./jwtService'\)" = "require('./auth/jwt.service')"
    "require\('\.\.\/services\/jwtService'\)" = "require('../../services/auth/jwt.service')"
    "require\('\.\.\/\.\.\/services\/jwtService'\)" = "require('../../../services/auth/jwt.service')"
    
    "require\('./tokenBlacklistService'\)" = "require('./auth/token-blacklist.service')"
    "require\('\.\.\/services\/tokenBlacklistService'\)" = "require('../../services/auth/token-blacklist.service')"
    "require\('\.\.\/\.\.\/services\/tokenBlacklistService'\)" = "require('../../../services/auth/token-blacklist.service')"
    
    # Tenant services
    "require\('./tenantService'\)" = "require('./tenant/tenant.service')"
    "require\('\.\.\/services\/tenantService'\)" = "require('../../services/tenant/tenant.service')"
    "require\('\.\.\/\.\.\/services\/tenantService'\)" = "require('../../../services/tenant/tenant.service')"
    
    "require\('./tenantLifecycleService'\)" = "require('./tenant/tenant-lifecycle.service')"
    "require\('./tenantSwitchingService'\)" = "require('./tenant/tenant-switching.service')"
    "require\('./tenantDataService'\)" = "require('./tenant/tenant-data.service')"
    "require\('./tenantOrgService'\)" = "require('./tenant/tenant-org.service')"
    "require\('./tenantConnectionPool'\)" = "require('./tenant/tenant-connection-pool.service')"
    "require\('./tenantModelService'\)" = "require('./tenant/tenant-model.service')"
    "require\('./selfServeSignupService'\)" = "require('./tenant/self-serve-signup.service')"
    "require\('./platformAdminAccessService'\)" = "require('./tenant/platform-admin-access.service')"
    "require\('\.\.\/\.\.\/services\/platformAdminAccessService'\)" = "require('../../../services/tenant/platform-admin-access.service')"
    
    # Integration services
    "require\('./emailService'\)" = "require('./integrations/email.service')"
    "require\('\.\.\/services\/emailService'\)" = "require('../../services/integrations/email.service')"
    "require\('\.\.\/\.\.\/services\/emailService'\)" = "require('../../../services/integrations/email.service')"
    
    "require\('./paymentService'\)" = "require('./integrations/payment.service')"
    "require\('\.\.\/services\/paymentService'\)" = "require('../../services/integrations/payment.service')"
    
    "require\('./integrationService'\)" = "require('./integrations/integration.service')"
    "require\('./webhookService'\)" = "require('./integrations/webhook.service')"
    
    # Analytics services
    "require\('./analyticsService'\)" = "require('./analytics/analytics.service')"
    "require\('\.\.\/services\/analyticsService'\)" = "require('../../services/analytics/analytics.service')"
    "require\('\.\.\/\.\.\/services\/analyticsService'\)" = "require('../../../services/analytics/analytics.service')"
    
    "require\('./aiInsightsService'\)" = "require('./analytics/ai-insights.service')"
    
    # Notification services
    "require\('./notificationService'\)" = "require('./notifications/notification.service')"
    "require\('\.\.\/services\/notificationService'\)" = "require('../../services/notifications/notification.service')"
    
    # Compliance services
    "require\('./auditService'\)" = "require('./compliance/audit.service')"
    "require\('\.\.\/services\/auditService'\)" = "require('../../services/compliance/audit.service')"
    "require\('\.\.\/\.\.\/services\/auditService'\)" = "require('../../../services/compliance/audit.service')"
    
    "require\('./auditLogService'\)" = "require('./compliance/audit-log.service')"
    "require\('./complianceService'\)" = "require('./compliance/compliance.service')"
    
}

# Get all JavaScript files in backend/src
$jsFiles = Get-ChildItem -Path $backendPath -Filter "*.js" -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and
    $_.FullName -notmatch "\.git" -and
    $_.FullName -notmatch "services\\index\.js"  # Skip the index file we're updating separately
}

$updatedCount = 0
$fileCount = 0

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileUpdated = $false
    
    foreach ($mapping in $pathMappings.GetEnumerator()) {
        if ($content -match $mapping.Key) {
            $content = $content -replace $mapping.Key, $mapping.Value
            $fileUpdated = $true
        }
    }
    
    if ($fileUpdated) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName.Replace($backendPath, ''))" -ForegroundColor Green
        $updatedCount++
    }
    
    $fileCount++
}

Write-Host "`nUpdate complete!" -ForegroundColor Green
Write-Host "Files scanned: $fileCount" -ForegroundColor Cyan
Write-Host "Files updated: $updatedCount" -ForegroundColor Green
