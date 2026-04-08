# Plan Structure Support Analysis

**Date:** February 24, 2026  
**Question:** Does the system support the proposed 4-tier plan (Starter / Growth / Professional / Enterprise), and what adjustments are needed?

**Implementation status (final):** Storage is **2 GB / 5 GB / 10 GB / Custom** for Starter / Growth / Professional / Enterprise. Billing and plan enforcement apply to **Software House ERP only**; other categories show plan N/A. Schema (slug, workspaces, clientAccounts, feature flags, getUsageLimit, calculateOverageCost), seed (trial + four tiers), usageTrackerService, featureGate, and enforcement on create/restore and document upload are implemented. Supra Admin billing filters by `erpCategory === 'software_house'`.

---

## Short answer

**Yes, the system can support this plan**, but it needs **schema, naming, and enforcement adjustments**. The codebase already has multi-tenant subscriptions, plan models, feature flags, and limit concepts; they are not fully aligned with your tier names, limits (workspaces, client accounts), or feature locks, and **quota enforcement is incomplete**.

---

## 1. What the system already has

| Area | Current state |
|------|----------------|
| **Tenant subscription** | `Tenant.subscription.plan`: `trial` \| `basic` \| `professional` \| `enterprise` \| `custom` |
| **Tenant limits** | `Tenant.features`: `maxUsers`, `maxProjects`, `maxStorage` (GB); booleans: `apiAccess`, `customBranding`, `prioritySupport`, `advancedAnalytics`, `whiteLabel` |
| **SubscriptionPlan model** | Platform-level plans with `limits` (users, projects, storage in bytes, apiCalls, integrations, customFields, automation) and `features` (apiAccess, whiteLabeling, sso, auditLogs, prioritySupport, dedicatedSupport, etc.) |
| **Workspace subscription** | Per-workspace: `subscription.plan`: `free` \| `starter` \| `professional` \| `enterprise`; `maxMembers`, `maxBoards`, `maxProjects`, `maxStorage` (MB) |
| **Feature gating** | `featureGate.js`: `checkFeatureAccess(featureName)`, `checkUsageLimit(metric)` — looks up plan by `slug` and calls `subscriptionPlan.hasFeature()` / usage limits |
| **Pricing service** | `pricingService.js`: feature gates and usage checks (expects `plan.features.maxUsers` etc.; references `getCurrentUsage(tenantId, metric)`) |
| **Usage tracking** | `usageTrackerService.js`: only in-memory activity tracking; **no `getCurrentUsage(tenantId, metric)`** and no DB-backed counts for users/projects/storage/workspaces/clients |
| **SRS (FR1)** | Documents: *“Resource quotas by subscription — Gap: Quotas are not enforced on create/list operations for tenant-scoped APIs.”* |

So: **data structures and concepts exist; plan names, limits, and enforcement do not fully match your plan.**

---

## 2. Plan naming alignment

| Your tier | Tenant.subscription.plan (current) | SubscriptionPlan / Workspace |
|-----------|------------------------------------|-------------------------------|
| **STARTER** | Map to `starter` or keep `basic` | Workspace already has `starter` |
| **GROWTH** | **Missing** — only basic/professional/enterprise | Add `growth` |
| **PROFESSIONAL** | ✅ `professional` | ✅ |
| **ENTERPRISE** | ✅ `enterprise` | ✅ |

**Adjustments:**

- Add **`growth`** to `Tenant.subscription.plan` enum (and use it for the $75 tier).
- Standardise naming: either use **starter / growth / professional / enterprise** everywhere for these four tiers, or keep `basic` and treat “Starter” as display name for `basic` (then Growth can be a distinct plan name/type).

---

## 3. Limits: what’s missing vs your plan

Your plan defines:

- **Users** (10 / 30 / 75 / Unlimited)  
- **Workspaces** (3 / 10 / Unlimited / Unlimited)  
- **Storage** (2 GB / 5 GB / 10 GB / Custom — final)  
- **Projects** (20 active / Unlimited / Unlimited / Unlimited)  
- **Client accounts** (10 / 30 / Unlimited / Unlimited)  
- **Support** (Email 48hr / Email+Chat 24hr / Priority 4hr / Dedicated)

**In the system:**

| Limit | SubscriptionPlan | Tenant | Enforced? |
|-------|------------------|--------|-----------|
| **Users** | ✅ `limits.users` (max, unlimited) | ✅ `features.maxUsers` | ❌ Not on tenant user create/invite |
| **Workspaces** | ❌ Not present | ❌ Not present | ❌ No |
| **Storage** | ✅ `limits.storage` (bytes) | ✅ `features.maxStorage` (GB) | ❌ Not on upload/create |
| **Projects** | ✅ `limits.projects` | ✅ `features.maxProjects`; Workspace has `subscription.maxProjects` | ❌ Not on project create |
| **Client accounts** | ❌ Not present | ❌ Not present | ❌ No |
| **Support** | ✅ `support.level`, `support.responseTime`, `support.channels` | — | Informational only |

**Adjustments:**

1. **Workspaces**  
   - Add **`limits.workspaces`** (e.g. `max`, `unlimited`) to SubscriptionPlan.  
   - Add **`features.maxWorkspaces`** (or equivalent) to Tenant when you sync plan to tenant.  
   - Enforce when creating a new workspace (tenant-level count of workspaces).

2. **Client accounts**  
   - Add **`limits.clientAccounts`** (or `clients`) to SubscriptionPlan.  
   - Add **`features.maxClientAccounts`** (or `maxClients`) to Tenant.  
   - Enforce when creating a Client (count `Client` by orgId/tenantId).

3. **“Active projects”**  
   - You specify “20 Active Projects” for Starter. Define “active” (e.g. status not in `archived` / `cancelled`).  
   - Enforce project create/restore so that active count ≤ plan limit (tenant-level or workspace-level, depending on your product).

4. **Storage**  
   - SubscriptionPlan uses **bytes**; Tenant uses **GB**. Either store one and derive the other, or standardise (e.g. GB in config, convert to bytes where needed).  
   - Implement storage usage (e.g. from File/Document uploads) and enforce before upload.

5. **Support**  
   - Map your tiers to `support.level` and `support.responseTime` (e.g. 48, 24, 4 hours) and `support.channels` (email, chat).  
   - No code change needed for “support” beyond storing and displaying it (unless you gate chat support by plan).

---

## 4. Feature flags: “locked” vs “included”

Your plan locks/unlocks:

- Payroll  
- API  
- Custom roles  
- Reports  
- HR Advanced  
- White-label  
- Dedicated support  
- etc.

**In the system:**

- **API:** `features.apiAccess` exists (SubscriptionPlan, Tenant).
- **White-label:** `features.whiteLabeling` / `whiteLabel` exist.
- **Dedicated support:** `features.dedicatedSupport` exists.
- **Custom roles:** No explicit “custom roles” flag; roles are in TenantUser / TenantRole. You need a **feature flag** (e.g. `customRoles`) and gate creation/editing of custom roles.
- **Payroll:** No plan-level flag. Add e.g. `payrollBasic` (Growth) and `payrollFull` (Professional) and gate payroll routes by plan.
- **Reports:** Add e.g. `reportsBasic` (Starter) and `reportsAdvanced` (Growth+) and gate report types or export.
- **HR Advanced:** Add e.g. `hrAdvanced` (hiring, docs, contracts) and gate those modules.

**Adjustments:**

- Add feature flags for: **payroll** (or payrollBasic / payrollFull), **customRoles**, **reports** (or reportsBasic / reportsAdvanced), **hrAdvanced**.
- Wire these into `SubscriptionPlan.features` and Tenant (when you copy plan to tenant).
- Use **featureGate** (`checkFeatureAccess`) on: payroll routes, custom role CRUD, report/export endpoints, HR advanced routes.

---

## 5. Enforcement gaps (critical)

- **featureGate** looks up plan with **`SubscriptionPlan.findOne({ slug: tenant.subscription.plan })`**, but **SubscriptionPlan has no `slug` field** (only `name`). So either:
  - Add **`slug`** to SubscriptionPlan and set e.g. `starter`, `growth`, `professional`, `enterprise`, or  
  - Change lookup to **`name`** or another field that matches `tenant.subscription.plan`.

- **usageTrackerService** does **not** implement **`getCurrentUsage(tenantId, metric)`**. Both featureGate and pricingService call it. So:
  - Implement **`getCurrentUsage(tenantId, metric)`** (and optionally `tenantId` + `orgId` if you scope by org) for: `users`, `projects`, `workspaces`, `storage`, `clientAccounts`.  
  - Derive counts from DB: TenantUser, Project, Workspace, Client, and storage (e.g. sum of file sizes).

- **SubscriptionPlan** has **`getRemainingLimit(resourceType, currentUsage)`** and **`isLimitExceeded(resourceType, currentUsage)`** but **no `getUsageLimit(metric)`**. featureGate and scheduler call **`subscriptionPlan.getUsageLimit(metric)`**. So:
  - Add **`getUsageLimit(metric)`** that returns `limits[metric].max` or `-1` when unlimited.

- **Tenant routes** (create user, project, workspace, client, upload) do **not** consistently call **checkUsageLimit** or **checkFeatureAccess**. So:
  - Apply **checkUsageLimit** before: creating user, project, workspace, client; and before upload (storage).  
  - Apply **checkFeatureAccess** on payroll, custom roles, reports, HR advanced, API access.

---

## 6. Pricing and support (your numbers)

- **Starter:** $25/mo, $250/yr  
- **Growth:** $75/mo, $750/yr  
- **Professional:** $175/mo, $1,750/yr  
- **Enterprise:** Custom  

SubscriptionPlan already has **`pricing.monthly`**, **`pricing.yearly`**, **`pricing.currency`**. Use these for the four tiers; Enterprise can have 0 or null and “Custom” in UI.  
Support is already in SubscriptionPlan (**support.level**, **support.responseTime**, **support.channels**). Set 48/24/4 and “dedicated” per tier.

No structural change needed; only seed/update plans with your prices and support text.

---

## 7. Suggested adjustments summary

| # | Adjustment | Priority |
|---|------------|----------|
| 1 | Add plan tier **`growth`** and align names (starter / growth / professional / enterprise) across Tenant and SubscriptionPlan. | High |
| 2 | Add **workspaces** and **clientAccounts** limits to SubscriptionPlan and Tenant; enforce on create. | High |
| 3 | Define “active projects” and enforce project limit (active count) on create/restore. | High |
| 4 | Add **getUsageLimit(metric)** on SubscriptionPlan; implement **getCurrentUsage(tenantId, metric)** in usageTrackerService (DB-backed). | High |
| 5 | Fix plan lookup: add **slug** to SubscriptionPlan (or use **name**) so featureGate finds the plan. | High |
| 6 | Add feature flags: **payroll** (or basic/full), **customRoles**, **reports**, **hrAdvanced**; gate corresponding routes. | High |
| 7 | Apply **checkUsageLimit** and **checkFeatureAccess** on tenant-scoped create routes (user, project, workspace, client, storage). | High |
| 8 | Standardise storage (GB vs bytes) and implement storage usage + enforcement. | Medium |
| 9 | Seed/update SubscriptionPlan (and Tenant defaults) with your four tiers, limits, prices, and support. | Medium |
| 10 | Optional: per-workspace limits (Workspace already has them); ensure tenant-level workspace count and workspace-level project count are consistent with your plan. | Medium |

---

## 8. Plan structure mapping (concrete)

You can map your tiers like this in the system:

| Your plan | Plan id/slug | Users | Workspaces | Storage | Projects (active) | Clients | Support |
|-----------|----------------|-------|------------|---------|-------------------|---------|---------|
| STARTER   | `starter`      | 10    | 3          | 15 GB   | 20                | 10      | email, 48hr |
| GROWTH    | `growth`       | 30    | 10         | 50 GB   | Unlimited         | 30      | email+chat, 24hr |
| PROFESSIONAL | `professional` | 75 | Unlimited | 200 GB  | Unlimited         | Unlimited | priority, 4hr |
| ENTERPRISE | `enterprise`  | Unlimited | Unlimited | Custom | Unlimited         | Unlimited | dedicated |

Then set **features** per tier (e.g. Starter: no payroll, no API, no custom roles, basic reports only, no HR Advanced; Growth: payroll basic, no API, custom roles, financial reports, HR module; etc.) and enforce them via the same feature and limit checks above.

---

## 9. Conclusion

- The system **can** support your 4-tier plan **after** the adjustments above.
- Main gaps: **plan naming (growth)**, **workspace and client limits**, **“active” project definition**, **usage and limit enforcement** (getCurrentUsage, getUsageLimit, and applying middleware on create routes), and **feature flags for payroll, custom roles, reports, HR Advanced**.
- Implementing the high-priority items (1–7) will align the product with your plan structure and make the tiers and locks enforceable in code.

If you want, next step can be: (a) a concrete schema patch (SubscriptionPlan + Tenant) for limits/features, or (b) a short implementation checklist (files and middlewares to touch) for enforcement.
