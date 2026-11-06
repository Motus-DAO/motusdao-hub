# Documentation index

> Durable docs only. Historical debugging and dated snapshots live in `archive/` or are marked
> as historical — **not** agent source of truth. Current state: [specs/STATUS.md](../specs/STATUS.md).

## Start here

| Doc | Purpose |
|-----|---------|
| [specs/STATUS.md](../specs/STATUS.md) | Shipped / in flight / next; the only status dashboard |
| [specs/platform-harmonize.md](../specs/platform-harmonize.md) | Taxonomy, phases, platform decisions |
| [specs/README.md](../specs/README.md) | Slice loop, QA gate, Definition of Done |
| [AGENTS.md](../AGENTS.md) | Read order for agents |

## Architecture (`docs/architecture/`)

| Doc | Purpose |
|-----|---------|
| [data-layer.md](./architecture/data-layer.md) | Supabase Postgres + Prisma + Storage + RAG |
| [root-agent.md](./architecture/root-agent.md) | Root Agent SDK integration |
| [glass-surfaces.md](./architecture/glass-surfaces.md) | Glass UI surfaces and theme tokens |
| [safe-notes-export.md](./architecture/safe-notes-export.md) | Bitácora export package + key recipe |
| [psychat-archive-export.md](./architecture/psychat-archive-export.md) | Encrypted Psychat archive |
| [consented-summary-fhir.md](./architecture/consented-summary-fhir.md) | FHIR `DocumentReference` summary |
| [training-copy-consent.md](./architecture/training-copy-consent.md) | Consented training copy + compensation |
| [psychat-rootrouter-context.md](./architecture/psychat-rootrouter-context.md) | Optional local RootRouter working memory |
| [psychat-enclave-phala-decision.md](./architecture/psychat-enclave-phala-decision.md) | Phala enclave decision (fases 2–3) |
| [psychat-supervisor-product.md](./architecture/psychat-supervisor-product.md) | Psychat PSM product contract |
| [psychat-clinical-device-canonical/](./architecture/psychat-clinical-device-canonical/README.md) | Canonical clinical prompt captures (pinned commits) |

## Chat-data track (slices 1–5)

User + engineering index: **[chat-data/README.md](./chat-data/README.md)**

User guide: [guides/psychat-memoria-contexto-es.md](./guides/psychat-memoria-contexto-es.md) ·
App: `/psychat/memoria-contexto`

## Compliance (`docs/compliance/`)

Legal sources for `/privacy`, `/terms`, `/cookies`, `/subprocesadores`, plus beta debt:

- [compliance/README.md](./compliance/README.md)
- [legal/aviso-de-privacidad-integral.md](./compliance/legal/aviso-de-privacidad-integral.md)
- [processors-inventory.md](./compliance/processors-inventory.md)
- [pendientes-post-beta.md](./compliance/pendientes-post-beta.md)
- [regimen-tratamiento-datos.md](./compliance/regimen-tratamiento-datos.md)
- [ipfs-storage-audit.md](./compliance/ipfs-storage-audit.md)

## Runbooks (`docs/runbooks/`)

| Doc | Purpose |
|-----|---------|
| [API_KEYS_CHECKLIST.md](./runbooks/API_KEYS_CHECKLIST.md) | Required API keys |
| [SUPABASE_STORAGE_SETUP.md](./runbooks/SUPABASE_STORAGE_SETUP.md) | Storage buckets |
| [VERCEL_DATABASE_SETUP.md](./runbooks/VERCEL_DATABASE_SETUP.md) | Prod database on Vercel |
| [VERCEL_VIDEOCHAT_ENV.md](./runbooks/VERCEL_VIDEOCHAT_ENV.md) | Private Jitsi + video env vars |
| [ADMIN_ACCESS_INSTRUCTIONS.md](./runbooks/ADMIN_ACCESS_INSTRUCTIONS.md) | Admin access |
| [ADMIN_DASHBOARD_SETUP.md](./runbooks/ADMIN_DASHBOARD_SETUP.md) | Admin dashboard setup |
| [academy-content-rewrite.md](./runbooks/academy-content-rewrite.md) | Seed ↔ DB ↔ admin: rewrite course blocks |
| [security-patching.md](./runbooks/security-patching.md) | Oct-2026 Next/React/Node/PostHog patch record + remaining debt |

## Plans (SDD)

- [specs/SDD-safety-plan.md](./specs/SDD-safety-plan.md) — clinical-safety plan (LOCKED; §4 is a
  historical snapshot from 21-oct-2026)
- [specs/SDD-chat-data.md](./specs/SDD-chat-data.md) — chat data, portability, FHIR, enclaves

## Historical / reference

| Location | Contents |
|----------|----------|
| `archive/incidents/` | Fix postmortems, troubleshooting notes |
| `archive/analysis/` | Point-in-time MVP/design analysis |
| `archive/integrations/zerodev-wallet/` | Wallet/paymaster integration history |
| [research/current-state-data-inventory.md](./research/current-state-data-inventory.md) | Inventory snapshot (historical) |
| `infra/jitsi/docs/` | Jitsi Docker and VPS setup |
| `infra/contracts/docs/` | MNS and contract deployment |
