# Vercel env vars — Videochat (Jitsi)

Use this when deploying the Hub to Vercel with the new `/videochat` flow.

## Vercel or VPS?

You need **both**, for different jobs:

| Piece | Where | Why |
|-------|--------|-----|
| **Next.js app** (pages, `/api/jitsi/token`, `/videochat`) | **Vercel** | Already set up; easy deploys; no Docker |
| **Jitsi server** (video/audio, Prosody, JVB) | **Your VPS** | Docker 24/7; Vercel cannot run Jitsi |

**Do not move the whole app to the VPS** unless you want to manage Node, SSL, and deploys yourself. Keep the app on Vercel and Jitsi on the VPS (`jitsi.motusdao.org`).

---

## Step 1 — Copy values from your machine

Open these two files locally:

1. **`motusdao-hub/.env.local`** — Hub values (domain, prefixes, JWT for Vercel)
2. **`motusdao-hub/jitsi/.env`** on your VPS (or local Jitsi) — Jitsi server values

**Critical rule:** these two must match:

| Vercel (Hub) | Jitsi server (`jitsi/.env`) |
|--------------|-----------------------------|
| `JITSI_APP_ID` | `JWT_APP_ID` |
| `JITSI_APP_SECRET` | `JWT_APP_SECRET` |

If they differ, you get JWT / auth errors in videochat.

---

## Step 2 — Add in Vercel

1. Vercel → your project → **Settings** → **Environment Variables**
2. Enable **Production** (and **Preview** if you test preview URLs)
3. Add each row below (or use **Import .env** with the template file in this repo)

### Required for videochat

```env
NEXT_PUBLIC_JITSI_DOMAIN=jitsi.motusdao.org
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=PASTE_SAME_VALUE_AS_JITSI_JWT_APP_SECRET
```

### Recommended (room prefixes — match your `.env.local`)

```env
NEXT_PUBLIC_JITSI_OFFICE_PREFIX=motusdao-office-
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-sess-
NEXT_PUBLIC_JITSI_METAVERSE_PREFIX=motusdao-meta-
NEXT_PUBLIC_JITSI_OPEN_PREFIX=motusdao-open-
```

### Required for `/api/jitsi/token` (login + JWT issuance)

You likely already have these; videochat breaks without them:

```env
AUTH_SECRET=PASTE_FROM_ENV_LOCAL
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-OR-CUSTOM-DOMAIN
DATABASE_URL=PASTE_FROM_ENV_LOCAL
```

Use your real production URL for `NEXT_PUBLIC_APP_URL`, e.g. `https://hub.motusdao.org` (no trailing slash).

---

## Step 3 — Redeploy

After saving env vars:

- **Deployments** → latest deployment → **Redeploy** (or push a commit)

`NEXT_PUBLIC_*` vars are baked in at build time — a redeploy is required after changing them.

---

## Step 4 — Quick test

1. Open `https://YOUR-DOMAIN/videochat` (logged in)
2. Or open a consultorio link from **Perfil**
3. If token fails, check Vercel **Functions** logs for `/api/jitsi/token`

Common errors:

| Error | Fix |
|-------|-----|
| `Jitsi JWT no está configurado` | Add `JITSI_APP_ID` + `JITSI_APP_SECRET` on Vercel |
| JWT rejected / cannot join room | `JITSI_APP_SECRET` ≠ Jitsi `JWT_APP_SECRET` |
| Wrong Jitsi UI / 5 min limit | `NEXT_PUBLIC_JITSI_DOMAIN` still points at `meet.jit.si` or wrong host |

---

## Bulk import template

Copy `vercel-videochat.env.template` from the repo root, fill in the `PASTE_*` lines from `.env.local`, then in Vercel use **Import .env** (do not commit the filled file).

---

## VPS checklist (Jitsi only)

On the server where Jitsi runs (`~/apps/jitsi` or `motusdao-hub/jitsi`):

```env
PUBLIC_URL=https://jitsi.motusdao.org
JWT_APP_ID=motusdao
JWT_APP_SECRET=<same as Vercel JITSI_APP_SECRET>
ENABLE_AUTH=1
ENABLE_GUESTS=1
```

Then:

```bash
docker compose up -d
# after policy changes:
docker compose up -d --force-recreate --no-deps prosody jicofo
```

See `jitsi/README.md` for branding and `token_affiliation` (moderator vs guest).
