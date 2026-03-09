# InsightDISC Auth/Security Bugs

Generated on: 2026-03-08

## Confirmed Findings

### 1) Unauthenticated password reset endpoint
- Severity: Critical
- Affected endpoint: `POST /auth/reset-password`
- Evidence (before fix): any unauthenticated caller could reset any user password by email.
- Impact: account takeover.
- Fix applied:
  - `server/src/routes/auth.routes.js:349`
  - Endpoint now requires `requireAuth` + `attachUser`.
  - Non-super-admin can only reset own account and must provide valid `currentPassword`.
  - Super admin can reset other users.
- Verification after fix:
  - `reset_unauth=401` (probe run)

### 2) Dev header authentication bypass + auto-user creation
- Severity: Critical (dev/staging hardening risk)
- Affected code: `server/src/middleware/auth.js`.
- Evidence (before fix): sending `x-insight-user-email` without token authenticated as any email and auto-created users.
- Impact: full authentication bypass in non-production deployments.
- Fix applied:
  - `server/src/config/env.js`: added `ALLOW_DEV_EMAIL_AUTH` flag.
  - `server/src/middleware/auth.js:15-31` now only accepts header auth when flag is explicitly `true`.
  - auto-user creation removed (unknown email => `401`).
- Verification after fix:
  - `dev_header_auth_me=401` (probe run)

### 3) Cross-tenant report authorization bypass in non-production
- Severity: High
- Affected endpoints:
  - `GET /report/:assessmentId/html`
  - `POST /report/generate`
  - `GET /report/:id`
- Root cause (before fix): `canAccessOrganization` in `report.routes.js` returned `true` whenever `NODE_ENV !== 'production'`.
- Impact: authenticated user could access/generate reports from other organizations.
- Fix applied:
  - `server/src/routes/report.routes.js:1-136`
  - removed local permissive check and now uses shared `canAccessOrganization` from RBAC middleware.
- Verification after fix:
  - `user_report_html_cross_tenant=403`

### 4) SUPER_ADMIN missing report export permission
- Severity: Medium (functional/security policy inconsistency)
- Affected code: `server/src/modules/auth/permissions.js`.
- Symptom: super admin could access dashboard but failed report HTML/PDF generation (`403`).
- Fix applied:
  - `server/src/modules/auth/permissions.js:5-9`
  - added `SUPER_ADMIN: [PERMISSIONS.REPORT_EXPORT]`.
- Verification after fix:
  - `super_report_html=200`
  - `super_report_generate=200`

### 5) Broken PDF links in Super Admin dashboard (relative URL handling)
- Severity: Medium (report/PDF UX failure)
- Affected UI: `src/pages/SuperAdminDashboard.jsx`.
- Root cause: dashboard used relative `pdfUrl` values directly in `window.open`, which break when frontend/backend are on different origins.
- Fix applied:
  - `src/pages/SuperAdminDashboard.jsx:136-181`, `342-349`, `645`, `777-780`
  - introduced `resolveAbsoluteApiUrl()` and normalized all `pdfUrl` before use.
- Verification after fix:
  - `generated_pdf_status=200`

## Residual Risks / Open Issues

### A) `/Report` bypasses app route guard in local dev
- Severity: Medium
- Detail: on case-insensitive local filesystem, `/Report` can resolve to root `report.html` instead of React-protected route.
- Evidence: guest navigation to `/Report` shows static report preview page (`"Sem dados"`) without auth redirect.
- Suggested fix:
  - move/rename root `report.html` artifact to a non-route path (`/reports/dev-preview.html`), or
  - enforce app-only routing and block direct static file route collisions.

### B) No public secure "forgot password" flow (token/email-based)
- Severity: Medium
- Current state: endpoint is now hardened and requires authenticated session for password change.
- Gap: true password recovery (email token, expiry, one-time use) is still not implemented.
- Suggested fix:
  - implement `request-reset` + signed one-time reset token + `confirm-reset` endpoints.

### C) Login endpoint lacks brute-force/rate-limit controls for regular users
- Severity: Medium
- Affected endpoint: `POST /auth/login`.
- Note: super admin login has rate limiting; regular login currently does not.
- Suggested fix:
  - add IP/email sliding-window rate limiter, lockout policy, and audit logs.
