# Fix incorrectly renamed files
$ErrorActionPreference = "Stop"

# Finance folder fixes
$financeFixes = @{
    "a-cc-ou-nt-sp-ay-ab-le-se-rv-ic-e.j-s" = "accounts-payable.service.js"
    "a-cc-ou-nt-sr-ec-ei-va-bl-es-er-vi-ce.j-s" = "accounts-receivable.service.js"
    "b-an-ki-ng-se-rv-ic-e.j-s" = "banking.service.js"
    "b-il-li-ng-en-gi-ne-se-rv-ic-e.j-s" = "billing-engine.service.js"
    "c-as-hf-lo-ws-er-vi-ce.j-s" = "cash-flow.service.js"
    "c-ha-rt-of-ac-co-un-ts-se-rv-ic-e.j-s" = "chart-of-accounts.service.js"
    "p-ro-je-ct-co-st-in-gs-er-vi-ce.j-s" = "project-costing.service.js"
}

$hrFixes = @{
    "a-tt-en-da-nc-es-er-vi-ce.j-s" = "attendance.service.js"
    "e-mp-lo-ye-es-er-vi-ce.j-s" = "employee.service.js"
    "p-ay-ro-ll-se-rv-ic-e.j-s" = "payroll.service.js"
    "r-ec-ru-it-me-nt-se-rv-ic-e.j-s" = "recruitment.service.js"
}

$softwareHouseFixes = @{
    "c-od-eq-ua-li-ty-se-rv-ic-e.j-s" = "code-quality.service.js"
    "t-im-et-ra-ck-in-gs-er-vi-ce.j-s" = "time-tracking.service.js"
}

$integrationsFixes = @{
    "b-an-ki-ng-se-rv-ic-e.j-s" = "banking-integration.service.js"
    "c-al-en-da-r-i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "calendar-integration.service.js"
    "c-al-en-da-r.s-er-vi-ce.j-s" = "calendar.service.js"
    "e-ma-il-v-al-id-at-io-n.s-er-vi-ce.j-s" = "email-validation.service.js"
    "e-ma-il-v-er-if-ic-at-io-n.s-er-vi-ce.j-s" = "email-verification.service.js"
    "e-ma-il.s-er-vi-ce.j-s" = "email.service.js"
    "i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "integration.service.js"
    "p-ay-me-nt.s-er-vi-ce.j-s" = "payment.service.js"
    "p-la-tf-or-m-i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "platform-integration.service.js"
    "p-or-ta-l-e-rp-i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "portal-erp-integration.service.js"
    "p-ro-je-ct-i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "project-integration.service.js"
    "s-la-ck-i-nt-eg-ra-ti-on.s-er-vi-ce.j-s" = "slack-integration.service.js"
    "s-la-ck.s-er-vi-ce.j-s" = "slack.service.js"
    "t-im-ez-on-e.s-er-vi-ce.j-s" = "timezone.service.js"
    "w-eb-rt-c.s-er-vi-ce.j-s" = "webrtc.service.js"
}

$servicesPath = $PSScriptRoot

# Fix finance
foreach ($fix in $financeFixes.GetEnumerator()) {
    $oldPath = Join-Path "$servicesPath\finance" $fix.Key
    $newPath = Join-Path "$servicesPath\finance" $fix.Value
    if (Test-Path $oldPath) {
        Rename-Item $oldPath $fix.Value -Force
        Write-Host "Fixed finance: $($fix.Key) -> $($fix.Value)" -ForegroundColor Green
    }
}

# Fix hr
foreach ($fix in $hrFixes.GetEnumerator()) {
    $oldPath = Join-Path "$servicesPath\hr" $fix.Key
    $newPath = Join-Path "$servicesPath\hr" $fix.Value
    if (Test-Path $oldPath) {
        Rename-Item $oldPath $fix.Value -Force
        Write-Host "Fixed hr: $($fix.Key) -> $($fix.Value)" -ForegroundColor Green
    }
}

# Fix softwareHouse
foreach ($fix in $softwareHouseFixes.GetEnumerator()) {
    $oldPath = Join-Path "$servicesPath\softwareHouse" $fix.Key
    $newPath = Join-Path "$servicesPath\softwareHouse" $fix.Value
    if (Test-Path $oldPath) {
        Rename-Item $oldPath $fix.Value -Force
        Write-Host "Fixed softwareHouse: $($fix.Key) -> $($fix.Value)" -ForegroundColor Green
    }
}

# Fix integrations
foreach ($fix in $integrationsFixes.GetEnumerator()) {
    $oldPath = Join-Path "$servicesPath\integrations" $fix.Key
    $newPath = Join-Path "$servicesPath\integrations" $fix.Value
    if (Test-Path $oldPath) {
        Rename-Item $oldPath $fix.Value -Force
        Write-Host "Fixed integrations: $($fix.Key) -> $($fix.Value)" -ForegroundColor Green
    }
}

Write-Host "`nAll fixes complete!" -ForegroundColor Green
