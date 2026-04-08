# Billing System Implementation Audit

**Date:** February 2026  
**Scope:** Backend, Frontend (Supra Admin + Tenant), Landing Page

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| **Backend – Supra Admin** | Partially complete | Overview, create/update/list invoices ✅. Missing: DELETE invoice, record payment, send email. |
| **Backend – Tenant-facing** | Partial | GET /api/billing/usage ✅. Missing: plans list, plan by slug, upgrade, downgrade, tenant invoices. |
| **Frontend – Supra Admin** | Partially complete | BillingManagement uses real APIs for overview + invoices; some actions (delete, record payment, send email) have no backend. |
| **Frontend – Tenant** | Gaps | BillingDashboard component exists but is **not mounted** in tenant routes. billing.service.js calls many APIs that do not exist. |
| **Landing page** | Incomplete | Nav links to **#pricing** but **no pricing section** (id="pricing") exists; trial copy says "14-day" vs product "7-day". |

---

## 1. Backend

### 1.1 Supra Admin Billing (`/api/supra-admin/billing/*`)

**Implemented:**

- **GET /api/supra-admin/billing/overview**  
  Returns summary (revenue, invoice counts), monthlyTrend, planDistribution (Software House only), billingEligibleCount, totalTenantCount, topCustomers. Implemented in `billingService.getBillingOverview()` and `supra-admin/billing.js`.

- **POST /api/supra-admin/billing/invoices**  
  Create invoice from form (tenantId, total, description, dueDate, invoiceNumber). Implemented in `billingService.createInvoiceFromForm()`.

- **PUT /api/supra-admin/billing/invoices/:id**  
  Update invoice (paymentStatus, paymentDate). Sets tenant `subscription.paymentFailedAt` when status = failed, clears it and readOnlyMode when status = paid.

- **GET /api/supra-admin/billing/invoices**  
  List invoices with pagination, optional status/tenantId filter.

**Not implemented:**

- **DELETE /api/supra-admin/billing/invoices/:id** – Frontend calls it; backend has no route. UI catches error and removes from local state.
- **POST /api/supra-admin/billing/invoices/:id/payments** – Record payment against invoice. Frontend calls it; no backend route. Frontend falls back to local update.
- **POST /api/supra-admin/billing/invoices/:id/send-email** – Send invoice email. Frontend calls it; no backend route. Frontend simulates success.
- **GET /api/supra-admin/billing/invoices/:id** – Single invoice detail (frontend may use list item; not verified).
- **GET /api/supra-admin/billing/invoices/:id/download** – PDF download. Frontend billing.service has `downloadInvoice`; no backend route under supra-admin.

### 1.2 Tenant-Facing Billing (`/api/billing/*`)

**Implemented:**

- **GET /api/billing/usage**  
  Returns usage, limits, plan, atRisk, atRiskMetrics, readOnlyMode, features, billingEligible. Resolves tenant from `req.user.orgId` → Organization.tenantId. Implemented in `modules/business/routes/billing.js`.

**Not implemented:**

- **GET /api/billing/plans** – Frontend `billingService.getPlans()` calls it. No route in backend.
- **GET /api/billing/plans/:slug** – Frontend `billingService.getPlan(slug)` calls it. No route.
- **POST /api/billing/upgrade** – Frontend `billingService.upgradePlan()` calls it. No route.
- **POST /api/billing/downgrade** – Frontend `billingService.downgradePlan()` calls it. No route.
- **GET /api/billing/invoices** – Tenant’s own invoices (if any). Frontend BillingDashboard uses it; no tenant-scoped route (Supra Admin invoices are under /api/supra-admin/billing/invoices).
- **GET /api/billing/usage/:metric** – Optional; not implemented.
- **POST /api/billing/cancel** – Not implemented.
- **GET /api/billing/history** – Not implemented.
- **GET/POST/PUT/DELETE /api/billing/payment-methods** – Not implemented (payment collection is out of scope; listed here for completeness).

---

## 2. Frontend

### 2.1 Supra Admin – Billing Management

**File:** `features/admin/pages/SupraAdmin/billing/BillingManagement.js`

- **Overview:** Fetches `/api/supra-admin/billing/overview`. Displays summary, plan distribution, top customers, charts. **Works** (backend exists).
- **Invoices list:** Fetches `/api/supra-admin/billing/invoices`. Create and update invoice use correct Supra Admin endpoints. **Works** for list, create, update.
- **Delete invoices:** Calls `DELETE /api/supra-admin/billing/invoices/:id`. **Fails** (no backend); UI removes from list locally.
- **Record payment:** Calls `POST .../invoices/:id/payments`. **Fails** (no backend); UI updates locally.
- **Send email:** Calls `POST .../invoices/:id/send-email`. **Fails** (no backend); UI shows “queued” message.

**Conclusion:** Supra Admin billing is usable for overview and invoice CRUD; delete/payment/email are not backed by API.

### 2.2 Tenant – Subscription / Usage UI

**Files:**

- **BillingDashboard.jsx** (`shared/components/ui/BillingDashboard.jsx`)  
  Uses `billingService.getUsage()`, `getPlans()`, `getInvoices()`, `upgradePlan()`, `downgradePlan()`, `downloadInvoice()`. Only **getUsage()** has a backend; the rest 404 or fail.

- **Usage:**  
  **BillingDashboard is not mounted in any tenant route.** TenantOrg has `finance/billing-engine` (BillingEngine – project invoicing) and `clients/billing` (ClientBilling), but no route for the shared **BillingDashboard** (subscription/usage/plans). So tenant users have no in-app screen for “Subscription & Usage” unless it is added to the tenant app and menu.

- **usage-tracking.service.js**  
  Calls `billingService.getUsage()` for usage data and atRisk; that part is backed by GET /api/billing/usage.

**Conclusion:** Tenant-facing subscription/usage dashboard exists as a component but is not reachable in the app, and most of its API calls have no backend.

### 2.3 Tenant – billing.service.js

**File:** `shared/services/business/billing.service.js`

- **getUsage()** → GET /api/billing/usage ✅  
- **getUsageByMetric()** → GET /api/billing/usage/:metric ❌  
- **getPlans()** → GET /api/billing/plans ❌  
- **getPlan(slug)** → GET /api/billing/plans/:slug ❌  
- **upgradePlan()** → POST /api/billing/upgrade ❌  
- **downgradePlan()** → POST /api/billing/downgrade ❌  
- **getInvoices()** → GET /api/billing/invoices ❌ (and tenant invoices are not the same as Supra Admin list)  
- **getInvoice(id)** → GET /api/billing/invoices/:id ❌  
- **cancelSubscription()** → POST /api/billing/cancel ❌  
- **downloadInvoice()** → GET /api/billing/invoices/:id/download ❌  
- **getBillingHistory()**, **getPaymentMethods()**, **addPaymentMethod()**, etc. ❌  

So aside from **getUsage()**, the tenant billing service is not implemented on the backend.

---

## 3. Landing Page

### 3.1 Main landing (`LandingPage.js`)

- Simple hero with “Get Started” and “Sign In”. No billing or pricing content.

### 3.2 Software House landing (`SoftwareHouseLanding.js`)

- **Nav:** Links to `#features`, `#modules`, **`#pricing`**.
- **Sections present:** Hero, Stats, Features (#features), Modules (#modules), Why Choose, CTA, Footer.
- **Section missing:** There is **no** `id="pricing"` section. The “Pricing” link has no target; scroll-to-pricing does nothing.
- **Trial copy:** Hero says “14-day free trial”; SRS/plan says **7-day** trial for Software House. Inconsistent.

**Conclusion:** Landing has no pricing section; trial wording does not match product (7-day).

---

## 4. Recommendations

### 4.1 Backend

1. **Tenant billing API** (if product requires tenant plan/upgrade UI):  
   Add under `modules/business/routes/billing.js`:  
   - GET `/plans` – list active SubscriptionPlans (e.g. trial, starter, growth, professional, enterprise).  
   - GET `/plans/:slug` – plan details by slug.  
   - POST `/upgrade` – set tenant subscription plan (and optionally effective date); restrict to Software House and valid plan slug.  
   - POST `/downgrade` – same, with effective date (e.g. end of period).  
   Optionally: GET `/invoices` for the current tenant’s invoices (filter Billing by tenantId from org).

2. **Supra Admin billing (optional):**  
   - DELETE `/api/supra-admin/billing/invoices/:id` – soft-delete or cancel invoice.  
   - POST `/api/supra-admin/billing/invoices/:id/payments` – append payment to invoice and optionally mark paid.  
   - POST `/api/supra-admin/billing/invoices/:id/send-email` – enqueue or send invoice email (if email service exists).

### 4.2 Frontend

1. **Tenant subscription/usage page:**  
   - Add a route in the tenant app (e.g. `/:tenantSlug/org/settings/subscription` or `/:tenantSlug/org/billing`) that renders **BillingDashboard**.  
   - Add a menu entry (e.g. “Subscription” or “Billing & usage”) so tenants can open it.

2. **BillingDashboard / billing.service:**  
   - Either implement the backend for getPlans, getPlan, upgrade, downgrade, (and optionally tenant invoices) and keep current UI, or  
   - Simplify BillingDashboard to only show usage (from getUsage()) and remove or hide plans/upgrade/downgrade/invoices until backend exists.

### 4.3 Landing Page

1. **Pricing section:**  
   - Add a section with `id="pricing"` to SoftwareHouseLanding.  
   - Content: e.g. Trial (7 days), Starter, Growth, Professional, Enterprise with short limits (e.g. 2/5/10/Custom GB, users, projects) and “Contact for Enterprise” or “Custom” where applicable.

2. **Trial copy:**  
   - Change “14-day free trial” to “7-day free trial” (or align product to 14 days and update SRS/backend) so landing and product match.

---

## 5. Summary Table

| Feature | Backend | Frontend | Landing |
|--------|---------|----------|---------|
| Supra Admin billing overview | ✅ | ✅ | N/A |
| Supra Admin create/update/list invoices | ✅ | ✅ | N/A |
| Supra Admin delete invoice | ❌ | Calls API, no route | N/A |
| Supra Admin record payment | ❌ | Calls API, no route | N/A |
| Supra Admin send invoice email | ❌ | Calls API, no route | N/A |
| Tenant usage (GET /api/billing/usage) | ✅ | ✅ (usage-tracking, BillingDashboard) | N/A |
| Tenant plans list/detail | ❌ | billing.service + BillingDashboard | N/A |
| Tenant upgrade/downgrade | ❌ | billing.service + BillingDashboard | N/A |
| Tenant subscription/usage page | N/A | Component exists, **not mounted** | N/A |
| Pricing section | N/A | N/A | ❌ Missing (#pricing) |
| Trial copy (7 vs 14 days) | N/A | N/A | ⚠️ Says 14-day |

**Overall:** Billing is **not** fully implemented end-to-end. Supra Admin overview and invoice CRUD work; tenant usage works; plans/upgrade/downgrade and tenant subscription UI are missing or not wired; landing has no pricing and wrong trial copy.
