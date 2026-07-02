# Data layer — MotusDAO Hub

> Status: **LOCKED** · Owner: product + eng · Date: 2026-07-01
>
> One source of truth for where data lives. **There is no separate “Prisma database.”**
> Prisma is the ORM; Postgres is hosted in **Supabase**.

---

## Decision summary

| Question | Answer |
|----------|--------|
| Where is Postgres? | **Supabase** (same project as Storage) |
| What is Prisma? | TypeScript ORM + migrations — talks to Supabase Postgres via `DATABASE_URL` |
| Do we need a Prisma Cloud account? | **No** — only `@prisma/client` in the app |
| Separate Neon / VPS Postgres? | **No** — Supabase-only for this app |

---

## Architecture

```text
                    ┌─────────────────────────────────────┐
                    │     Supabase project (one)          │
                    │  ryjkpaiknsnjyydxwugl.supabase.co   │
                    ├─────────────────────────────────────┤
                    │  Postgres                           │
                    │    ↑ Prisma (users, academy, PSM…)  │
                    │    ↑ Supabase RPC (RAG embeddings)  │
                    ├─────────────────────────────────────┤
                    │  Storage buckets                      │
                    │    ↑ lib/storage.ts (media uploads)   │
                    └─────────────────────────────────────┘

        On-chain (Celo) — separate: MNS, profile NFTs via Hardhat/viem
```

---

## Connection strings (Vercel + local)

| Env var | Purpose | Supabase form |
|---------|---------|---------------|
| `DATABASE_URL` | App runtime queries (pooled) | `postgresql://postgres.<ref>:...@aws-0-….pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Prisma migrations (`prisma migrate`) | `postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | Storage + client SDK | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe Storage access | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Storage + RAG RPC | **Never** expose as `NEXT_PUBLIC_` |

Get both URLs from **Supabase Dashboard → Project Settings → Database → Connection string** (URI + “Use connection pooling” toggle).

---

## What uses what

| Data | Access layer | Tables / buckets |
|------|--------------|------------------|
| Users, onboarding, PSM profiles | **Prisma** | `users`, `psm_profiles`, `patient_profiles`, … |
| Academy courses, enrollments, progress | **Prisma** | `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress` |
| Sessions, matching, payments | **Prisma** | `sessions`, `matches`, `orders`, `payments`, … |
| Journal (bitácora) | **Prisma** | `journal_entries` |
| Avatars, course media, intro videos | **Supabase Storage** | `lib/storage.ts` buckets |
| MotusAI knowledge RAG | **Supabase Postgres + RPC** | `match_knowledge_chunks` via `lib/motus-knowledge.ts` |
| SIWE auth nonces | **Prisma** | `auth_nonces` |
| Motus Names / NFTs | **On-chain** | Celo contracts |

---

## Dashboards you actually use

| Tool | URL | Use for |
|------|-----|---------|
| **Supabase** | [supabase.com/dashboard](https://supabase.com/dashboard) | Postgres table browser, Storage files, SQL editor, API keys |
| **Prisma Studio** | `npm run db:studio` | Local visual editor (connects to same Supabase Postgres) |
| **Vercel** | Project → Settings → Environment Variables | Prod `DATABASE_URL`, `DIRECT_URL`, Supabase keys |

You do **not** need prisma.io/cloud for this setup.

---

## Common workflows

### Schema change (new field / table)

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name describe_change

# 3. Deploy to prod (CI or manual)
npx prisma migrate deploy
```

Migrations run against `DIRECT_URL` (port 5432, not pooler).

### Seed dev data

```bash
npm run db:seed
```

### Browse data visually

```bash
npm run db:studio
```

Opens Prisma Studio pointed at your `DATABASE_URL` (same Supabase Postgres).

### Upload media

App code uses `getSupabaseAdmin()` in `lib/supabase-admin.ts` — not Prisma.

---

## Local dev — do not commit SQLite

Historical mistake: `prisma/dev.db` was committed. **Local dev should use Supabase** (free tier) or Docker Postgres with the same `DATABASE_URL` pattern.

`.gitignore` now blocks `prisma/*.db`.

---

## RAG note

`lib/motus-knowledge.ts` uses Supabase RPC `match_knowledge_chunks`. Those tables/functions live in **the same Supabase Postgres** but are accessed via the Supabase JS client + service role, not Prisma models. That is intentional (pgvector + RPC).

---

## Related docs

- `env.example` — all variable names
- `docs/runbooks/VERCEL_DATABASE_SETUP.md` — deploy checklist
- `specs/platform-harmonize.md` — platform SDD

---

*Data layer · Supabase Postgres + Prisma ORM · MotusDAO Hub*
