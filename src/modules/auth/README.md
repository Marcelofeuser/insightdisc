# RBAC and Tenant Isolation

This module enforces multi-tenant access in the frontend.

## Roles

- `SUPER_ADMIN`: global owner role
- `PLATFORM_ADMIN`: platform operations with controlled global scope
- `TENANT_ADMIN`: manages users, credits, and reports inside one tenant
- `TENANT_USER`: operational user inside one tenant
- `END_CUSTOMER`: individual user with self-only data scope

## Security Rule

No user can access data from another tenant, except global admins.

## Core Concepts

- Authorization uses both role and entitlement checks.
- Route guards are enforced in `App.jsx` via `ProtectedRoute`.
- Access context is normalized in `AuthContext` and stored in `user-store`.
- Legacy roles (`admin`, `professional`, `user`) remain mapped for backward compatibility.

## Minimum Test Cases

1. Tenant user requesting another tenant data must receive `403` at API and UI block.
2. Tenant user without credit permission cannot access credit purchase pages.
3. End customer cannot access tenant management pages.
4. Pro report/export actions require entitlement.
5. After entitlement/payment update, access should unlock immediately.

