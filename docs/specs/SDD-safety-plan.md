# SDD — Safety plan

> Status: **LOCKED** · Owner: product · Written: 21 Oct 2026
>
> Purpose: the sequence this repo follows for clinical safety. It decides what each kind of data is, which door to close first, and what the product may claim. It is a source review plus a product decision. It is not a penetration test and not a legal opinion.
>
> Feature slices that implement this plan still get their own spec under `specs/` before code. This file is the plan those slices must not contradict.
>
> Chat ownership, the optional saved transcript, portability, FHIR, RootRouter’s `store.json`, and enclaves are specified in [SDD-chat-data.md](./SDD-chat-data.md). They start after the slices below. They do not change those slices.

---

## 1. How to use this document

Work top to bottom. Do not start a later slice while an earlier slice is open, unless the earlier slice is blocked on something only a human can sign (a vendor contract, a DNS change, a hosting decision).

Two questions stay separate:

| Question | Answer lives in |
|---|---|
| Where can an outsider reach clinical, identity, or credentialed systems? | Section 5, slices 1–6 |
| What kind of writing is Bitácora, and what kind is Psychat? | Section 3, slice 7 and slice 2 |

Closing an outsider door is not the same as making a diary readable only by the person who wrote it.

---

## 2. Floors (do not use one lock for every floor)

The front door is the same for everyone: sign in with the wallet (SIWE). What happens after that depends on the data.

| Floor | Examples in this app | The right lock |
|---|---|---|
| Public on purpose | Psychologist name, photo, bio, specialties, price, open hours, course catalog | Publish only what a stranger should see. Keep phone, birthday, full license number, and patient data off that page. |
| Private, but the app must read it | Perfil, intake, matches, enrollments, payments records | SIWE plus an API check: the person, the matched professional, or an admin. Stored as normal text. Disk encryption. Motus can read it, because matching, booking, and receipts need the fields. |
| Money | Stripe course purchase, crypto payment record | Stripe signature. Chain receipt. A forged “I paid” request is the threat. |
| Live room | Video session between two matched people | A server we control, and a Hub token the media server actually enforces. |
| AI conversation | Psychat, onboarding intake chat | Consent before send. The model reads the words. The transcript is not a clinical note. |
| Personal journal | Bitácora | Wallet lock in the browser. The database stores scrambled text. Motus cannot read it. |
| Future clinical chart | Not built | The therapist who wrote the note can open, sign, and produce it. The patient’s wallet is the wrong key. |

Postgres via Prisma is the database. In production that database is Supabase Postgres. Supabase Storage is for files (avatars, academy media, documents). Do not put journal text or chat transcripts in a Storage bucket or in the Supabase client that ships with the anon key (`lib/supabase.ts`).

---

## 3. Decisions — LOCKED

1. **Bitácora is a diario personal.** It is not an expediente clínico (NOM-004-SSA3-2012) and it is not a US psychotherapy note (45 CFR 164.501). The screen says that. A matched psychologist does not see it unless the person later sends an explicit copy.
2. **The Bitácora promise, once slice 7 ships, is: only the wallet can open the text.** The server stores ciphertext and an IV. The key is derived in the browser from a second wallet signature, kept in memory, and wiped on sign-out, account change, or tab close. Losing the wallet key means losing the journal. The screen says that before the first save. Admins can see that a row exists. They cannot read the body.
3. **Psychat is an AI conversation plus a separate button that requests a human video session.** The thread is not a therapy note and not an expediente. It is not filed into a clinician chart automatically. The model does not decide diagnosis, risk, or treatment.
4. **Venice (or whichever provider `AI_PROVIDER` selects) sees the message in plaintext at request time.** A database that does not store the chat does not make the vendor blind. “End-to-end encrypted chat” is allowed only after the client encrypts to a verified enclave. Until then the honest line is: we name the provider, we require consent, and we do not keep a transcript unless a later spec says so.
5. **A future nota de evolución is a third store.** Date, time, the professional who wrote it, and the ability to produce the file. Client-side encryption to the patient’s wallet is the wrong tool for that file, for crisis notes staff must act on, and for the therapist’s own process notes.
6. **“Share this journal entry with my therapist” is a copy into the therapist-readable store.** It is out of scope until that store exists. The diary stays locked.
7. **Perfil, public schedule, assigned patients, academia, payments, and video are not the diary.** Do not encrypt them with the Bitácora key.
8. **Claims we do not make:** “HIPAA certified”, “GDPR compliant” as a badge, “expediente NOM-004”, or “only you can read this” while Postgres still stores plaintext. HIPAA attaches if a US patient’s or US clinician’s health data enters the hub. GDPR attaches if we offer this to people in the EEA. For the product as it stands, Mexico’s federal privacy law (sensitive health data, express consent, a privacy notice) is the nearer frame. NOM-004 applies when a consultorio keeps a real clinical file. This plan does not create that file.
9. **Crisis copy stays readable.** Emergency resources and the human-session request do not depend on decrypting Bitácora. A machine does not decide suicide risk, abuse reporting, or treatment. That matches Motus clinical policy: those decisions stay with a human.
10. **Outsider doors close before the diary lock.** Slice 1, then slice 2, then the rest of section 5. Slice 7 (Bitácora ciphertext) starts only after slices 1 and 2 are done.
11. **Two machines, two Jitsi configs.** Stock Jitsi applies `ENABLE_GUESTS` to every room on that server. Therapy and open meetings therefore run on different machines, with different secrets. Locked 22 Oct 2026.
    - **`vps-motusdao` (motusone) keeps only the private Jitsi.** `ENABLE_GUESTS=0`, `JWT_ALLOW_EMPTY=0`. Office and clinical rooms only. This machine checks Hub tokens. It does not create them. WorkAdventure and the open Jitsi do not stay on this box.
    - **`vps-brahma` receives the open Jitsi and the metaverse (WorkAdventure).** The metaverse is a lobby to explore the world. It is not a therapy product. No consultorios, no per-psychologist passwords, and no claim that a session there is care. If the map still has a video bubble, it uses the open Jitsi on this machine only. Its `JWT_APP_SECRET` is different, so a URL or token from brahma cannot open a room on motusdao.
    - **Therapy video is only the Hub room.** The matched patient and psychologist join from the app (`/videochat` and the office link). The Hub creates the token (`POST /api/jitsi/token`). The private Jitsi on `vps-motusdao` checks it. This is the path that stayed usable across ordinary computers. WorkAdventure plus Jitsi lagged with three people in the same call, so that combination is not how a session is delivered.
    - **Hostnames, locked 22 Oct 2026.** `jitsi.motusdao.org` stays on `vps-motusdao` and is the only domain for Hub therapy links. `meet.motusdao.org` is the open Jitsi on `vps-brahma` (open calls and any metaverse video room). `metaverso.motusdao.org` stays the WorkAdventure world and moves with it to `vps-brahma`. `livekit.motusdao.org` moves with the world: the working proximity bubbles are LiveKit, not Jitsi.
    - **Bubble settings that must be copied, not reinvented.** `MAX_PER_GROUP=4`, `MAX_USERS_FOR_WEBRTC=4`, `MINIMUM_DISTANCE=64`, `GROUP_RADIUS=48`, video bandwidth 150/600, screen-share 250/1000, `LIVEKIT_PIXEL_DENSITY=0.6666666666666666`, LiveKit codecs opus + H264, `use_external_ip: true`, TURN on UDP 3478 with `external-ip` set to the machine that actually runs Coturn. On brahma that IP is `169.58.172.120`. The private Jitsi secret stays on motusdao. The open Jitsi gets a different secret.
    - The repo today points the Hub at a single host, `jitsi.motusdao.org`, and the Docker default has guests on. Treat “public Jitsi” and “private Jitsi” on motusdao as two policies that must become two servers, not as two stacks this document has already found.

---

## 4. What the repo does today (21 Oct 2026)

Anchors, so a later slice does not rediscover them.

| Surface | What is true now | Anchor |
|---|---|---|
| Video default | Domain falls back to public `meet.jit.si`. Office rooms are `motusdao-office-{matchId}`. Public Jitsi does not enforce Hub tokens. | `lib/jitsi.ts` |
| Guest video | `POST /api/jitsi/guest-token` needs no account. Open PSM rooms get a guest token. Quick rooms, when enabled, get a moderator token. | `app/api/jitsi/token/route.ts`, `app/api/jitsi/guest-token/route.ts` |
| Clinical room token | Hub-issued tokens for clinical rooms check an active session for that user or PSM. That check does not bind a public Jitsi server. | `lib/jitsi-policies.ts` |
| Psychat | Page holds messages in React state. `POST /api/chat` requires no SIWE session and does not read `consentToAIProcessing`. The UI copy says Venice; the server uses `AI_PROVIDER` (default OpenAI). | `app/psychat/page.tsx`, `app/api/chat/route.ts`, `lib/ai-client.ts` |
| Intake chat | `POST /api/onboarding/ai-intake` has no session. The prompt tells the model to set AI consent as granted. | `app/api/onboarding/ai-intake/route.ts` |
| Onboarding write | `POST /api/onboarding/user` and `POST /api/onboarding/psm` store identity and clinical intake without SIWE. Terms, privacy, share-with-PSM, and matching consent default to `true`. AI consent defaults to `false`. | `app/api/onboarding/user/route.ts` |
| Bitácora | `JournalEntry.content` is plaintext. API: owner or admin. Matched PSM cannot read it. The page still uses a hardcoded user id. Edit creates a second row. | `prisma/schema.prisma`, `app/api/bitacora/route.ts`, `app/bitacora/page.tsx` |
| Caseload | Matched PSM receives email, phone, city, `problematica`, `tipoAtencion`, and wallet addresses. Not the journal. | `app/api/matching/psm/[psmId]/route.ts` |
| Contact inbox | `GET /api/contact` lists messages with no admin check. | `app/api/contact/route.ts` |
| Spend | Faucet, Pimlico paymaster and bundler, and Ripio widget token do not require a session. | `app/api/faucet/route.ts`, `app/api/pimlico/`, `app/api/ripio/widget-token/route.ts` |
| Middleware | Every `/api` path is allowed through. Each route must check the session itself. | `middleware.ts` |
| What already holds | Journal, profile, session, and match routes check the caller. Admin routes use the admin guard. Stripe webhooks verify the signature. Public PSM pages mask the license number and require approval. Dev admin bypass and the debug user directory are off when `NODE_ENV` is production. Session cookies are `httpOnly`. SIWE checks the signature and consumes a nonce. | `lib/auth/guards.ts`, `app/api/stripe/webhook/route.ts` |
| Not built | Therapist progress notes, SOAP, treatment plans, expediente, stored session transcripts, consent enforcement before inference, user export, user self-delete. | — |

---

## 5. Order of work

### Slice 1 — Therapy rooms on a server we control

**Delivers:** a live therapy session cannot be joined on public `meet.jit.si`, or on the open server, by someone who only knows the room name.

- `vps-motusdao` runs only the private Jitsi. Guests off. A join with no Hub JWT is refused. WorkAdventure is removed from this machine after it is serving on `vps-brahma`.
- `vps-brahma` runs the open Jitsi and WorkAdventure as a lobby. No therapy room is configured there.
- The two Jitsi stacks use different secrets. The Hub, not either VPS, mints tokens. Therapy URLs use only the motusdao domain. Any non-therapy meeting URL uses only the brahma domain.
- The code default is no longer public `meet.jit.si` for any build that can carry a matched session.
- Guest tokens and quick rooms are never issued for an office or clinical room.
- Document both domains in `docs/runbooks/VERCEL_VIDEOCHAT_ENV.md` so a missing variable fails closed rather than falling back to `meet.jit.si`.

**Non-goals:** no Bitácora encryption. No change to Jitsi branding beyond what the token enforcement needs. No therapy inside WorkAdventure. No Supabase usernames for metaverse consultorios. No `jitsiUrl` from the map to the private server.

**Acceptance**

1. Given a production-like env with no `NEXT_PUBLIC_JITSI_DOMAIN`, when the app builds a therapy room URL, then it does not point at `meet.jit.si`.
2. Given a room name and no Hub token, when a client opens the media server, then the server refuses the join.
3. Given quick rooms disabled, when `POST /api/jitsi/guest-token` is called for a quick room, then the response is 403.
4. Given an office room, when a caller who is not the patient, the PSM, or an admin asks for a token, then the response is 403.

### Slice 2 — Session and consent in front of AI

**Delivers:** clinical text does not leave the app unless the person is signed in and has already agreed.

- `POST /api/chat` and `POST /api/onboarding/ai-intake` call `requireSession`.
- Both refuse the call unless `consentToAIProcessing` is already stored as true for that user. The model is not asked to set that flag.
- Client-supplied `system` messages are dropped. The server owns the system prompt.
- The Psychat screen names the provider actually configured (`AI_PROVIDER`), says the message is processed in plaintext, and says the chat is not a therapy note and not emergency care.
- The thread stays in the browser for that visit. It is not written to Postgres.
- Crisis language on the screen points at local emergency resources and the existing human-session request. The model does not write a risk decision.

**Non-goals:** no transcript archive in this slice. A later opt-in archive is specified in [SDD-chat-data.md](./SDD-chat-data.md) and does not start here. No Venice enclave / E2EE mode. No automatic handoff of the thread to a therapist.

**Acceptance**

1. Given no session cookie, when `POST /api/chat` is called, then the response is 401 and the provider is not called.
2. Given a session and `consentToAIProcessing` false, when `POST /api/chat` is called, then the response is 403 and the provider is not called.
3. Given a client message with `role: "system"`, when the route builds the provider payload, then that message is absent.
4. Given the Psychat page, when it renders, then the provider name matches `AI_PROVIDER` and the page states that this is not an expediente.

### Slice 3 — Onboarding writes require the wallet

**Delivers:** intake rows are created only for the signed-in wallet, and consent is an affirmative act.

- `POST /api/onboarding/user` and `POST /api/onboarding/psm` require a SIWE session. The wallet in the body must match the session.
- `consentToTerms`, `consentToPrivacy`, `consentToShareWithPSM`, and `consentToClinicalMatching` default to `false`. A required consent that is missing or false rejects the write.
- `consentToAIProcessing` stays default `false`. Slice 2 is what consults it.

**Non-goals:** no redesign of the onboarding UI beyond the consent controls this slice needs. Public therapist pages stay hidden until admin approval.

**Acceptance**

1. Given no session, when either onboarding POST runs, then the response is 401 and no user row is created.
2. Given a session for wallet A and a body for wallet B, when the POST runs, then the response is 403.
3. Given omitted consent fields, when the body is parsed, then those flags are false and the write is rejected.

### Slice 4 — Inbox and platform keys

**Delivers:** listing messages and spending platform credentials require a session.

- `GET /api/contact` requires an admin session. `POST` stays public and gains a rate limit.
- `POST /api/faucet` is absent in production, or requires a session and a durable per-account cap.
- `POST /api/pimlico/paymaster` and `POST /api/pimlico/bundler` require a session and an allowlist of methods.
- `POST /api/ripio/widget-token` requires a session and binds the address to that session.

**Non-goals:** no change to Stripe. No change to on-chain payment records.

**Acceptance**

1. Given no admin session, when `GET /api/contact` runs, then the response is 401 or 403 and the body has no messages.
2. Given production, when `POST /api/faucet` is called with no session, then it does not send CELO.
3. Given no session, when the Pimlico proxy or Ripio token route is called, then the response is 401 and the upstream credential is not used.

### Slice 5 — Admin session and audit

**Delivers:** a revoked admin loses access on the next request, and a failed audit write fails the clinical request.

- `requireAdmin` re-reads `role` and `isPlatformAdmin` from the database on every admin call.
- Clinical session lifetime is shorter than seven days, with an idle expiry. The exact duration is chosen in the slice spec before coding.
- `recordClinicalAccess` failure fails the request. It does not swallow the error and continue.
- SIWE domain is compared to an allowlist (`NEXT_PUBLIC_APP_URL` and explicit extra hosts). It is not taken from a raw `x-forwarded-host`.

**Non-goals:** no MFA product in this slice. The January 2025 HHS proposal is not the rule in force; do not block the slice on it.

**Acceptance**

1. Given a JWT that still says `isPlatformAdmin: true` and a database row that says false, when an admin route runs, then the response is 403.
2. Given a forced audit-write failure, when a journal or profile write runs, then the response is 500 and the clinical write is not committed.
3. Given a SIWE message whose domain is not on the allowlist, when verify runs, then the response is 401.

### Slice 6 — Program gap (human, not only code)

**Delivers:** a written vendor list and a decision about which regimes apply to production data. Code export and deletion can follow in a later spec.

Before treating production rows as a clinical system for US or EEA users:

- Name every processor that can receive health text, audio, or identifiers: Venice or OpenAI, the Jitsi host, Supabase, Vercel, PostHog, IPFS for profile NFT metadata.
- Sign the contract that matches the regime you are actually in (business-associate agreement for US ePHI, Article 28 terms for EEA health data). Do not sign them as decoration for a Mexico-only launch.
- Write the privacy notice in Spanish: what is sensitive, why it is processed, how long it is kept, and how a person asks for access, correction, or deletion.
- IPFS metadata (wallet, role, registration date) cannot be erased. The notice says that. Postgres deletion still has to exist before we promise erasure of the journal, intake, or profile.

**Non-goals:** this slice does not implement Bitácora encryption and does not create an expediente.

### Slice 7 — Bitácora as safe notes

Start only after slices 1 and 2 are done.

**Delivers:** the signed-in person can write a journal entry that Motus cannot read, and can open it again on another device with the same wallet.

- The page uses the SIWE user id. Remove `MOCK_USER_ID`.
- The screen is labeled as a personal journal. Copy states that it is not the clinical file, that a matched therapist cannot see it, and that a lost wallet key means a lost journal.
- Encrypt in the browser (Web Crypto, AES-GCM) before `POST`. Additional authenticated data is the lowercased `eoaAddress`. Purpose string `motus-safe-notes`, `keyVersion` 1.
- The second signature is the key derivation. It is not the SIWE login signature.
- Persist ciphertext and IV on `journal_entries` (or a successor table if a migration must drop the plaintext column). No plaintext `content` column after the migration. Existing plaintext rows are encrypted once by the owner on next unlock, or left unreadable and exported to the owner before the column is dropped. The slice spec chooses one of those two and writes the rollback.
- `GET` returns ciphertext to the owner only. Admin list returns id and timestamps, not a decrypt path.
- Edit updates the same row. It does not create a second row.
- Mood and tags, if they stay, are inside the encrypted payload. A mood chart that Motus can read is out of scope.

**Non-goals:** no share-with-therapist. No recovery key held by Motus. No Supabase Storage. No change to `PatientProfile`.

**Acceptance**

1. Given a signed-in user, when they save an entry, then the database row has no copy of the sentence they typed.
2. Given another user’s session, when they `GET` the first user’s notes, then the response is 403.
3. Given an admin session, when they list notes, then the body text is absent.
4. Given the same wallet on a second browser, when they sign the unlock message, then the entry decrypts to the original text.
5. Given a ciphertext copied onto another account, when that account tries to decrypt, then decryption fails.
6. Given the user cancels the unlock signature, when the page settles, then it shows no note text and no error banner that leaks content.

---

## 6. Explicitly out of scope for this plan

- Encrypting perfil, intake, matches, academy, payments, or video with the Bitácora key.
- Building notas de evolución, SOAP notes, or an expediente.
- Turning Psychat into a clinician.
- Selling or delivering therapy inside the metaverse. The world is a lobby. The session is the Hub video room on the private Jitsi.
- Lit Protocol, a second database, or a browser-only journal with no server copy.
- Claiming compliance because disk encryption is on.

---

## 7. Exit

This plan is followed when slices 1–5 meet their acceptance criteria, slice 6 has a vendor list and a privacy notice a human has accepted, and slice 7 meets its acceptance criteria. A slice is done only when its own `specs/` file is green under the repo QA gate (`npm run lint`, `npx tsc --noEmit`, and the checks named in that slice).

If production `NEXT_PUBLIC_JITSI_DOMAIN` is already the Motus server, slice 1 still removes the `meet.jit.si` fallback and confirms the media server rejects a join without the Hub token. Intent in a runbook is not a control.

---

## 8. Sources for the locked split

Reviewed 21 Oct 2026 against this repo and public rules. Use them to avoid collapsing the floors. Do not treat this list as legal advice.

- HIPAA psychotherapy notes, 45 CFR 164.501, and the extra authorization rule in 45 CFR 164.508. The patient journal is not that note.
- NOM-004-SSA3-2012 expediente clínico. Bitácora and Psychat are not that file. A future nota de evolución would be.
- LFPDPPP (text in force after the 20 March 2025 law and the 14 November 2025 reform): health data is sensitive and needs express consent.
- SimplePractice, TherapyNotes, Mentalyc, Upheal, Heidi: the chart is readable by the treating clinician. “Encrypted” there means the vendor holds the key. That pattern is correct for a future chart and wrong for the diary promise in slice 7.
- Venice privacy modes: Private mode is a no-retention contract, not end-to-end encryption.
- Attack-surface register that set slices 1–6: canvas “Attack surface for a clinical hub”, 21 Oct 2026. The doors in section 4 and section 5 are the ones that register named.
