# Documentation index

> Durable docs only. Historical debugging lives in `archive/` — **not** agent source of truth.

## Architecture (`docs/architecture/`)

| Doc | Purpose |
|-----|---------|
| [data-layer.md](./architecture/data-layer.md) | Supabase Postgres + Prisma + Storage + RAG |
| [root-agent.md](./architecture/root-agent.md) | Root Agent SDK integration |

## Runbooks (`docs/runbooks/`)

| Doc | Purpose |
|-----|---------|
| [API_KEYS_CHECKLIST.md](./runbooks/API_KEYS_CHECKLIST.md) | Required API keys |
| [SUPABASE_STORAGE_SETUP.md](./runbooks/SUPABASE_STORAGE_SETUP.md) | Storage buckets |
| [VERCEL_DATABASE_SETUP.md](./runbooks/VERCEL_DATABASE_SETUP.md) | Prod database on Vercel |
| [VERCEL_VIDEOCHAT_ENV.md](./runbooks/VERCEL_VIDEOCHAT_ENV.md) | Videochat env vars |
| [ADMIN_ACCESS_INSTRUCTIONS.md](./runbooks/ADMIN_ACCESS_INSTRUCTIONS.md) | Admin access |
| [ADMIN_DASHBOARD_SETUP.md](./runbooks/ADMIN_DASHBOARD_SETUP.md) | Admin dashboard setup |

## Feature specs

See [`specs/`](../specs/README.md) — SDD truth for features and platform work.

## Archived / infra (read-only reference)

| Location | Contents |
|----------|----------|
| `archive/incidents/` | Fix postmortems, troubleshooting notes |
| `archive/analysis/` | Point-in-time MVP/design analysis |
| `archive/integrations/zerodev-wallet/` | Wallet/paymaster integration history |
| `infra/jitsi/docs/` | Jitsi Docker and VPS setup |
| `infra/contracts/docs/` | MNS and contract deployment |
