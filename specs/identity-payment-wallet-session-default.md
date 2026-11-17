# Identity · Payment wallet = session provider

**Status:** **SHIPPED** (slice I7 en `main`)  
**Parents:** [identity-waap-thirdweb-siwe-multilink.md](./identity-waap-thirdweb-siwe-multilink.md) · [identity-safari-connect-routing.md](./identity-safari-connect-routing.md)  
**Last updated:** 2026-11-17

---

## 1. One-liner

**Pagos y firmas on-chain usan la wallet de la sesión actual** (la EOA con la que acabas de hacer SIWE y el proveedor con el que conectaste).  
**Wallets vinculadas** solo sirven para **entrar** con otra dirección; para **gastar** desde otra, **inicia sesión otra vez** con ese proveedor.

No hay selector “wallet de pago” en v1 de este slice; se evita cambiar `primary` post-registro.

---

## 2. Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| **P1** | `paymentSigner` = `session.eoa` + `session.authProvider` (`waap` \| `thirdweb`) | Regla simple; Safari Thirdweb paga con Thirdweb. |
| **P2** | `LinkedWallet` = **login factors**; no implica “pago activo” hasta nueva sesión con ese proveedor | Una cuenta, N entradas; un gas/spend path por sesión. |
| **P3** | **UI:** sección **Saldos** (Perfil, Wallet o Pagos) lista **todas** las addresses vinculadas + balance on-chain (Celo: CELO + stables según catálogo). | Usuario ve patrimonio total; entiende por qué no puede pagar desde B estando en sesión A. |
| **P4** | Copy fijo (ES): *“Para usar el saldo de esta wallet, inicia sesión conectando con el mismo proveedor (Human o Thirdweb) que la vinculaste.”* | Evita soporte “no me deja pagar con mi otra wallet”. |
| **P5** | Primaria en DB (`User.eoaAddress`, `isPrimary`) = **identidad histórica / primer registro**; **no** override de P1 para pagos | Menos confusión con D5; sesión gana para spend. |
| **P6** | `lib/payments.ts` (y rutas que firmen) deben usar **provider de sesión**: WaaP EIP-1193 o Thirdweb EIP-1193, no solo `window.waap` | Implementación I7. |

---

## 3. User stories

### 3.1 Login y pago

1. Entro con **Thirdweb** (Safari) → SIWE → sesión `eoa=B`, `authProvider=thirdweb`.  
2. Pago terapia / on-chain → firma con **B** vía cliente Thirdweb.  
3. Cierro sesión; entro con **Human** → SIWE → sesión `eoa=A`, `authProvider=waap`.  
4. Pago → firma con **A** vía WaaP.

### 3.2 Dos wallets, un usuario

- En Perfil veo **A** y **B** vinculadas, saldo de cada una.  
- Sesión actual = A → pagos usan A; saldo de B visible pero mensaje P4 si intenta pagar sin reloguear con Thirdweb.

---

## 4. UI placement (draft)

| Surface | Content |
|---------|---------|
| **/perfil** → panel Wallets vinculadas (existente) | Lista + link/unlink; badge “Sesión actual” en la row que coincida con `session.eoa`. |
| **Nuevo bloque “Saldos”** (mismo panel o `/pagos`) | Por address: CELO, cUSD/cEUR/… (readonly RPC); spinner / error si RPC falla. |
| **/pagos** (antes de confirmar) | Una línea: “Pagarás desde **0x…** (Human)” o “(Thirdweb)”. |

---

## 5. Slice I7 — implementation (planned)

| Task | Notes |
|------|--------|
| `getSessionPaymentContext()` | `{ address, authProvider, provider: EIP1193 }` from hub session + bridge |
| Refactor `createEoaWalletClient` | Branch `waap` vs `thirdweb`; no hard-require `window.waap` |
| `GET /api/wallets/balances` | Session required; addresses = linked wallets; server RPC Blockscout/JSON-RPC |
| UI `WalletBalancesCard` | P4 copy + link “Cambiar sesión” → logout + login hint |
| Tests | Session thirdweb mock signs; waap path unchanged |

**Non-goals I7:** merge on-chain balances; pay from wallet B while session on A; admin set-primary for payments.

---

## 6. Acceptance criteria

1. **Given** sesión Thirdweb `eoa=B`, **when** user triggers hub payment, **then** tx requested from B via Thirdweb provider.  
2. **Given** sesión WaaP `eoa=A`, **when** payment, **then** WaaP client only.  
3. **Given** dos wallets linkadas, **when** user opens Saldos, **then** ambas balances visible.  
4. **Given** sesión A, **when** user reads row B, **then** ve P4 (no botón “pagar con B” sin relogin).

---

## 7. Relation to Safari I6

iOS Safari preempt Thirdweb → sesión Thirdweb → pagos Thirdweb por P1. Human se vincula después en Perfil; pagos Human tras login desktop con WaaP.