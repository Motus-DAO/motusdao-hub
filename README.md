# MotusDAO Hub

Web app for MotusDAO: mental-health tools, professional intake, and a paid learning academy — with wallet auth, Supabase Postgres, and Stripe billing.

**Live:** [app.motusdao.org](https://app.motusdao.org) · **Org:** [Motus DAO](https://github.com/Motus-DAO)

## What it includes

| Area | What users get |
|------|----------------|
| **Academia** | Public catalog, gated lessons, progress tracking, admin course/module/lesson editor with media uploads |
| **Billing** | Stripe Checkout for one-time course purchase or monthly memberships; cancel from Academia / Perfil; webhook-driven access |
| **Onboarding** | Multi-step registration for learners and PSM (profesionales de salud mental) |
| **PSM** | Public profiles, availability, intake flows |
| **MotusAI** | Mental-health oriented assistant (RAG over knowledge chunks) |
| **Bitácora** | Personal journal / reflection entries |
| **Auth** | Wallet + SIWE session; WaaP (Human.tech); optional smart wallets (feature-flagged) |
| **On-chain** | Motus Name Service, faucet, clinical profile NFT on Celo |

## Stack

- **App:** Next.js (App Router) + TypeScript + Tailwind + Framer Motion
- **Data:** Prisma ORM → **Supabase Postgres** (see [`docs/architecture/data-layer.md`](docs/architecture/data-layer.md))
- **Storage / RAG:** Supabase Storage + pgvector
- **Payments:** Stripe (Checkout + webhooks for `checkout.session.completed`, renewals, cancellations)
- **Auth / chain:** SIWE sessions, Viem, Celo

## Repo layout

```
motusdao-hub/
├── app/                 # Pages + API routes
├── components/          # UI by domain (academy, onboarding, layout, …)
├── lib/                 # Auth, academy, Stripe, storage, Prisma
├── prisma/              # Schema + migrations
├── specs/               # Feature specs (agent source of truth)
├── docs/
│   ├── architecture/    # Durable system design
│   └── runbooks/        # Deploy / ops checklists
├── archive/             # Historical notes (not current truth)
├── AGENTS.md            # Agent read order
└── .cursor/             # Hooks + MCP (RootRouter)
```

Agents and contributors: start with [`AGENTS.md`](AGENTS.md) and [`specs/platform-harmonize.md`](specs/platform-harmonize.md). Slice workflow lives in [`specs/README.md`](specs/README.md).

## Local setup

**Prereqs:** Node.js 18+, npm, a Supabase project (Postgres + Storage), Stripe test keys for Academy checkout.

```bash
git clone https://github.com/Motus-DAO/motusdao-hub.git
cd motusdao-hub
npm install
```

Create `.env.local` (never commit it). Minimum useful set:

```env
DATABASE_URL=postgresql://...          # Supabase pooled
DIRECT_URL=postgresql://...            # Supabase direct (migrations)
NEXT_PUBLIC_SUPABASE_URL=https://….supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…            # server only

STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Auth and optional AA vars are documented in [`docs/runbooks/API_KEYS_CHECKLIST.md`](docs/runbooks/API_KEYS_CHECKLIST.md). Storage setup: [`docs/runbooks/SUPABASE_STORAGE_SETUP.md`](docs/runbooks/SUPABASE_STORAGE_SETUP.md).

```bash
npx prisma migrate deploy   # or: npm run db:push
npm run db:generate
npm run db:seed             # optional sample data
npm run dev                 # http://localhost:3000
```

### Stripe webhooks (Academy)

- **Local:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the CLI secret in `STRIPE_WEBHOOK_SECRET`.
- **Prod:** Dashboard webhook to `/api/stripe/webhook` with at least: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.

Admin: create/edit courses under `/admin/cursos` (billing: pago único or membresía mensual). Learners buy or subscribe from Academia; cancel monthly memberships from **Mis cursos comprados** or **Perfil**.

## Scripts

```bash
npm run dev          # Next.js + Turbopack
npm run build        # prisma generate + production build
npm run lint         # ESLint
npm run db:generate  # Prisma client
npm run db:push      # Sync schema (dev)
npm run db:seed      # Seed data
npm run db:studio    # Prisma Studio
```

## On-chain (Celo Mainnet)

| Contract | Address |
|----------|---------|
| Motus Name Service | `0x4eB280b21de012FCAe14c9aB2D29b298c0A91d1c` |
| Motus Celo Faucet | `0x6d252282fE35EF90B5d80b911d121183D7A0CEbF` |
| Motus Clinical Profile NFT | `0x3343BDc2bfB3C37405c12AD916bb81e88410a1f5` |

## Contributing

1. Prefer a short **spec** under `specs/` for non-trivial work.
2. Keep PRs small and aligned with acceptance criteria.
3. Run `npm run lint` (and typecheck) before push.
4. Do not commit `.env*` or local DB dumps.

## License & contact

MIT — see `LICENSE`.

- **Email:** contacto@motusdao.com  
- **App:** [app.motusdao.org](https://app.motusdao.org)  
- **Site:** [motusdao.com](https://motusdao.com)
