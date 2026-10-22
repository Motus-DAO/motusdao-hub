# Vercel env vars — Videochat (Jitsi)

The Hub mints tokens. It does not host the media servers. Those servers are already split. Do not move them.

| Host | Machine | What it is |
|------|---------|------------|
| `jitsi.motusdao.org` | `vps-motusdao` | Private Jitsi. Office and clinical rooms only. |
| `meet.motusdao.org` | `vps-brahma` | Open Jitsi. Not therapy. |
| `metaverso.motusdao.org` | `vps-brahma` | WorkAdventure. Not therapy. |

A therapy link is only `https://jitsi.motusdao.org/{room}`. The Hub does not read `NEXT_PUBLIC_JITSI_DOMAIN` to choose that host. If the variable is missing, or set to `meet.jit.si`, the therapy URL still uses `jitsi.motusdao.org`. `meet.jit.si` is not a therapy server.

Open, quick, and metaverse room links use only `meet.motusdao.org`.

---

## Fail closed

| Missing or wrong value | What the Hub does |
|------------------------|-------------------|
| `NEXT_PUBLIC_JITSI_DOMAIN` unset or `meet.jit.si` | Therapy stays on `jitsi.motusdao.org`. It does not fall back to public Jitsi. |
| `JITSI_APP_ID` or `JITSI_APP_SECRET` unset | Therapy token route returns 500. No token is signed. |
| `JITSI_OPEN_APP_ID` or `JITSI_OPEN_APP_SECRET` unset | Open-meeting token returns 500. It does not reuse the therapy secret. |
| Open secret equal to the therapy secret | The Hub refuses to sign the open token. |
| Room name is not office, clinical, open, quick, or metaverse | No URL and no embed. |

The private server must keep `ENABLE_GUESTS=0` and `JWT_ALLOW_EMPTY=0`. A browser that opens `jitsi.motusdao.org` with only a room name is refused. The Hub also refuses to start the embed, or a native meeting window, unless it has a JWT for that room.

---

## Secrets

Two secrets. The Hub creates the tokens. Each server only checks its own.

| Vercel (Hub) | Server | Room |
|--------------|--------|------|
| `JITSI_APP_ID` / `JITSI_APP_SECRET` | `jitsi.motusdao.org` `JWT_APP_ID` / `JWT_APP_SECRET` | Office and clinical |
| `JITSI_OPEN_APP_ID` / `JITSI_OPEN_APP_SECRET` | `meet.motusdao.org` `JWT_APP_ID` / `JWT_APP_SECRET` | Open, quick, metaverse |

The two `JWT_APP_SECRET` values are different. A token from `meet.motusdao.org` does not open a room on `jitsi.motusdao.org`.

`jitsi/docker-compose.yml` in this repo is the private stack. Its default is `ENABLE_GUESTS=0`. It is not the compose file for `meet.motusdao.org`.

---

## Vercel

1. Vercel → project → **Settings** → **Environment Variables**
2. Enable **Production** (and **Preview** if you test preview URLs)
3. Add the rows below, or import `vercel-videochat.env.template` after filling the `PASTE_*` lines. Do not commit the filled file.

### Required

```env
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=PASTE_PRIVATE_JITSI_JWT_APP_SECRET
JITSI_OPEN_APP_ID=motusdao-open
JITSI_OPEN_APP_SECRET=PASTE_OPEN_JITSI_JWT_APP_SECRET_DIFFERENT_FROM_THERAPY

AUTH_SECRET=PASTE_FROM_ENV_LOCAL
NEXT_PUBLIC_APP_URL=https://YOUR-VERCEL-OR-CUSTOM-DOMAIN
DATABASE_URL=PASTE_FROM_ENV_LOCAL
```

Use the real production URL for `NEXT_PUBLIC_APP_URL`, with no trailing slash.

### Room prefixes

```env
NEXT_PUBLIC_JITSI_OFFICE_PREFIX=motusdao-office-
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-sess-
NEXT_PUBLIC_JITSI_METAVERSE_PREFIX=motusdao-meta-
NEXT_PUBLIC_JITSI_OPEN_PREFIX=motusdao-open-
```

Quick rooms stay off unless a sandbox explicitly sets `NEXT_PUBLIC_JITSI_QUICK_ROOMS=true`. While that flag is off, `POST /api/jitsi/guest-token` for a quick room returns 403.

`NEXT_PUBLIC_*` values are baked in at build time. Redeploy after changing them. The therapy host does not come from one of these variables.

---

## Private server checklist

On `vps-motusdao`, for `jitsi.motusdao.org` only:

```env
PUBLIC_URL=https://jitsi.motusdao.org
JWT_APP_ID=motusdao
JWT_APP_SECRET=<same as Vercel JITSI_APP_SECRET>
ENABLE_AUTH=1
AUTH_TYPE=jwt
ENABLE_GUESTS=0
JWT_ALLOW_EMPTY=0
```

This runbook does not move WorkAdventure or the open Jitsi. They already run on `vps-brahma`.

---

## Quick test

1. Open a consultorio link from **Perfil**. The host in the page is `jitsi.motusdao.org`.
2. Open `https://YOUR-DOMAIN/videochat?url=https://meet.jit.si/motusdao-office-SOME_MATCH`. The page rewrites the host to `jitsi.motusdao.org` and does not start video until `/api/jitsi/token` returns a JWT.
3. `POST /api/jitsi/guest-token` with an office or clinical room name returns 403.

| Error | Fix |
|-------|-----|
| `Jitsi JWT no está configurado` | Add `JITSI_APP_ID` and `JITSI_APP_SECRET` on Vercel |
| `Jitsi abierto no está configurado` | Add `JITSI_OPEN_APP_ID` and `JITSI_OPEN_APP_SECRET` |
| `El secreto del Jitsi abierto no puede ser el de terapia` | Use a different secret on `meet.motusdao.org` |
| JWT rejected / cannot join room | Hub secret ≠ that server's `JWT_APP_SECRET` |
| Room opens on `meet.jit.si` | The Hub build is old. Therapy no longer uses that host. |
