# Portal Routing Audit — Findings & Fixes Applied

Generated: 2026-07-22 · Updated: 2026-07-22 (fixes applied)
Scope: `TWS/frontend/src` routing chain (triggered by reported "portal page routing issues")

**Status: all 3 decisions from the original audit were approved and applied.** See §3 for what changed.

---

## 1. What I did

1. Re-validated `PROJECT_STRUCTURE_INDEX.json` against the actual filesystem.
2. Traced the live routing chain: `index.js` → `App.jsx` → `TenantOrg.js` → `TenantOrgGuards.jsx`.
3. Checked every import in both `App.js` and `App.jsx` for broken paths.
4. Checked the routing files for injected/malicious code (eval, obfuscation, unexpected external domains). **None found — nothing "phishy."**
5. Regenerated `PROJECT_STRUCTURE_INDEX.json` (and `PROJECT_STRUCTURE_INDEX.md` / `PROJECT_STRUCTURE_DIAGRAM.md`) via the project's own `analyze-project-structure.js`, so the index now matches the real filesystem.

**Index regeneration result:** 558 file paths that no longer exist were removed, 515 new file paths were added. The old index was stale across roughly two-thirds of the frontend — it was generated before the last 6 commits of routing/subdomain restructuring and had no knowledge of the current file layout at all.

---

## 2. Root causes found (ranked by likely impact on "routing issues")

### 2a. `App.js` and `App.jsx` both exist — `App.js` is 100% dead code
- `TWS/frontend/src/App.js` (238 lines) and `TWS/frontend/src/App.jsx` (563 lines) sit side by side.
- `index.js` imports `./App.jsx` explicitly. `App.js` is not referenced anywhere in the repo (verified with a full-repo grep).
- `App.js` is an **older, simpler** routing scheme (delegates the whole tenant portal to a wildcard `/:tenantSlug/org/*`). `App.jsx` is the **current, live** scheme (explicit nested routes for client-portal, employee self-service, HR, finance, projects, etc.).
- It's the only `.js`/`.jsx` name collision anywhere in `frontend/src` — an isolated incident, not a systemic pattern.
- **Risk:** any past or future edit made to `App.js` — believing it controls routing — silently does nothing. If a "fix" for a portal route was ever made in this file, that's why it never took effect.

### 2b. Real bug: inconsistent redirect paths in `TenantOrgGuards.jsx`
The app's own sanctioned URL helper, `getTenantWorkspaceUrl` (`shared/utils/subdomain.js:37-40`), documents the contract explicitly:
```
prod root domain  → 'https://acme.tws.enterprises/home'
prod on subdomain → '/home'            (clean path)
dev (localhost)   → '/acme/org/home'   (legacy path, dev only)
```
Most guards in `TenantOrgGuards.jsx` respect this by using **relative** navigation (`Navigate to="../client-portal"`), which resolves correctly under both the subdomain layout and the root-domain layout. But five guards hardcode the legacy **absolute** `/:tenantSlug/org/...` path instead:

| Guard | Line | Current code | Problem |
|---|---|---|---|
| `ClientAccessGate` | 39 | `Navigate to={`/${tenantSlug}/org/client-portal`}` | Legacy absolute path |
| `HROnlyRoute` | 83 | `Navigate to={`/${tenantSlug}/org/home`}` | Legacy absolute path |
| `OrganizationProfileAccessRoute` | 109 | `Navigate to={`/${tenantSlug}/org/home`}` | Legacy absolute path |
| `AdminOnlySettingsRoute` | 132 | `Navigate to={`/${tenantSlug}/org/home`}` | Legacy absolute path |
| `AuditAccessRoute` | 149 | `Navigate to={`/${tenantSlug}/org/home`}` | Legacy absolute path |

**Effect on production (subdomain deployment, e.g. `acme.tws.enterprises`):** hitting one of these guards triggers `Navigate` to e.g. `/acme/org/client-portal`. That's not a route that exists in that form on a subdomain — it gets caught by the fallback `SubdomainOldPathRedirect` (`App.jsx:361`), which strips the prefix and re-navigates to `/client-portal`. The end state is correct, but the user gets **two navigations instead of one**: a visible URL flash of the old-style path, an extra re-render/remount, and a brief flicker — exactly the kind of thing that reads as "the portal has routing issues."

This does **not** affect the root-domain deployment (where `/:tenantSlug/org/...` is the correct form anyway) — only subdomain traffic, which per `CLAUDE.md` is how real tenants access the product.

### 2c. Stale index (now fixed)
Already covered in §1 — no separate action needed beyond what's already been regenerated. See §4 for how to stop it going stale again.

### 2d. Nothing malicious found
Explicitly checked `App.js`, `App.jsx`, `TenantOrgGuards.jsx`, `TenantOrg.js`, `subdomain.js`, `tenantRoutes.js` for `eval`, `new Function`, `innerHTML` assignment, `dangerouslySetInnerHTML`, base64/`atob` payloads, and unexpected external domains. Clean. This is a structural/consistency bug, not a compromise.

---

## 3. Fixes applied

**Fix 1 — Deleted the dead `App.js`.**
Confirmed zero references anywhere in the repo (full grep, excluding `App.jsx`) before deleting. `TWS/frontend/src/App.js` is gone. The only live entry point is `App.jsx`, imported by `index.js`.

**Fix 2 — Corrected the 5 hardcoded redirects in `TenantOrgGuards.jsx`.**
These are not a uniform find-replace — `ClientAccessGate` sits in a structurally different position in the route tree than the other four, so it needed a different fix:

| Guard | Old | New | Why |
|---|---|---|---|
| `ClientAccessGate` | `` Navigate to={`/${tenantSlug}/org/client-portal`} `` | `Navigate to="client-portal"` (no `../`) | Renders inside the org Route's own element, above the `<Outlet/>` — its route context *is* the org base already. A leading `../` would try to go a level above the org route itself. |
| `HROnlyRoute` | `` Navigate to={`/${tenantSlug}/org/home`} `` | `Navigate to="../home"` | Is itself the `element` of its own `<Route>` (one JSX-Route hop), same pattern already proven correct by `EmployeeOnlyRoute`/`SettingsRoute` elsewhere in this file. |
| `OrganizationProfileAccessRoute` | same | `Navigate to="../home"` | Same reasoning as above. |
| `AdminOnlySettingsRoute` | same | `Navigate to="../home"` | Same reasoning — used at 4 different settings sub-paths, all one hop regardless of URL depth. |
| `AuditAccessRoute` | same | `Navigate to="../home"` | Same reasoning. |

Also removed the now-unused `const tenantSlug = useTenantSlug();` from the four guards that no longer build a manual path string. `ClientAccessGate` still uses it (for legacy-path stripping) so its import stays.

This removes the double-redirect flicker on production subdomain traffic (`acme.tws.enterprises`) described in the original audit — these guards now resolve directly to the correct path in one hop, in both subdomain and dev/root-domain modes.

**Fix 3 — Index can no longer go stale silently.**
Added a `generatedAt` ISO timestamp to the JSON `summary` block in `analyze-project-structure.js`, and regenerated. `PROJECT_STRUCTURE_INDEX.json` now carries `"generatedAt"` so anyone can tell at a glance how old it is without cross-referencing git history.

**Note on file counts:** while this work was in progress, unrelated concurrent cleanup happened in the IDE (3 dead SupraAdmin monitoring files removed: `SystemMonitoring.js`, `RealTimeMonitoring.js`, `RealTimeSystemMonitoring.js`, plus small edits to `SessionAnalytics.js`, `SystemHealth.js`, `TenantManagement.js`, `SupraAdminLayout.js`). Reviewed those diffs — ordinary dead-code removal, nothing suspicious. The final index regeneration was run after that cleanup, so it reflects the current true state (880 files: 460 frontend + 420 backend).

## 4. Remaining open question — not fixed, needs your input

Everything above was low-risk and mechanical. One thing is worth a decision but wasn't touched: whether to wire `node analyze-project-structure.js` into a pre-commit hook or CI step so the index is regenerated automatically instead of relying on someone remembering to run it. Say the word if you want that set up.
