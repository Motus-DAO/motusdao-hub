# Identity · Safari connect routing (WaaP bypass)

**Status:** **LOCKED** (architecture); implementation **Next** (slice I6)  
**Parent:** [identity-waap-thirdweb-siwe-multilink.md](./identity-waap-thirdweb-siwe-multilink.md)  
**Last updated:** 2026-11-17

---

## 1. Problem (observed)

On **iOS Safari** (and possibly iPadOS Safari), the **Human / WaaP embed login modal** misbehaves:

1. User taps **Iniciar sesión** → Human modal opens.
2. User taps Google or another option inside the modal → selection highlights but **flow does not advance**.
3. User cannot go back or forward; **only closing the modal** recovers.
4. Suspected cause: **third-party iframe / embed limitations in Safari** (ITP, focus, postMessage), not necessarily a logic bug in Hub code alone.

**Impact:** first-time users and investors on iPhone Safari hit a **dead end** if Human is the only path. Telling them to “use Chrome” is unacceptable for demos and adoption.

---

## 2. Product goal (same as parent program)

- **Canonical identity:** `userId` via **SIWE** (unchanged).
- **Multiple linked EOAs**; one **payment default** (unchanged).
- **Human / WaaP:** preferred connect + payments when it **works**.
- **Thirdweb:** fallback **and** valid **first-login path** (e.g. Safari) → SIWE → account; user may never see WaaP on that device until they link it in Settings.

Reducing the bottleneck from **one** connect vendor to **two** entry paths is intentional.

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| **S1** | On **known-bad connect environments**, **do not open** the WaaP/Human modal. Route **directly** to Thirdweb connect + SIWE. | Avoid steering users into a verified failure mode. |
| **S2** | **v1 detection:** `iOS` (iPhone/iPad) + **Safari** (not Chrome/Firefox iOS). Optional phase 2: all **Safari** (macOS) if same iframe bug is confirmed. | Chrome on iOS is not Safari; may still use WaaP happy path. |
| **S3** | Show **short, honest copy** on that route (ES): e.g. *“En Safari usamos conexión alternativa (Thirdweb). Tu cuenta es la misma; puedes vincular Human después en Perfil.”* | Transparency without blaming the user; no “install Chrome”. |
| **S4** | **No silent auto-merge:** Thirdweb still ends in SIWE; `LinkedWallet` resolution unchanged. | Same account only when address is linked or new registration allowed. |
| **S5** | **Override flag:** `NEXT_PUBLIC_WAAP_FORCE_ON_SAFARI=true` for QA Human on Safari; default **false** in prod until Human fixes embed. | Engineers can test WaaP without ripping out detection. |
| **S6** | **Metrics:** log `connect_route` = `waap` \| `thirdweb_preempt` \| `thirdweb_manual_fallback` + `userAgent` snippet. | Prove Safari dead-end rate drops after I6. |
| **S7** | **Manual fallback link** (“Otra wallet”) remains on desktop / non-Safari for users who prefer Thirdweb without waiting for failure. | Unchanged from I1b. |

**Answer to “¿mostrar solo Thirdweb en iPhone Safari?”**  
**Yes** for the **primary** “Iniciar sesión” CTA on S1 environments. Do **not** open Human first and hope for timeout.

---

## 4. UX spec (I6)

### 4.1 Login entry

| Environment | Primary CTA behavior |
|---------------|----------------------|
| Desktop + Android (non-Safari) | WaaP modal (today) |
| iOS Safari / iPadOS Safari | **Thirdweb connect modal** immediately; banner S3 |
| iOS Chrome / Firefox | WaaP default (revisit if broken) |
| macOS Safari | WaaP default until QA confirms; then add to S1 set |

### 4.2 Copy (Spanish, draft)

- **Banner (informational):** “El proveedor Human no está disponible en Safari. Usamos una conexión alternativa segura; puedes añadir tu wallet Human en Perfil cuando quieras.”
- **Not:** “Usa Chrome” / “Human tiene bugs” (too harsh for investors).
- **Optional:** link secundario “Probar conexión Human” para quien quiera intentar WaaP en Safari (no bloquear del todo).

### 4.3 After login

- `authProvider` = `thirdweb` on Safari-first path; `waap` when Human used.
- **Perfil → Wallets:** link Human when embed works on another device (existing I3).

---

## 5. Implementation slice I6 (planned)

**Branch suggestion:** `feat/identity-safari-thirdweb-preempt`

| Task | Notes |
|------|--------|
| `lib/wallet/safari-connect-route.ts` | `shouldPreemptWaapWithThirdweb(): boolean` — iOS + Safari, respect S5 |
| Wire `WaaPWalletContextBridgeWithFallback` + onboarding login | If preempt → `connectWithThirdweb()` instead of WaaP `login()` |
| `ThirdwebFallbackBanner` | S3 copy on preempt path only |
| Tests | UA fixtures: iPhone Safari, iPhone Chrome, desktop Safari |
| `env.example` | `NEXT_PUBLIC_WAAP_FORCE_ON_SAFARI` |

**Non-goals I6:** fix Human iframe; server-side changes; change SIWE.

---

## 6. Acceptance criteria

1. **Given** iPhone Safari UA, **when** user taps login, **then** Human modal **never** opens (unless S5 force).
2. **Given** iPhone Safari, **when** Thirdweb connect + SIWE succeed, **then** session cookie issued like WaaP path.
3. **Given** user registered via Safari Thirdweb, **when** later links Human wallet on desktop, **then** same `userId` (I3 link).
4. **Given** desktop Chrome, **when** login, **then** WaaP modal still default (regression).
5. **Given** preempt path, **when** client logs, **then** `connect_route=thirdweb_preempt` present.

---

## 7. Open items

| ID | Item | Owner |
|----|------|--------|
| O1 | Confirm macOS Safari same iframe freeze | QA + Human ticket |
| O2 | Human embed fix ETA | Vendor |
| O3 | Remote config vs pure UA (future) | Eng if UA spoofing concerns |

---

## 8. Canonical one-liner (program)

> **`userId` + SIWE; Human preferred cuando funciona; en iOS Safari no abrimos Human — Thirdweb directo; multi-wallet y misma cuenta vía `LinkedWallet`.**