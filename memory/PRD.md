# Nosko Handyman — PRD (Iter 3)

## Iter 3 — Stripe Connect payouts + Gmail email working
- ✅ Gmail App Password (`onglpbnyxgkwgvnb`) wired. Welcome email confirmed delivered.
- ✅ Stripe API key (`sk_test_51TYvfc…`) wired.
- ✅ New endpoints:
  - `POST /api/stripe/onboard` — creates Express account (or reuses), returns one-time onboarding URL
  - `GET /api/stripe/status` — returns charges_enabled / payouts_enabled / details_submitted / requirements; caches in DB
  - `POST /api/payouts` (admin) — when method='stripe', performs `stripe.Transfer.create` to push money to the connected account; rejects if recipient hasn't completed onboarding
- ✅ Frontend: `StripeConnectCard` component on Worker dashboard, Marketer dashboard, and Account settings — shows status (charges/payouts/details), CTA "Connect with Stripe" → redirects to Stripe-hosted onboarding → returns to `/account/stripe/return`.
- ✅ All 66 backend regression tests still pass.

## ⚠️ Owner action still required
Stripe rejected `Account.create` with:
> "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect."

**Fix**: Visit https://dashboard.stripe.com/connect and click "Get started" / enable Connect on the test account that owns the API key. One-time, free, takes ~30 seconds. After that, the onboard endpoint will work.

## Implemented (cumulative)
- Hybrid auth: Google OAuth + email/password (register/login/forgot/reset)
- Founding admins auto-promoted: `noskotx@gmail.com`, `nossonkosowsky32@gmail.com`
- Team tab in admin (founder-only role management)
- Account settings (every user)
- Cleaner DFW landing with $25/swap + $50 visit minimum
- Job request with photo upload (anon)
- W9 signing (typed + PDF)
- Worker/Marketer signup wizards
- Earnings dashboards (weekly/monthly/yearly + 12-week chart)
- Portfolio CRUD + site settings editor
- Object storage for all uploads
- Welcome / quote / reset emails via Gmail SMTP (live)
- Stripe Connect Express onboarding + transfers (waiting for Connect enable)

## Backlog
- **P1**: Job-completion → auto-payout (15% to marketer, remainder to worker after platform cut).
- **P1**: Webhooks `account.updated` + `transfer.created`/`transfer.failed` for real-time status.
- **P2**: BackgroundTasks for SMTP (currently synchronous in async handler).
- **P2**: Pydantic models on POST endpoints (currently raw dict → 500 on missing fields).
- **P2**: TTL index on user_sessions, split server.py into modules.
