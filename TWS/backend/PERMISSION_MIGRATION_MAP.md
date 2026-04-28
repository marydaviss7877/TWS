# Permission Migration Map

## Canonical Patterns

- Tenant/business routes: `verifyERPToken` + `requireErpAccess({ module, action, checkRevocation: true })`
- Platform/admin routes: `authenticateToken` + `requirePlatformPermission` / `requirePlatformRole`
- Legacy fallback (to phase out module-by-module): `authenticateToken` + `requireRole(...)`

## Pattern Inventory (Current)

- Legacy auth/role checks are heavily used in business route files and auth routes.
- UPR/ERP checks are already in payroll, finance, attendance, teams, and employee modules.
- Frontend still has hardcoded role arrays in routing and feature guards.

## Migration Order (Low Risk)

1. Keep platform routes unchanged (already canonical for platform namespace).
2. Migrate one business module at a time from `requireRole` to `requireErpAccess`.
3. Preserve existing role behavior first; only tighten where FE currently overexposes access compared to BE.
4. After backend module migration, align frontend guards to permission-aware checks for that module.

## Module Priority

1. `payroll`
2. `finance`
3. `projects`
4. `workspaces`
5. Remaining business modules

## Guardrails

- No new permission system introduction.
- No global auth rewrite PR.
- One module per PR with regression tests before moving to next module.
