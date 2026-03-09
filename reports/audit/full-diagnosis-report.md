# InsightDISC Full Diagnosis Report

Generated on: 2026-03-08

## Scope
Audit performed across:
- Frontend routing and guard stack (`App.jsx`, `ProtectedRoute`, `SuperAdminRoute`, `route-policy`)
- Backend authorization and RBAC (`requireAuth`, `rbac`, `report/auth routes`)
- Report and PDF generation flows
- Admin/super-admin access paths
- Guest access and session/logout behavior

## Test Matrix Executed

### Browser-level (Playwright)
- `tests/e2e/audit-auth-routes.spec.js`
  - Super admin login
  - Normal user login
  - Guest protected-page access
  - Session persistence
  - Logout behavior
- Result: **3 passed / 3 total**

- `tests/e2e/audit-api-authorization.spec.js`
  - Unauthenticated API authorization
  - Admin-only API authorization
  - Cross-tenant report authorization
  - Super admin report/PDF flow
- Result: **4 passed / 4 total**

### Existing suite checked
- `tests/e2e/auth-access-live.spec.js`
- Result: **5 passed / 8 total** (3 failures due test-selector/network-abort assumptions not aligned with current app behavior, not backend auth failures)

### Direct API probes (curl)
Final post-fix probe (`/tmp/final-audit-probe.txt`):
- `no_token_auth_me=401`
- `dev_header_auth_me=401`
- `reset_unauth=401`
- `super_overview=200`
- `user_super_overview=403`
- `user_report_html_cross_tenant=403`
- `super_report_html=200`
- `super_report_generate=200`
- `generated_pdf_status=200`

## Authentication & Session Findings

### Super Admin login
- Status: Pass
- Flow verified:
  - `/super-admin-login` authenticates with email+password+master key
  - redirects to `/super-admin`
  - token persisted in `localStorage` (`insightdisc_api_token`)

### Normal user login
- Status: Pass
- Flow verified:
  - signup + login works
  - lifecycle redirects to `/Pricing?unlock=1` for non-paying users

### Guest access without login
- Status: Mostly pass
- Protected app routes (`/Dashboard`, `/MyAssessments`, `/app/dashboard`) redirect to login/pricing as expected.
- Exception observed:
  - `/Report` on local dev can resolve to root static `report.html` artifact on case-insensitive filesystems, bypassing SPA route guard.

### Session persistence
- Status: Pass
- Verified via reload that authenticated super-admin session remains active when token remains in storage.

### Logout behavior
- Status: Pass
- Super-admin logout clears stored API session keys and redirects to `/super-admin-login`.

## API Authorization Findings

### Route protection
- Status: Pass after fixes
- Unauthenticated access to protected endpoints returns `401`.
- Normal user access to super-admin/admin endpoints returns `403`.

### Admin-only access
- Status: Pass after fixes
- `/super-admin/overview` is super-admin-only.
- `/admin/organizations` blocks normal users.

### Cross-tenant report access
- Status: Pass after fixes
- Normal user with credits cannot read/generate report from another organization (`403`).

## Report Generation & PDF Findings

### Report generation
- Status: Pass after fixes
- Super admin can call:
  - `GET /report/:assessmentId/html`
  - `POST /report/generate`
- Root issue fixed: `SUPER_ADMIN` now has `report.export` permission.

### PDF generation
- Status: Pass after fixes
- Backend-generated PDF URLs resolve and return `200`.
- Super Admin dashboard now normalizes relative `pdfUrl` to absolute API URLs before opening.

## Broken Redirects / Routing Issues

### Confirmed
- `/Report` can serve static `report.html` in local dev (filesystem collision) instead of protected SPA route.
- Risk: perceived route-protection bypass in development and some case-insensitive environments.

## Code Fixes Applied in This Audit

- `server/src/config/env.js`
  - Added `allowDevEmailAuth` flag (`ALLOW_DEV_EMAIL_AUTH`).

- `server/src/middleware/auth.js`
  - Disabled implicit dev header auth by default.
  - Removed auto-user creation in header-auth path.

- `server/src/routes/auth.routes.js`
  - Hardened `/auth/reset-password` with auth+RBAC + current-password verification for self-reset.

- `server/src/routes/report.routes.js`
  - Removed non-production organization-bypass logic.
  - Uses shared RBAC org access check.

- `server/src/modules/auth/permissions.js`
  - Added `SUPER_ADMIN` report export permission.

- `src/pages/SuperAdminDashboard.jsx`
  - Added absolute URL normalization for `pdfUrl` in report actions.

- `src/pages/ForgotPassword.jsx`
  - Updated flow to authenticated password change pattern (requires session + current password).

- `tests/e2e/audit-auth-routes.spec.js`
  - Added dedicated browser auth/route/session/logout audit spec.

- `tests/e2e/audit-api-authorization.spec.js`
  - Added API-level authorization/cross-tenant/report/PDF audit spec.

## Recommended Next Hardening (Not Yet Implemented)
- Implement true forgot-password token flow (email + one-time expiry token).
- Add rate limiting for standard `/auth/login` endpoint.
- Remove/relocate root `report.html` to avoid route collision with `/Report`.
