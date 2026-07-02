# Platform Harmonize — Master SDD

> Status: **ACTIVE** · Owner: product + eng · Layer 0: [Feng Shui](https://rootrouter.motusdao.org/FENG-SHUI.md)
>
> Purpose: turn a vibe-coded monolith into a production-ready platform **without breaking what works today**.
> This is the persistent memory for humans and agents across iterations.
>
> **Workspace:** `/Users/main/MotusDAO-Hub-Psi/motusdao-hub`  
> **Remote:** `github.com/Motus-DAO/motusdao-hub`

---

## Feng Shui layers (read order)

```text
Layer 0 — Feng Shui (where files live)     → this doc + placement policy below
Layer 1 — RootRouter (what context loads)  → specs/README.md + HANDOFF.md
Layer 2 — SDD slices (what we build)       → specs/<feature>.md
Layer 3 — QA loop (when it's done)         → .cursor/hooks/qa-loop.mjs
```

**Prime directive:** No durable work outside the taxonomy. Treat `pwd` as evidence, not permission.

---

## 0. Restore point — do this before any harmonize phase

You have a **working app** (Academy, PSM intake, MotusAI RAG, onboarding). Every harmonize phase starts from a tagged baseline so you can roll back in one command.

### 0.1 Current state (as of 2026-07-01)

- Branch: `main` @ `4e31fa2` (synced with `origin/main`)
- **Uncommitted changes:** ~19 files (onboarding UI polish) — commit or stash before tagging
- **Tracked artifacts to remove (not secrets, but wrong):** `prisma/dev.db`, `prisma/prisma/dev.db`, `backups/pre_migration_*.json`

### 0.2 Baseline procedure (human runs once)

```bash
cd /Users/main/MotusDAO-Hub-Psi/motusdao-hub

# 1. Save current working state
git status
git add -A
git commit -m "chore: baseline before platform harmonize (working academy + PSM + MotusAI)"

# 2. Tag immutable restore point
git tag -a harmonize-baseline-2026-07-01 -m "Last known-good before platform harmonize"

# 3. Push branch + tag
git push origin main
git push origin harmonize-baseline-2026-07-01
```

### 0.3 Rollback if a phase breaks production

```bash
# Option A — revert to tag (hard reset local; use with care)
git checkout harmonize-baseline-2026-07-01

# Option B — revert a bad merge commit (safer on shared main)
git revert <bad-commit-sha>

# Option C — Vercel: redeploy the deployment tied to the baseline tag/commit
```

### 0.4 Phase discipline

| Rule | Why |
|------|-----|
| **One phase = one PR = one merge** | Easy revert |
| Run `npm run lint && npx tsc --noEmit && npm run build` before merge | Catches breaks early |
| Never bundle identity migration + doc moves + infra split | Too many failure modes |
| Tag after each successful phase | `harmonize-phase-3a`, etc. |

---

## 1. Product SDD — what this app is

### 1.1 One-sentence outcome

**MotusDAO Hub** is a mental-health platform where people register with a wallet, take courses (Academy), connect with licensed therapists (PSM), use MotusAI for guided support, and optionally use on-chain identity (Motus Names) — with clinical-grade intake and audit trails.

### 1.2 MVP for revenue (sell courses first)

| Priority | Capability | Status | Blocker for paid courses |
|----------|------------|--------|--------------------------|
| P0 | User auth (wallet + email) | Working (WaaP + SIWE) | Agnostic provider cleanup |
| P0 | Academy catalog + player + progress | Working (slices 1–4) | Stripe/payment flow hardening |
| P0 | Admin course CRUD | Working | Keep in-repo for now |
| P1 | PSM public profiles + booking | In progress | Not required to sell courses |
| P1 | MotusAI chat + RAG | Working | Clinical disclaimers + rate limits |
| P2 | Video (Jitsi) | VPS + local configs | Separate from course sales |
| P2 | Smart wallets (ZeroDev) | Disabled / broken with WaaP | **Not required** for course sales |
| P3 | MNS / on-chain profiles | Partial | Nice-to-have |

**Production gate for course sales:** P0 only. Do not block Academy launch on ZeroDev, Jitsi split, or admin app extraction.

### 1.3 Non-goals (platform harmonize)

- Full microservices rewrite
- Metaverse / multi-app split in phase 1
- Deleting git history
- Force-push to `main`

---

## 2. File taxonomy (Layer 0 — nothing outside this)

```text
motusdao-hub/
├── AGENTS.md                      # Agent entry: Feng Shui + spec read order
├── README.md                      # Product + install (must match reality)
│
├── app/                           # Next.js App Router — user-facing product
├── components/                    # React UI by domain
├── lib/                           # Server + client logic by domain
├── prisma/                        # Schema + migrations + seed (NO .db files)
├── public/                        # Static assets
│
├── specs/                         # SDD truth — features + platform initiatives
├── docs/
│   ├── architecture/              # How the system works (durable)
│   └── runbooks/                  # Deploy, env, ops checklists
│
├── infra/                         # Phase 3c — optional split boundary
│   ├── jitsi/                     # Docker, VPS scripts, jitsi docs
│   └── contracts/                 # Hardhat, Solidity, MNS deploy scripts
│
├── scripts/                       # App ops only (seed, admin, smoke)
├── archive/                       # Historical incident + integration docs
│   ├── incidents/
│   ├── analysis/
│   └── integrations/
│
├── .cursor/                       # Agent hooks, MCP, rules
├── .github/workflows/             # CI (lint, tsc, prisma validate, build)
└── .agents/                       # Installed agent skills (vendor)
```

**Forbidden locations:** repo root for incident `.md`, `docs/` for FIX postmortems, committed `*.db`, duplicate config files.

---

## 3. Documentation — archive vs delete

### 3.1 Keep (move to durable locations)

| File | Destination |
|------|-------------|
| `docs/API_KEYS_CHECKLIST.md` | `docs/runbooks/` |
| `docs/SUPABASE_STORAGE_SETUP.md` | `docs/runbooks/` |
| `docs/VERCEL_DATABASE_SETUP.md` | `docs/runbooks/` |
| `docs/VERCEL_VIDEOCHAT_ENV.md` | `docs/runbooks/` |
| `docs/ADMIN_ACCESS_INSTRUCTIONS.md` | `docs/runbooks/` |
| `docs/ADMIN_DASHBOARD_SETUP.md` | `docs/runbooks/` |
| `docs/psm-intake-v1-spec.md` | `specs/psm-intake-v1.md` |
| `ROOT_AGENT_SDK_INTEGRATION.md` | `docs/architecture/root-agent.md` |
| `jitsi/README.md` + setup | `infra/jitsi/` (phase 3c) |

### 3.2 Archive (historical value, not agent truth)

Move to `archive/incidents/` or `archive/integrations/zerodev-wallet/`:

- All `docs/FIX_*`, `*TROUBLESHOOT*`, `DEBUG_*`, `DIAGNOSTICO_*`, `ENV_LOCAL_CORRECCION`
- All `docs/ZERODEV_*`, `WALLET_*`, `PAYMASTER_*`, `PIMLICO_*`, `TRANSAK_*`, `PRIVY_*`, `WAAP_*` (except `WAAP_MIGRATION_GUIDE` → archive, still useful historically)
- `docs/MVP_ANALYSIS_AND_NEXT_STEPS.md`, `COHESION_REPORT.md`, `QUESTIONS_FOR_WORKING_PROJECT.md`, `ADMIN_DASHBOARD_ANALYSIS.md`
- `BUG_REPORT_WAAP_SDK.md`, `MNS_FILES_CREATED.txt`

### 3.3 Safe to delete (no unique info)

After archiving, these are redundant if content is captured elsewhere:

| File | Reason |
|------|--------|
| `MNS_FILES_CREATED.txt` | Ephemeral file list |
| `docs/FIX_SUMMARY.md` | Superseded by git history |
| `docs/PAYMASTER_FIX_SUMMARY.md` | Duplicate of PAYMASTER_FIX |
| `docs/MNS_DEPLOYMENT_SUCCESS.md` | One-time celebration note |
| `utils/supabase/*` | Dead code (zero imports; use `lib/supabase-admin.ts`) |
| `hardhat.config.js` | Duplicate of `hardhat.config.cjs` |

**Do not delete** Jitsi or ZeroDev docs until archived — another dev (or future you) may need the integration context.

---

## 4. Wallet provider — provider-agnostic auth (Slice: `specs/auth-provider-agnostic.md`)

### 4.1 Problem

Forking the app per wallet vendor (Privy → WaaP → next) does not scale. The schema already anticipates the fix:

```prisma
model User {
  privyId            String?  @unique   // LEGACY — deprecate
  authProvider       AuthProvider?        // waap | privy | future
  authProviderId     String?              // vendor's user id
  eoaAddress         String   @unique     // canonical on-chain identity
  smartWalletAddress String?  @unique     // optional AA layer
}
```

### 4.2 Target architecture

```text
lib/wallet/
├── types.ts              # WalletUser, WalletSession, WalletProviderId
├── provider.ts           # interface WalletAuthProvider
├── index.ts              # useWallet() — app-facing hook
├── providers/
│   ├── waap.ts           # @human.tech/waap-sdk adapter
│   └── privy.ts          # optional future adapter
└── smart-account/
    ├── types.ts
    ├── zerodev.ts        # lazy-loaded; feature-flagged
    └── index.ts          # useSmartAccount() — only when enabled
```

**App code never imports** `@human.tech/waap-sdk` or `privy` directly — only `useWallet()`.

### 4.3 Identity resolution (server)

```text
Primary key:  User.id (cuid)
Login key:    eoaAddress (SIWE) + email
Vendor key:   authProvider + authProviderId (nullable, for vendor APIs)
Deprecated:   privyId → backfill into authProviderId, then drop column
```

### 4.4 Migration phases

| Phase | Work |
|-------|------|
| A | Add `lib/wallet/` facade; WaaP adapter wraps existing `WaaPProvider` |
| B | Replace `useWaaP()` in components with `useWallet()` |
| C | API routes: accept `authProvider` + `authProviderId`; stop requiring `privyId` |
| D | Data migration: `UPDATE users SET authProvider='waap', authProviderId=privyId WHERE privyId IS NOT NULL` |
| E | Remove `privyId` column; rename routes `sync-privy-id` → `sync-auth-id` |
| F | Document adding a new provider: implement `WalletAuthProvider`, register in `providers/` |

### 4.5 Acceptance criteria

1. No `privyId` in new code paths.
2. No `waapId` column — use `authProvider` + `authProviderId`.
3. Switching WaaP → another EOA provider requires **only** a new adapter file + env config.
4. `eoaAddress` remains the stable join key for SIWE sessions.

---

## 5. ZeroDev / smart wallets — keep, but opt-in and lazy

### 5.1 Current reality

- `NEXT_PUBLIC_ENABLE_ZERODEV=false` in `env.example` — correct default.
- `ZeroDevSmartWalletProvider` exists but is **not mounted** in `app/layout.tsx` today.
- `Topbar` imports `useSmartAccount()` — gets empty context unless provider is added elsewhere.
- WaaP gives **EOA only**; ZeroDev was built for Privy's embedded wallet flow.

### 5.2 Decision (LOCKED for harmonize)

| Question | Decision |
|----------|----------|
| Remove ZeroDev? | **No** — keep for future account abstraction |
| Load on every page? | **No** — lazy load only on routes that need it |
| Block Academy launch? | **No** |
| Topbar smart wallet UI? | Show only when `NEXT_PUBLIC_ENABLE_ZERODEV=true` AND user has smart account |

### 5.3 Target loading model

```text
app/layout.tsx
  └── WalletProviderWrapper (EOA — always, lightweight)

app/pagos/page.tsx, app/motus-names/page.tsx, app/perfil/page.tsx
  └── <SmartAccountProvider lazy>  (ZeroDev — only these routes)

components/layout/Topbar.tsx
  └── Remove useSmartAccount() OR gate behind feature flag + lazy chunk
```

### 5.4 Slice spec

Create `specs/smart-wallet-lazy-load.md` when implementing. Non-goals: fix ZeroDev + WaaP bundler integration in harmonize phase 1.

---

## 6. Monorepo vs separate repos

### 6.1 Recommendation matrix

| Subsystem | Now | Target | Why |
|-----------|-----|--------|-----|
| **Next.js Hub app** | `motusdao-hub` | Stay here | Product core |
| **Jitsi / video infra** | `jitsi/` in repo | **`infra/jitsi/` → separate repo** when VPS config stabilizes | Different deploy cycle, Docker, SSL, JWT secrets; industry norm is infra repo |
| **Solidity / MNS** | `contracts/` in repo | **`infra/contracts/` in-repo** for now; separate repo if another app needs same contracts | Low churn; Hardhat beside app is OK until second consumer |
| **Admin UI** | `app/admin/` | **Stay in-repo** until team pain | Shared auth, Prisma, components; split when admin ≠ product deploy cadence |
| **Academy** | In Hub | Stay | Locked in `specs/academy-platform-decision.md` |
| **MotusAI** | In Hub | Stay | Shares auth + RAG |

### 6.2 Jitsi split playbook (when ready)

1. New repo: `Motus-DAO/motusdao-jitsi` (or `motusdao-infra`)
2. Move: `jitsi/docker-compose.yml`, `setup.sh`, VPS scripts, JWT env templates
3. Hub keeps: `lib/jitsi-token.ts`, `app/api/jitsi/`, `app/videochat/` — **client only**
4. Runbook: `docs/runbooks/jitsi-vps.md` points to infra repo

**Do not split Jitsi in phase 1** — move to `infra/jitsi/` inside monorepo first (phase 3c).

### 6.3 Admin split — defer

Split admin when **any** of these is true:

- Different team owns admin vs product
- Admin needs separate Vercel project / domain (`admin.motusdao.org`)
- Admin bundle size hurts public Lighthouse scores

Until then: `app/admin/` + shared `components/admin/` is industry-acceptable for early-stage SaaS.

---

## 7. Agent workflow — keep Devin-style looping

### 7.1 Pattern (from `specs/README.md`)

```text
Pick spec → export MOTUS_ACTIVE_SPEC → MOTUS_QA_LOOP=1
  → RootRouter index_repo + select_context
  → implement one slice
  → QA gate (lint, tsc, criteria)
  → loop until green
```

### 7.2 Platform harmonize slices (use this doc as parent)

| Slice spec | Phase | Depends on |
|------------|-------|------------|
| `platform-harmonize.md` (this) | Parent | baseline tag |
| `harmonize-3a-git-hygiene.md` | 3a | baseline |
| `harmonize-3b-doc-taxonomy.md` | 3b | 3a |
| `harmonize-3d-ci-agents.md` | 3d | 3b |
| `auth-provider-agnostic.md` | Identity | 3d |
| `smart-wallet-lazy-load.md` | Perf | auth slice |
| `harmonize-3c-infra-boundary.md` | 3c | 3d (optional) |

Each child spec: copy `specs/_TEMPLATE.md`, ≤1 day scope, explicit non-goals.

### 7.3 AGENTS.md (create in phase 3d)

```markdown
Before creating or moving files, read https://rootrouter.motusdao.org/FENG-SHUI.md

Read order:
1. specs/platform-harmonize.md
2. Active slice spec (MOTUS_ACTIVE_SPEC)
3. specs/README.md

Workspace: /Users/main/MotusDAO-Hub-Psi/motusdao-hub
```

---

## 8. Git security — tracked artifacts (phase 3a)

### 8.1 What's wrong

| File | Risk | Severity |
|------|------|----------|
| `prisma/dev.db` | Local SQLite in git; schema snapshot leak | Medium |
| `prisma/prisma/dev.db` | Accidental duplicate | Low |
| `backups/pre_migration_*.json` | DB snapshot in tree | Medium |

These are **not** production Postgres data (prod uses `DATABASE_URL`), but they should never have been committed.

### 8.2 Fix (safe, do in phase 3a)

```bash
cd /Users/main/MotusDAO-Hub-Psi/motusdao-hub

# Stop tracking without deleting local files
git rm --cached prisma/dev.db prisma/prisma/dev.db
git rm --cached backups/pre_migration_20260623153000_snapshot.json

# Update .gitignore (add lines):
# prisma/*.db
# prisma/prisma/
# backups/

git add .gitignore
git commit -m "chore(security): untrack local SQLite and migration snapshots"
git push origin main
```

### 8.3 Secrets audit (human checklist)

- [ ] `.env` and `.env.local` are **not** tracked (`.gitignore` has `.env*` — verify with `git ls-files '.env*'`)
- [ ] No `DEPLOYER_PRIVATE_KEY` in committed files
- [ ] Rotate keys if any `.env` was ever committed in history (`git log -p -- '.env'`)
- [ ] Vercel env vars match `env.example` names
- [ ] Supabase service role key only server-side (`SUPABASE_SERVICE_ROLE_KEY`, no `NEXT_PUBLIC_`)

### 8.4 If secrets were committed in history

```bash
# Check history
git log --all --full-history -- '.env' '.env.local'

# If found: rotate ALL exposed keys immediately, then consider git-filter-repo
# Do NOT force-push main without team agreement
```

---

## 9. Data layer — Prisma Postgres vs Supabase

### 9.1 Who owns what

| System | Owns | Where it lives |
|--------|------|----------------|
| **Prisma → Postgres** | Users, profiles, PSM, academy, sessions, payments, matching, journal | Your `DATABASE_URL` host |
| **Supabase Storage** | Avatars, academy media, PSM intro videos | Supabase project buckets |
| **Supabase Postgres (RAG)** | `knowledge_chunks` embeddings for MotusAI | Same or separate Supabase project |
| **On-chain (Celo)** | MNS names, clinical profile NFTs | Celo network |

### 9.2 Where does Prisma Postgres live?

**Wherever `DATABASE_URL` points.** Common setups:

| Setup | `DATABASE_URL` host | Typical use |
|-------|-------------------|-------------|
| **Supabase Postgres** | `db.<project>.supabase.co` or pooler `aws-0-*.pooler.supabase.com` | You're likely here for Vercel prod |
| **Vercel Postgres / Neon** | `*.neon.tech` or Vercel storage | Alternative |
| **Local dev** | `localhost:5432` | Docker Postgres |
| **VPS** | Private IP / self-hosted Postgres | Full control, you manage backups |

**Supabase is two products in one project:**

1. **Managed Postgres** — Prisma connects via `DATABASE_URL` + `DIRECT_URL` (migrations use direct, app can use pooler).
2. **Storage + Auth + Realtime APIs** — Hub uses Storage + RAG tables; SIWE auth is custom (not Supabase Auth).

So: **you can use Supabase for Postgres AND storage in the same project**, or Postgres on Neon + Supabase only for storage. Check Vercel dashboard → Storage / env vars to see your actual host.

### 9.3 Verify your production DB (run locally)

```bash
# Redact password before sharing output
echo $DATABASE_URL | sed 's/:[^@]*@/:***@/'
```

Look for `supabase.co`, `neon.tech`, or a VPS IP.

### 9.4 Architecture doc to create (phase 3b)

`docs/architecture/data-layer.md` — one page with your actual hosts filled in.

---

## 10. Execution phases (ordered)

### Phase 3a — Git hygiene ⬅ start here

- Untrack `*.db`, backups
- Remove `hardhat.config.js`, `utils/supabase/`
- Verify `.env*` not tracked
- **Exit:** `git status` clean; build passes

### Phase 3b — Doc taxonomy

- Create `archive/`, `docs/runbooks/`, `docs/architecture/`
- Move/archive per section 3
- Move `psm-intake-v1-spec` → `specs/`
- Update `specs/README.md` references
- **Exit:** `docs/` ≤ 12 durable files

### Phase 3d — CI + AGENTS.md

- `.github/workflows/ci.yml`
- `AGENTS.md`
- Rewrite `README.md` (WaaP, real structure)
- Gate `app/api/debug/*` in production
- **Exit:** CI green on PR

### Phase — Auth provider agnostic

- `specs/auth-provider-agnostic.md` + implement `lib/wallet/`
- Deprecate `privyId`
- **Exit:** no new `privyId` references; migration applied

### Phase — Smart wallet lazy load

- Feature-flag Topbar ZeroDev UI
- Mount `SmartAccountProvider` only on pagos/motus-names/perfil
- **Exit:** Lighthouse / TTI improved on home + academy

### Phase 3c — Infra boundary (optional)

- `git mv jitsi infra/jitsi`, `contracts infra/contracts`
- Update Hardhat paths + npm scripts
- **Exit:** `mns:compile` works

---

## 11. Academy revenue readiness checklist

Before selling courses publicly:

- [ ] Baseline tag pushed (section 0)
- [ ] CI green
- [ ] Stripe webhooks tested on staging
- [ ] Enrollment + progress persistence verified on prod Postgres (not SQLite)
- [ ] Admin course publish flow documented in `docs/runbooks/academy-publish.md`
- [ ] Terms / privacy pages live
- [ ] Clinical disclaimer on MotusAI (if linked from Academy)
- [ ] `NEXT_PUBLIC_ENABLE_ZERODEV=false` in production
- [ ] Debug API routes disabled in production

**You can sell courses without:** Jitsi repo split, admin app split, smart wallets, MNS, or full doc archive.

---

## 12. Open decisions (human input required)

| # | Question | Default if no answer |
|---|----------|---------------------|
| 1 | Postgres host for prod? | Document after env audit |
| 2 | Delete vs archive only for incident docs? | Archive only (safer) |
| 3 | Jitsi separate repo now or after `infra/jitsi/` move? | After internal move |
| 4 | Keep Privy adapter stub for future multi-provider? | Yes, behind interface |
| 5 | Second wallet provider to plan for? | Document extension point only |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-01 | Initial platform harmonize SDD from Feng Shui inventory |

---

*Platform Harmonize · Layer 0 + SDD · MotusDAO Hub*
