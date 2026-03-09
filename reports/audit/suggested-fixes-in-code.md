# Suggested Fixes In Code

Generated on: 2026-03-08

## Implemented in this audit

1. Gate dev header auth behind explicit flag
- File: `server/src/config/env.js`
- File: `server/src/middleware/auth.js`
- Change: `x-insight-user-email` no longer works by default; requires `ALLOW_DEV_EMAIL_AUTH=true`.
- Benefit: removes accidental auth bypass in development/staging environments.

2. Remove auto-user creation from auth middleware
- File: `server/src/middleware/auth.js`
- Change: unknown dev-header email now returns `401` instead of creating a new PRO user.
- Benefit: blocks unauthorized account creation.

3. Harden password reset endpoint
- File: `server/src/routes/auth.routes.js`
- Change: `/auth/reset-password` now requires authenticated session; self-reset requires current password; only super admin can reset others.
- Benefit: closes unauthenticated account takeover vector.

4. Enforce tenant authorization in report endpoints in all environments
- File: `server/src/routes/report.routes.js`
- Change: removed non-production `canAccessOrganization => true` bypass.
- Benefit: blocks cross-tenant report read/generation.

5. Align super-admin permissions for report export
- File: `server/src/modules/auth/permissions.js`
- Change: added `SUPER_ADMIN` role to `ROLE_PERMISSIONS` with `report.export`.
- Benefit: fixes broken super-admin report/PDF generation.

6. Normalize relative PDF URLs in super-admin UI
- File: `src/pages/SuperAdminDashboard.jsx`
- Change: introduced `resolveAbsoluteApiUrl()` for all PDF open actions.
- Benefit: prevents broken PDF links when frontend and API run on different origins.

7. Update password-change UI to new secure contract
- File: `src/pages/ForgotPassword.jsx`
- Change: requires authenticated session + current password.
- Benefit: frontend behavior matches hardened backend endpoint.

## Recommended next code changes (not implemented yet)

1. Implement true forgot-password flow
- Add `POST /auth/request-password-reset` and `POST /auth/confirm-password-reset` with one-time expiring token.

2. Add login rate-limiting for regular users
- Add rate limiter for `POST /auth/login` (IP + email tuple, sliding window, lockout threshold).

3. Resolve `/Report` static route collision
- Move root `report.html` to a non-routed path or rename it (e.g. `reports/dev-preview.html`) to avoid bypassing SPA guard on case-insensitive FS.

4. Add structured security audit logs
- Log denied auth attempts (`401/403`) with route, userId/email (when present), source IP, and reason code.
