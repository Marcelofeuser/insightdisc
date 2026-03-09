# InsightDISC Route Inventory

Generated on: 2026-03-08

## Frontend Routes (React Router)

### Candidate/public flow routes
| Path | Component | Protection |
|---|---|---|
| `/c` | `CandidateInvite` | Public |
| `/c/invite` | `CandidateInvite` | Public |
| `/c/upgrade` | `CandidateUpgrade` | Public |
| `/c/assessment` | `CandidateAssessment` | Public |
| `/c/report` | `CandidateReport` | Public (token/email-based flow) |
| `/c/portal` | `CandidatePortal` | Public route, internal checks happen inside page |

### Explicit routes in `App.jsx`
| Path | Component | Protection |
|---|---|---|
| `/` | `Home` (main page) | Public (`ProtectedRoute` with public policy) |
| `/gift/:token` | `GiftLanding` | Public policy |
| `/dossie-comportamental` | `DossieComportamentalLandingPage` | Public (no guard) |
| `/checkout` | `Checkout` | Public (no guard) |
| `/Checkout` | Redirect to `/checkout` | Public redirect |
| `/app` | Redirect to `/app/dashboard` | Protected destination |
| `/app/dashboard` | `Dashboard` | Auth + premium lifecycle |
| `/app/dossier` | `Dossier` | Auth + premium lifecycle + tenant/view permission |
| `/app/my-assessments` | `MyAssessments` | Auth + premium lifecycle |
| `/app/send-assessment` | `SendAssessment` | Auth + premium lifecycle + create permission |
| `/app/team-mapping` | `TeamMapping` | Auth + premium lifecycle + tenant/view permission |
| `/app/job-matching` | `JobMatching` | Auth + premium lifecycle + tenant/view permission |
| `/app/leads` | `LeadsDashboard` | Auth + premium lifecycle + tenant/view permission |
| `/app/credits` | `Credits` | Auth + premium lifecycle + credit permission |
| `/app/branding` | `BrandingSettings` | Auth + premium lifecycle + create permission |
| `/app/admin` | `AdminDashboard` | Global role `SUPER_ADMIN` or `PLATFORM_ADMIN` |
| `/app/analytics` | `AnalyticsDashboard` | Global admin or tenant role+permission |
| `/sendAssessment` | `SendAssessment` | Same policy as above |
| `/avaliacoes` | `Avaliacoes` | Public policy |
| `/super-admin-login` | `SuperAdminLogin` | Public policy |
| `/super-admin` | `SuperAdminDashboard` | `SuperAdminRoute` (`SUPER_ADMIN` + `/auth/super-admin/me`) |
| `/r/:token` | `PublicReport` | Public policy |
| `/palette-test` | `PaletteTest` | Public |
| `*` | `PageNotFound` | Fallback |

### Auto-generated page routes from `pages.config.js`
All keys below are exposed as `/<PageKey>` and wrapped in `ProtectedRoute` with policy from `route-policy.js`:

`/AdminDashboard`, `/Avaliacoes`, `/AnalyticsDashboard`, `/CandidateOnboarding`, `/BrandingSettings`, `/CheckoutSuccess`, `/Credits`, `/Dashboard`, `/Dossier`, `/ForgotPassword`, `/FreeAssessment`, `/FreeResults`, `/Home`, `/JobMatching`, `/LeadsDashboard`, `/Lgpd`, `/Login`, `/MyAssessments`, `/PremiumAssessment`, `/Privacy`, `/Pricing`, `/PublicReport`, `/Report`, `/SendAssessment`, `/Signup`, `/StartFree`, `/TeamMapping`, `/Terms`.

Notes:
- Public page policies are defined in `src/modules/auth/route-policy.js` (`PUBLIC_PAGES`).
- Non-listed pages default to `requiresAuth: true`.

## Backend Routes (Express API)

Mount points from `server/src/app.js`:
- `/health`
- `/auth`
- `/admin`
- `/assessments`
- `/assessment`
- `/candidate`
- `/report`
- `/branding`
- `/payments`
- `/jobs`
- `/api/leads`
- `/api/dossier`
- `/super-admin`

### Health
| Method | Path | Guards |
|---|---|---|
| GET | `/health/` | None |

### Auth
| Method | Path | Guards |
|---|---|---|
| POST | `/auth/register` | None |
| POST | `/auth/login` | None |
| POST | `/auth/super-admin-login` | None (+ master key + role + rate limit) |
| GET | `/auth/me` | `requireAuth` |
| GET | `/auth/super-admin/me` | `requireAuth`, `attachUser`, `requireSuperAdmin` |
| POST | `/auth/reset-password` | `requireAuth`, `attachUser` |

### Admin
| Method | Path | Guards |
|---|---|---|
| POST | `/admin/organizations` | `requireAuth`, `attachUser`, `requireRole('ADMIN')` |
| POST | `/admin/professionals` | Same |

### Assessments (owner/admin/pro)
| Method | Path | Guards |
|---|---|---|
| POST | `/assessments/create` | `requireAuth`, `attachUser`, `requireRole('ADMIN','PRO')`, `requireActiveCustomer` |
| POST | `/assessments/generate-link` | Same |

### Assessment invite/report token flow
| Method | Path | Guards |
|---|---|---|
| POST | `/assessment/self/start` | `requireAuth`, `attachUser` |
| GET | `/assessment/validate-token` | None |
| GET | `/assessment/report-by-token` | None (token-based) |
| GET | `/assessment/report-pdf-by-token` | None (token-based) |
| POST | `/assessment/consume` | None (token-based) |
| POST | `/assessment/submit` | None (token-based) |

### Candidate
| Method | Path | Guards |
|---|---|---|
| POST | `/candidate/register` | None |
| POST | `/candidate/login` | None |
| POST | `/candidate/claim` | Optional bearer + token flow |
| POST | `/candidate/claim-report` | Optional bearer + token flow |
| GET | `/candidate/me/reports` | `requireAuth`, `attachUser`, `requireRole('CANDIDATE','ADMIN','PRO')` |
| GET | `/candidate/reports` | Same |

### Report generation and retrieval
| Method | Path | Guards |
|---|---|---|
| GET | `/report/:assessmentId/html` | `requireAuth`, `attachUser`, `requireActiveCustomer`, `requireReportExport` |
| POST | `/report/generate` | Same |
| GET | `/report/:id` | `requireAuth`, `attachUser`, `requireActiveCustomer` |

### Branding
| Method | Path | Guards |
|---|---|---|
| GET | `/branding/:workspaceId` | `requireAuth`, `attachUser`, `requireActiveCustomer` + workspace manage check |
| PUT | `/branding/:workspaceId` | Same |
| POST | `/branding/:workspaceId/logo` | Same + upload middleware |

### Payments
| Method | Path | Guards |
|---|---|---|
| POST | `/payments/create-checkout` | `requireAuth` |
| POST | `/payments/confirm` | `requireAuth` |

### Jobs
| Method | Path | Guards |
|---|---|---|
| GET | `/jobs` | `requireAuth`, `attachUser`, `requireRole('ADMIN','PRO')`, `requireActiveCustomer` |
| POST | `/jobs` | Same |

### Leads
| Method | Path | Guards |
|---|---|---|
| POST | `/api/leads` | None |
| GET | `/api/leads` | `requireAuth`, `attachUser`, `requireRole('ADMIN','PRO')`, `requireActiveCustomer` |
| GET | `/api/leads/export/csv` | Same |
| GET | `/api/leads/:id` | Same |
| PATCH | `/api/leads/:id` | Same |

### Dossier
| Method | Path | Guards |
|---|---|---|
| GET | `/api/dossier/reminders/summary` | `requireAuth`, `attachUser`, `requireRole('ADMIN','PRO')`, `requirePremiumFeature` |
| GET | `/api/dossier/:candidateId` | Same |
| POST | `/api/dossier/:candidateId/note` | Same |
| POST | `/api/dossier/:candidateId/insight` | Same |
| POST | `/api/dossier/:candidateId/plan` | Same |
| POST | `/api/dossier/:candidateId/reminder` | Same |

### Super Admin
| Method | Path | Guards |
|---|---|---|
| GET | `/super-admin/` | `requireAuth`, `attachUser`, `requireSuperAdmin` |
| GET | `/super-admin/overview` | Same |

## Serverless/Vercel API Routes (`/api/*`)
| Method | Path | Auth |
|---|---|---|
| POST | `/api/credits/consume` | None |
| GET | `/api/pdf` | None |
| POST | `/api/report/create-token` | None |
| GET | `/api/report/public` | Token-based (signed token) |
| POST | `/api/stripe/create-checkout-session` | None |
| POST | `/api/stripe/verify` | None |
| POST | `/api/stripe/webhook` | Stripe signature verification if secret set |
