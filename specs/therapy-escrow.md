# Therapy escrow (contrato) — Spec

> Status: **ACTIVE** · Owner: eng · Slice: escrow + agente (fase 2)
>
> Purpose: que una sesión de terapia se pague en `wMXN`/`wARS` con **custodia en el contrato**,
> no en Motus: el paciente deposita, el profesional cobra solo, y el 10/90 se parte en la misma
> liquidación. El agente solo arbitra disputas y dispara el retiro.

---

## 1. Scope (what this slice delivers)

- `contracts/TherapyEscrow.sol`: escrow por sesión con depósito, cancelación, settle, disputa,
  resolución y release 90/10.
- `contracts/mocks/MockERC20.sol`: token de prueba (18 decimales, como los wFIAT).
- `test/TherapyEscrow.test.js`: 8 casos (happy path, cancelación, disputa, autorizaciones,
  ventana, stale, fee cap, doble depósito).
- `npm run escrow:test` para correrlos.

**No** incluye deploy, worker del agente ni wiring en la app: eso es el slice siguiente.

## 2. Non-goals (explicitly out of scope)

- Deploy a Celo mainnet o Sepolia (script aparte, con llave).
- Worker que crea sesiones, escucha depósitos y dispara releases.
- UI de escrow en `/pagos` o `/cobros`.
- Off-ramp automático (requiere KYB de Ripio).
- Argentina: el contrato es token-agnóstico; la primera red será `wMXN`.

## 3. Context / anchors

- [`contracts/TherapyEscrow.sol`](../contracts/TherapyEscrow.sol)
- [`contracts/mocks/MockERC20.sol`](../contracts/mocks/MockERC20.sol)
- [`test/TherapyEscrow.test.js`](../test/TherapyEscrow.test.js)
- Toolchain: Hardhat 2 + OZ 5, Solidity 0.8.20 (`hardhat.config.cjs`).

## 4. Modelo

```solidity
struct Session {
    address token;          // wMXN / wARS
    address patient;
    address payee;          // fijo al crear: wallet del PSM o dirección de sesión Ripio
    uint256 amount;         // monto congelado al crear
    uint64  startsAt;
    uint64  settledAt;      // lo fija el PSM al settle
    uint32  challengeWindow;// 48h prod, 0 demo
    Status  status;
}
```

Estados: `None → Created → Funded → Settled → Disputed → Released | Refunded`.

## 5. Contrato (interface)

| Función | Quién | Precondición | Efecto |
|---|---|---|---|
| `createSession` | operator (worker) | id nuevo, `startsAt >= now`, fee ≤ cap | crea la obligación con payee/treasury fijos |
| `setOperator` | owner | nueva address ≠ 0 | rota el worker sin redeployar |
| `setOracle` | owner | nueva address ≠ 0 | rota el agente sin redeployar |
| `deposit` | paciente | `Created` | `transferFrom` al contrato → `Funded` |
| `cancelBeforeStart` | paciente | `Funded`, antes de `startsAt` | refund 100% → `Refunded` |
| `settle` | payee | `Funded`, después de `startsAt` | `settledAt = now` → `Settled` |
| `dispute` | paciente | `Settled`, dentro de la ventana | → `Disputed` |
| `resolve(refundBps)` | oráculo (agente) | `Disputed` | refund `refundBps` al paciente; el resto 90/10 |
| `release` | cualquiera | `Settled`, ventana vencida | 90% payee / 10% tesorería |
| `refundStale` | paciente | `Funded`, `startsAt + 7d` | refund 100% (el PSM nunca hizo settle) |

**Reparto:** `fee = amount * feeBps / 10000`, `payeeAmount = amount - fee`. `feeBps` máximo 20%
(`MAX_FEE_BPS`), default 10%.

## 6. Reglas de no-show

| Escenario | Contrato | Nota |
|---|---|---|
| Sesión completada | PSM `settle` → `release` 90/10 | el PSM cobra sin pedir permiso |
| No-show del paciente | PSM `settle` tras el inicio | el escrow ya está fondeado |
| No-show del PSM | paciente `dispute` → oráculo `resolve(10000)` | refund total |
| Cancelación <48h | política de la app (no del contrato) | on-chain: refund total antes de `startsAt` |
| Silencio del PSM 7 días | paciente `refundStale` | protege al paciente |

La cancelación tardía (forfeit del 50%) es **política de producto** en v1; se aplica ocultando
el botón y resolviendo por el oráculo. Si el producto la exige on-chain, se agrega un
`cancellationCutoff` por sesión en v2.

## 7. Decisiones — LOCKED

1. **Payee y treasury fijos al crear.** Ni el owner ni el oráculo pueden redirigir fondos.
2. **El oráculo solo elige `refundBps`.** La dirección del paciente y del PSM no se tocan.
3. **El PSM puede hacer `settle` solo.** No depende del backend para cobrar.
4. **El paciente siempre puede salir antes del inicio.**
5. **`challengeWindow` por sesión** (48h prod, 0 demo), con tope de 7 días.
6. **Fee cap duro 20%**, para que un deploy mal configurado no pueda vaciar la sesión.
7. **Owner frío, operator y oracle calientes.** El owner (Rabby/multisig) no firma en el
   servidor; el worker y el agente comparten una wallet caliente dedicada.
8. **Operator y oracle son rotables** por el owner, con evento. Una llave caliente
   comprometida se reemplaza sin redeployar el escrow; el owner nunca está en Vercel.

## 8. Abiertos

- **Deploy:** owner y oráculo con la misma wallet del agente o separadas (recomendado: owner
  multisig, oráculo agente). Afecta la rotación de llave.
- **Payee v1:** wallet WaaP del PSM. v2: dirección de la sesión de off-ramp de Ripio (requiere KYB).
- **Evidencia del no-show:** atestación del PSM + disputa; el join log de Jitsi lo automatiza después.
- **Precio en ARS:** congelado al `createSession`; si la inflación lo exige, cotizar al `settle`.

## 9. QA gate (Definition of Done for this slice)

- [x] `npm run escrow:test` → 11 passing (incluye rotación de operator/oracle).
- [x] `npm run lint` (test de contratos ignorado en ESLint).
- [x] `npx tsc --noEmit`.
- [x] `npm test` / `npm run build`.
- [ ] Deploy y E2E con wMXN real (siguiente slice).

## 9.1 Deployment (Celo mainnet)

| Rol | Address |
|---|---|
| Owner (frío, Rabby) | `0x052E6A4080293e9B0e2629dC8b43854E758Ecb8f` |
| Operator / Oracle (agente caliente) | `0xb3C5EA7E583FBa073006c6C553239daC59e3d47B` |
| Treasury | `0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9` |
| Fee | 1000 bps (10%) |

```bash
# 1. El deployer es el agente; el script transfiere ownership al owner frío.
DEPLOYER_PRIVATE_KEY=<agent key> npm run escrow:deploy

# 2. Registro ERC-8004 (misma wallet del agente; metadata en /agent.json)
npm run agent:register
```

El agente necesita **CELO para gas** (deploy + registro). Para las operaciones del worker se
puede pagar gas en `wMXN` con `feeCurrency`.

### Deployed (2026-11-08)

| Item | Valor |
|---|---|
| `TherapyEscrow` | `0xFd9F38AD6143B018e60F86B5304C53223FBf2dBC` |
| Deploy tx | `0xe8bdf10af4da4d8a4d096e85943841d511572bc1942ab4c5159a9f23c5d8d5b6` |
| Ownership tx (agent → owner frío) | `0x7b33c1053fb4a61247cde4f8eff1c7c1f045b5f249232da8468ebe6a8b4e332e` |
| ERC-8004 `agentId` | **10053** |
| ERC-8004 tx | `0x2d01e5910bbccdb423d3c47c9b3fbbe44101a6ca167378343def72232cc713ac` |
| Metadata | `https://app.motusdao.org/agent.json` |

El deploy usó 1.5M de gas a 262 gwei (base 200 gwei) y dejó al agente con ~0.29 CELO.
El `ownerOf(10053)` y el `getAgentWallet(10053)` resuelven a la wallet del agente.

### Worker y página de pago (2026-11-08)

- `GET/POST /api/agent/tick` (protegido con `CRON_SECRET`): lee `SessionCreated`,
  libera las sesiones en `Settled` con la ventana vencida, firma con la wallet del agente
  y agrega el sufijo ERC-8021 a cada tx.
- `npm run agent:tick`: la misma lógica en local. `npm run escrow:create`: crea una sesión
  desde el operator (agente).
- `/pagar/[sessionId]`: el paciente hace `approve` + `deposit`; el payee hace `settle`.
  Soporta WaaP y wallet inyectada (Rabby/MetaMask), y hace polling del estado.
- Sin tabla ni cola: la cadena es la fuente de verdad; `release` revierte si ya se ejecutó,
  así que el tick es idempotente.

### E2E en mainnet (2026-11-08)

| Paso | Tx | Tag |
|---|---|---|
| `createSession` | `0x742fc9f2…4495` | ✅ |
| `deposit` 1 wMXN (paciente `0xd7dc…`) | `0x4afe8bfc…28cd` | ✅ |
| `settle` (PSM `0xd056…`) | `0x1395ee7c…cb07` | ✅ |
| `release` (agente) | `0x58dc83f6…2853` | ✅ |

Resultado: **0.9 wMXN** al profesional, **0.1 wMXN** a tesorería, escrow en 0, sesión
`Released`. El tick se corrió manualmente; el **cron del VPS** lo hará cada 2 minutos
([runbook](../docs/runbooks/agent-tick-vps.md)).

La página `/pagar/[id]` bloquea las acciones mientras la tx se confirma y hace polling
hasta que el estado esperado llega, para que el botón no reaparezca y se pueda duplicar
un depósito.

## 10. Rollback

- `git revert` del commit del contrato: no hay deploy, no hay fondos, no hay schema.
- El contrato es inmutable una vez desplegado; si hay que corregir, se despliega una v2 y se
  apunta el worker a la nueva dirección. Las sesiones viejas se liquidan con el contrato viejo.

## 11. Siguiente slice

1. Script `scripts/escrow/deploy.cjs` (Celo mainnet, `wMXN`, treasury, fee 1000, oráculo).
2. Wallet del agente + ERC-8004.
3. Worker: crear sesión, detectar depósito, `settle`/`release`, conciliar contra
   `onchain_transactions` (capa 2 del historial).
