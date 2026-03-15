# InsightDISC Backend (Express + Prisma)

Production-oriented backend scaffold for InsightDISC.

## Stack
- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT auth
- Stripe checkout (with mock fallback)
- Puppeteer PDF generation

## Quick start
1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET`.
3. Install dependencies:
   - `cd server && npm install`
4. Initialize database:
   - `npm run prisma:generate`
   - `npm run prisma:push`
5. Run API:
   - `npm run dev`

## Core routes
- `POST /auth/register`
- `POST /auth/login`
- `POST /assessments/create`
- `POST /assessments/generate-link`
- `GET /assessment/validate-token?token=...`
- `POST /assessment/submit`
- `POST /report/generate`
- `GET /report/:id`
- `POST /payments/create-checkout`

## Invite security flow
1. Generate random token.
2. Hash with SHA256.
3. Store only `token_hash`.
4. Send raw token in link.
5. Candidate hashes token again.
6. Validation queries invite by `token_hash`.

## Report/PDF
- Report model generated from DISC scores.
- Premium HTML template generated server-side.
- Puppeteer exports A4 PDF to `server/generated/reports`.
