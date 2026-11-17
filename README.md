# Operators

**The people who make AI work.** A curated, two-sided marketplace that connects companies with AI-native operators who automate workflows, deploy agents, and transform how businesses run.

Companies describe a problem in plain English and get a structured implementation brief, operators matched from real reviewed profiles, fixed-price proposals, milestone payments, and a workspace that tracks projected vs. documented impact. Operators build evidence-first profiles, earn admin-verified credentials, sell productized outcome packages, and publish client-approved case studies.

---

## Quick start

```bash
npm install
cp .env.example .env          # edit ADMIN_EMAIL / ADMIN_PASSWORD
npm run db:push               # create tables (SQLite file in ./data by default)
npm run db:seed               # categories, packages, admin, labeled sample listings
npm run dev                   # http://localhost:3000
```

Sign in as the admin from `.env` at `/login`. Create company and operator accounts at `/signup`.

Reset everything: `npm run db:reset`.

## What works today

| Area | Status | Notes |
|---|---|---|
| Homepage with live problem-to-brief scoping | Working | No account needed |
| Operator discovery, filters, rich public profiles | Working | Specialization, function, industry, tool, budget, availability, experience, verified-only, sort |
| AI Match: editable brief, rematching, save, invite | Working | Rules engine by default; Claude when `ANTHROPIC_API_KEY` is set |
| Hire by outcome: packages, operator offers, package requests | Working | Operator confirms scope before anything is charged |
| Auth with company / operator / admin roles | Working | scrypt hashes, DB sessions in httpOnly cookies |
| Operator onboarding (7 progressive steps, live preview) | Working | Identity, capabilities, proof of work, rates, services, verification evidence, submit |
| Proposals, acceptance, project creation | Working | Fixed-price milestones |
| Project workspace | Working | Milestones, deliverables, approvals/revisions, messages, private files, invoices, impact |
| Payments | **Needs Stripe keys** for real money | Without keys, a clearly labeled *simulation mode* records test payments (off by default in production) |
| Stripe Connect payouts | **Needs Stripe keys** | Express onboarding from Settings; destination charges with a platform application fee |
| Admin | Working | Application queue, evidence verification, listings, categories, packages, stories, projects, users, waitlist, metrics |
| AI Transformation Diagnostic + shareable report | Working | Deterministic, transparent math; OG share image |
| Stories (before/after case studies) | Working | Published only after client approval |
| Referrals | Working | `/r/<code>` links, 30-day attribution, clicks and signups in Settings |
| First-party analytics | Working | Page views and key events in the `events` table, shown in Admin |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_URL` | Yes in prod | Public base URL for share links, Stripe redirects, OG images |
| `DATABASE_URL` | Yes | libSQL URL. Default `file:data/operators.db`; use `libsql://…` (Turso) in production |
| `DATABASE_AUTH_TOKEN` | Turso | Auth token for a remote libSQL database |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed | Admin account created by `npm run db:seed` (only if it doesn't exist) |
| `ANTHROPIC_API_KEY` | Optional | Enables AI brief generation |
| `AI_MODEL` | Optional | Defaults to `claude-opus-5-5` |
| `STRIPE_SECRET_KEY` | Optional | Enables Stripe Checkout (use a `sk_test_` key for test mode) |
| `STRIPE_WEBHOOK_SECRET` | With Stripe | Verifies `/api/stripe/webhook` events |
| `PLATFORM_FEE_BPS` | Optional | Platform fee in basis points. Default `1500` (15%) |
| `PAYMENTS_SIMULATION` | Optional | `true` allows labeled simulated payments when Stripe isn't configured. Defaults on in development, off in production. Never enable for real customers |
| `DISABLE_RATE_LIMIT` | Dev only | `true` disables the in-memory rate limiter outside production (used for repeated e2e runs) |

## Stripe setup (test mode)

1. Put `STRIPE_SECRET_KEY=sk_test_…` in the environment.
2. Add a webhook endpoint at `<APP_URL>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Enable Connect (Express) in the Stripe dashboard so operators can connect payout accounts from **Settings**.

Money flow: each milestone is paid through Stripe Checkout when it starts. If the operator has a connected account, the charge is a destination charge with `application_fee_amount` equal to the platform fee; otherwise the platform collects and pays out manually. **There is no escrow**, and the UI says so. The success redirect re-verifies the session with Stripe rather than trusting the URL, and the webhook is idempotent.

## Deployment (Vercel + Turso)

1. Create a Turso database; set `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.
2. From your machine: `npm run db:push && npm run db:seed` with those variables set.
3. Import the repo into Vercel, set the environment variables above (including `APP_URL`), and deploy. Any Node host that runs `npm run build && npm start` also works; a local `file:` database needs a persistent disk.

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript**, Server Components with Server Actions for mutations. `src/proxy.ts` exposes the path for post-login redirects.
- **Tailwind CSS v4** design system in `src/app/globals.css` (tokens) and `src/components/ui.tsx` (primitives). Geist + Instrument Serif, one signature accent (`#ff4f00`), reduced-motion support, visible focus rings, skip link.
- **Drizzle ORM on libSQL/SQLite** (`src/lib/db/schema.ts`). Files (avatars, project files) are stored in the database for portability, capped at 1 MB / 5 MB.
- **Matching** (`src/lib/matching.ts`) is deterministic and grounded: every reason shown to a company is derived from fields on the operator's profile. AI never ranks or describes operators.
- **Brief engine** (`src/lib/brief-engine.ts`, `src/lib/playbooks.ts`): keyword and signal extraction over implementation playbooks. `src/lib/ai.ts` calls Claude with structured outputs when configured, validates and clamps the result, and falls back to the rules engine on any error or refusal (with a visible notice). Only the problem text the user typed is sent.
- **Diagnostic** (`src/lib/diagnostic.ts`): transparent formula (reported hours × per-task automation range, size-based baseline when hours are missing, labeled "assumed").
- **Authorization**: `src/lib/access.ts` gates briefs, projects, and threads by ownership; every server action re-checks role and ownership. Cross-origin POSTs to `/api/brief` are rejected; Server Actions have Next's built-in origin check.

## Launch strategy built into the product

- Sample listings are seeded by the team, labeled **Sample listing** everywhere, can never be invited, hired, or verified, and can be hidden globally from Admin → Overview.
- Illustrative case studies are labeled **Illustrative**; real stories require client approval.
- Operators apply into a human review queue. Badges only appear after an admin approves specific evidence.
- Empty states route demand to the curation team (brief posting, waitlist) so a 25-operator network still feels complete.

## Testing

```bash
npm run typecheck
# with a server running (dev or `npm run build && PAYMENTS_SIMULATION=true npm start`):
DISABLE_RATE_LIMIT=true npm run dev   # optional, for repeated runs
npm run test:e2e                      # Playwright: operator, admin, company, hiring, payments, files,
                                      # messages, impact, review, stories, diagnostic, referrals, authz
```

## Known limitations

- Rate limiting is in-memory per server instance; use a shared store (e.g. Redis) when scaling horizontally.
- No email delivery yet: notifications live in Messages and the dashboard. Password reset requires an email provider and is not implemented.
- Hourly billing is modeled (`billingModel`, invoice `kind`) but only fixed-price milestones are exposed.
- Refunds and disputes are handled outside the app (Stripe dashboard / support).
- Search and filtering run in memory over listed operators, which is appropriate for a curated network of hundreds; move to SQL or a search index beyond that.
- The AI path was exercised against the live API for error handling (invalid key → graceful fallback) but not with a valid key in this environment.
