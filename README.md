# MotusDAO Hub

Mental-health platform in Spanish: AI support and professional supervision (**Psychat**), a
therapist marketplace (**Psicoterapia**), a paid learning academy (**Academia**), a
wallet-encrypted journal (**Bitácora**), and the clinical operations behind them — wallet auth,
Supabase Postgres, Stripe billing, private video, and consent/audit trails.

**Live:** [app.motusdao.org](https://app.motusdao.org) · **Org:** [Motus DAO](https://github.com/Motus-DAO)

> **Current state:** [specs/STATUS.md](specs/STATUS.md) — shipped / in flight / next.
> `MotusAI` was renamed to **Psychat**; `/motusai` redirects to `/psychat`.

## What it includes

| Area | What users get |
|------|----------------|
| **Psychat** | PSM supervisor (prose by default, structured report on demand) and `usuario` exploration; Venice TEE / browser E2EE; encrypted chat archive; optional local RootRouter context |
| **Psicoterapia** | Public therapist profiles, availability, booking, matching, private Jitsi video, and SPEI/CLABE payment confirmation |
| **Pagos** | Self-custodial WaaP wallet, QR send/receive of CELO, stablecoins and Ripio wFIAT, `.motus` recipient names, Ripio on/off-ramp (mock until partner keys) and Textile FX swaps |
| **Academia** | Public catalog, gated lessons, progress tracking, admin course/module/lesson editor with media uploads, Stripe Checkout for one-time or membership access |
| **Bitácora** | Personal journal encrypted in the browser (`motus-safe-notes`); export and recovery on another device with the same wallet |
| **Portability** | Consented FHIR summary for a matched professional, and a consented readable copy for training |
| **Admin** | Users, PSM, matches, sessions, courses, and platform activity |
| **Auth** | WaaP + SIWE session; provider-agnostic facade; optional smart wallets behind a flag |
| **On-chain** | Motus Name Service, Celo faucet, clinical profile NFT on Celo |
| **Compliance** | Privacy notice, terms, cookies, subprocessors, versioned consent |

## Stack

- **App:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + Framer Motion
- **Data:** Prisma ORM → **Supabase Postgres** (see [`docs/architecture/data-layer.md`](docs/architecture/data-layer.md))
- **Storage / RAG:** Supabase Storage + pgvector
- **AI:** provider selected by `AI_PROVIDER` (OpenAI by default, Venice for TEE/E2EE); optional local RootRouter proxy for Psychat context
- **Payments:** Stripe Checkout + webhooks (Academia); SPEI/CLABE (therapy); Celo transfers with QR (Pagos); Ripio/Textile ramp integrations (status below)
- **Video:** private Jitsi (`jitsi.motusdao.org`); the Hub mints tokens
- **Auth / chain:** WaaP (Human.tech) self-custody + SIWE sessions, Viem, Celo

## Payments and self-custody

`/pagos` is the user's wallet surface. It is **self-custodial**: the user's WaaP
(Human.tech) wallet signs every transfer, and Motus does not hold wallet funds or private keys.
WaaP provides the EOA through an EIP-1193 provider and 2PC/Human Keys security; the Hub only
builds and submits the transaction.

- **Send/receive:** CELO, USDT, USDC, USDm, EURm, BRLm, COPm, CADm, PSY, MOT, and Ripio wFIAT
  (`wARS`, `wBRL`, `wMXN`, `wCOP`, `wPEN`, `wCLP`) on Celo.
- **QR:** generate a receive QR for the connected wallet; scan a QR to prefill the recipient
  (and the amount when the QR includes `?amount=`).
- **Recipients:** `0x…` address or a `.motus` name (Motus Name Service), with reverse lookup.
- **Receipts:** every transfer returns a Celo Explorer link. Gas sponsorship is handled by
  WaaP's Gas Tank when it is configured; otherwise the user pays gas.

### Payment rails and current status

| Rail | Used for | Status |
|------|----------|--------|
| **Stripe Checkout** | Academy courses and memberships | Live |
| **SPEI / CLABE** | Therapy sessions, paid directly to the professional | Live; manual confirmation |
| **Celo transfer + QR** | P2P and professional payments | Live |
| **WaaP (Human.tech)** | Self-custodial wallet and signing | Live |
| **Ripio Ramps Widget** | Fiat on-ramp / off-ramp | **Connected, not active**: runs an in-app mock until partner credentials exist |
| **Textile FX (RFQ v2)** | `wARS` / `wBRL` ↔ `USDT` swaps | **Wired** to the public RFQ; no Motus API key required |
| **Transak / Mt Pelerin / Privy** | Legacy on-ramp handlers | Code present; not exposed in the current provider grid |

Ripio is a partner-only API. Without `RIPIO_CLIENT_ID` / `RIPIO_CLIENT_SECRET`, the UI uses a
demo wizard and never calls the live widget. To activate it:

```env
RIPIO_CLIENT_ID=your_partner_client_id
RIPIO_CLIENT_SECRET=your_partner_client_secret   # server only
RIPIO_ENV=sandbox                                 # or production
RIPIO_MOCK=false
# NEXT_PUBLIC_RIPIO_RAMPS_ENABLED=false           # hide the provider entry
```

Details: [Ripio Ramps spec](specs/ripio-ramps-widget.md) ·
[wFIAT + Textile spec](specs/ripio-wfiat-pagos.md).

## Repo layout

```text
motusdao-hub/
├── app/                 # Pages + API routes
├── components/          # UI by domain (academy, psychat, onboarding, …)
├── lib/                 # Auth, academy, Psychat, Stripe, storage, Prisma
├── prisma/              # Schema + migrations + seed
├── specs/               # SDD truth: STATUS.md, platform-harmonize, slice specs
├── docs/
│   ├── architecture/    # Durable system design
│   ├── runbooks/        # Deploy / ops checklists
│   ├── compliance/      # Legal sources + beta debt
│   └── specs/           # LOCKED SDD plans (safety, chat-data)
├── infra/               # Jitsi / contracts docs
├── archive/             # Historical notes (not current truth)
├── scripts/             # Seeds, admin ops, test runner
├── AGENTS.md            # Agent read order
└── .cursor/             # Hooks + MCP config
```

Agents: start with [`AGENTS.md`](AGENTS.md), then [`specs/platform-harmonize.md`](specs/platform-harmonize.md)
and [`specs/STATUS.md`](specs/STATUS.md). The slice workflow and Definition of Done live in
[`specs/README.md`](specs/README.md).

## Local setup

**Prereqs:** Node.js 20+, npm, a Supabase project (Postgres + Storage), Stripe test keys for
Academy checkout.

```bash
git clone https://github.com/Motus-DAO/motusdao-hub.git
cd motusdao-hub
npm install
```

Create `.env.local` (never commit it). Start from [`env.example`](env.example); the minimum useful
set is:

```env
AUTH_SECRET=...                         # session signing
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://...          # Supabase pooled
DIRECT_URL=postgresql://...            # Supabase direct (migrations)

NEXT_PUBLIC_SUPABASE_URL=https://….supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…            # server only

STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…

AI_PROVIDER=openai                      # or venice
OPENAI_API_KEY=…                        # or VENICE_INFERENCE_KEY
```

Auth, AI, video, and optional AA variables are documented in
[`docs/runbooks/API_KEYS_CHECKLIST.md`](docs/runbooks/API_KEYS_CHECKLIST.md). Storage setup:
[`docs/runbooks/SUPABASE_STORAGE_SETUP.md`](docs/runbooks/SUPABASE_STORAGE_SETUP.md).

```bash
npm run db:push             # current schema sync (or: npx prisma migrate deploy)
npm run db:generate         # Prisma client
npm run db:seed             # optional sample data
npm run dev                 # http://localhost:3000
```

> **Migrations:** `prisma/migrations/` exists, but the deploy workflow currently uses
> `prisma db push` (`npm run db:deploy`). If you move to a migration-based deploy, wire
> `npx prisma migrate deploy` into the pipeline first.

### Stripe webhooks (Academia)

- **Local:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the CLI secret in `STRIPE_WEBHOOK_SECRET`.
- **Prod:** Dashboard webhook to `/api/stripe/webhook` with at least: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.

Admin: create/edit courses under `/admin/cursos` (billing: pago único or membresía mensual).
Learners buy or subscribe from Academia; cancel monthly memberships from **Mis cursos comprados** or **Perfil**.

### Tests and CI

```bash
npm test        # discovers every *.test.ts(x) under lib/components/app/scripts
```

CI runs lint, typecheck, tests, Prisma schema validation, and a production build. The test
runner is [`scripts/run-tests.mjs`](scripts/run-tests.mjs); adding a test file is enough.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js + Turbopack |
| `npm run build` | `prisma generate` + production build |
| `npm run lint` | ESLint |
| `npm test` | All node:test files (auto-discovered) |
| `npm run db:generate` / `db:push` / `db:deploy` | Prisma client / schema sync |
| `npm run db:seed` | Seed data |
| `npm run db:studio` | Prisma Studio |
| `npm run grant-admin` / `list-admins` | Admin operations |
| `npm run mns:*` | MNS deploy, compile, price, withdraw |

## Psychat and AI providers

- `POST /api/chat` requires a SIWE session and stored AI consent.
- `AI_PROVIDER=openai` by default; `AI_PROVIDER=venice` enables TEE/E2EE paths.
- PSM uses the Qwen supervisor TEE model when Venice is configured.
- RootRouter is an **optional local proxy** for working memory, not a hosted transcript:
  see [`docs/architecture/psychat-rootrouter-context.md`](docs/architecture/psychat-rootrouter-context.md).

## On-chain (Celo Mainnet)

| Contract | Address |
|----------|---------|
| Motus Name Service | `0x4eB280b21de012FCAe14c9aB2D29b298c0A91d1c` |
| Motus Celo Faucet | `0x6d252282fE35EF90B5d80b911d121183D7A0CEbF` |
| Motus Clinical Profile NFT | `0x3343BDc2bfB3C37405c12AD916bb81e88410a1f5` |

## Docs

- [`AGENTS.md`](AGENTS.md) — read order for agents
- [`specs/STATUS.md`](specs/STATUS.md) — current state dashboard
- [`specs/platform-harmonize.md`](specs/platform-harmonize.md) — taxonomy and phased plan
- [`specs/README.md`](specs/README.md) — loop, QA, Definition of Done
- [`docs/README.md`](docs/README.md) — architecture, runbooks, compliance index

## Contributing

1. Prefer a short **spec** under `specs/` for non-trivial work.
2. Keep PRs small and aligned with acceptance criteria.
3. Run `npm run lint && npx tsc --noEmit && npm test && npm run build` before push.
4. Do not commit `.env*` or local DB dumps.

## License & contact

MIT. This checkout does not track a `LICENSE` file yet; add one before distributing.

- **Email:** contacto@motusdao.com
- **App:** [app.motusdao.org](https://app.motusdao.org)
- **Site:** [motusdao.com](https://motusdao.com)
