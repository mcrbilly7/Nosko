# Nosko Handyman — PRD

## Original problem statement
Build a website for "Nosko" handyman company. One set price: $25 for switch/outlet replacement with $25 minimum.
- W9 worker (handyman) signup: hours, skills, location, W9 signing.
- W9 marketer signup: gets personal referral code, 15% profit share when someone books using it.
- Admin pays workers through the app (Stripe Connect).
- Workers/marketers see weekly/monthly/yearly profits.
- Admin page: portfolio photo upload, edit site, list of marketers/workers, all incoming job requests.
- Customers upload a photo with each job request.

## User choices captured
- Worker payouts: Stripe Connect (real Stripe Connect onboarding deferred — admin currently records payouts manually with method='stripe'; Stripe Connect onboarding playbook to be added next)
- Customer payments: Quote-only (no Stripe checkout for customers)
- Auth: Emergent-managed Google login (no app passwords)
- W9: Typed signature + optional PDF upload
- Design: Swiss high-contrast brutalism — yellow (#FFD600) + black, Cabinet Grotesk display + IBM Plex Sans

## Architecture
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + Sonner toasts
- Backend: FastAPI + motor (async MongoDB)
- Auth: Emergent Google OAuth (session_token cookie + Bearer fallback)
- Storage: Emergent object storage (job photos, portfolio, W9 PDFs)
- Routing: react-router-dom v7 with synchronous OAuth callback detection

## Personas
1. Customer (anonymous) — books jobs, uploads photo, optionally uses marketer code
2. Worker — applies as handyman, signs W9, sees jobs + earnings
3. Marketer — applies, gets referral code, shares it, sees referral earnings
4. Admin — full ops view: jobs, workers, marketers, portfolio, site settings, payouts

## What's implemented (2026-02)
- Public marketing landing with hero, pricing card, marquee, portfolio grid, programs CTAs
- Job request flow (anonymous) with photo upload + referral code validation
- Worker signup wizard: profile → W9 → done; role auto-promoted to "worker"
- Marketer signup wizard: profile → W9 → done; unique referral code generated, role auto-promoted to "marketer"
- Worker dashboard: weekly/monthly/yearly earnings, 12-week bar chart, jobs table, payouts list
- Marketer dashboard: code + copyable share link, earnings cards + chart
- Admin dashboard tabs: Jobs (assign/status/quotes/photos), Workers (pay), Marketers (referral count + pay), Portfolio (upload/delete), Site Settings (hero copy, contact, area)
- Auth: Emergent OAuth (Google), cookies + Bearer, admin auto-promotion via ADMIN_EMAIL env
- Object storage: live emergent storage for all uploads
- W9 records: typed signature + optional PDF link

## Backend test coverage
- 32 pytest cases, 100% pass (see `/app/test_reports/iteration_1.json`).
- Auth gating, RBAC, file round-trip, payouts/earnings aggregation, portfolio CRUD all verified.

## Backlog (P0 → P2)
- **P1**: Real Stripe Connect Express onboarding for workers/marketers (so admin can actually push payments to a connected bank).
- **P1**: Pydantic request models on POST /api/jobs, /api/w9/sign, /api/workers/signup, /api/marketers/signup, /api/payouts (currently raw dict — missing keys throw 500 instead of 422).
- **P2**: Email notifications on new job + on payout.
- **P2**: Delete underlying object in storage on portfolio delete (currently DB-only soft delete).
- **P2**: Admin "mark paid" button next to each completed job (instead of free-form prompt).
- **P2**: Customer-facing "track my job" link with status updates.

## Open notes for next session
- The admin email is `admin@nosko.com` (configurable via `ADMIN_EMAIL` in backend/.env). The first user to sign in with that email is automatically promoted to admin.
- Stripe Connect onboarding flow is the most valuable next addition — owner can wire it up by calling the integration playbook for Stripe Connect and supplying their Stripe API key (currently using `sk_test_emergent` placeholder).
