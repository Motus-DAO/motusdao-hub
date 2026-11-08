# Agents on Open Rails — submission (Ripio track)

> **Este es el doc canónico del submission**, no un dashboard de estado. El estado vive en
> [`STATUS.md`](./STATUS.md); el detalle por slice vive en los specs enlazados.
>
> Track: **Stable Agents: LatAm (Ripio × Celo Core Co.)**

---

## 1. En una frase

**MotusDAO es un agente que cobra, liquida y comprueba terapia en la moneda local del
paciente y del psicólogo, sobre Celo mainnet, sin que el dinero pase por dólares.**

## 2. Usuario y problema

- **Quién:** un psicólogo y su paciente en México. La sesión cuesta **45 USD** (estándar
  MotusDAO); el paciente vive en pesos y el psicólogo cobra en pesos.
- **Hoy:** pagar terapia en LatAm obliga a convertir a dólares, pagar fees en cada paso y
  perder trazabilidad. El no-show no tiene una regla clara; el reembolso depende de un humano.
- **Lo que hace Motus:** el paciente compra **wMXN** con Ripio, deposita en un **escrow**,
  el psicólogo confirma, y un **agente** libera el **90/10** en la misma moneda. Todo con
  atribución on-chain.

## 3. Qué está live (Celo mainnet)

| Pieza | Evidencia |
|---|---|
| Rampa Ripio (compra/venta) en móvil | 50 wMXN comprados · tx `0xf02132ff…379e2` |
| Escrow de terapia | `0xFd9F38AD6143B018e60F86B5304C53223FBf2dBC` |
| Depósito del paciente (1 wMXN) | `0x4afe8bfc…28cd` |
| `settle` del profesional | `0x1395ee7c…cb07` |
| `release` 90/10 del agente | `0x58dc83f6…2853` |
| ERC-8004 del agente | agentId **10053** · tx `0x2d01e591…13ac` · metadata `/agent.json` |
| Atribución ERC-8021 | código `celo_0ee3486819c5` en las cuatro tx |
| Historial y finanzas | `/pagos/historial`, `/finanzas`, `/finanzas/actividad` |
| Agente 24/7 | `/api/agent/tick` + cron del VPS cada 2 min · [runbook](../docs/runbooks/agent-tick-vps.md) |

Resultado del E2E: **0.9 wMXN** al psicólogo, **0.1 wMXN** a tesorería, escrow en 0, sesión
`Released`. Los cuatro hashes se pueden verificar con:

```bash
npm run verify:attribution -- <txHash> celo_0ee3486819c5
```

## 4. Cómo se mapea a la rúbrica

| Criterio (20%) | Cómo se cumple |
|---|---|
| **Mainnet real con wFIAT** | Compra real de wMXN con Ripio y un ciclo completo de escrow en mainnet |
| **Uso real de wFIAT + Celo** | wFIAT como moneda del escrow; ERC-8004, ERC-8021; gas en CELO (feeCurrency es siguiente) |
| **Autonomía del agente** | Worker que lee el escrow y libera solo; cron en el VPS; el agente decide cuándo liquidar |
| **UX para persona real** | Rampa en móvil, `/pagar/[id]` con estado y montos, historial con hash y comprobante |
| **Impacto LatAm** | Terapia pagada y liquidada en pesos; psicólogo y paciente nombrados; sin round-trip a USD |

**En flight (si llega antes del cierre):** capa agéntica de Motty
([spec](./agentic-payments.md)) para que el usuario diga “págale a mi terapeuta” y el agente
ejecute. No se presenta como live hasta que esté probado.

## 5. Guion del demo (3 min)

1. **Celular:** `/pagos` → Comprar → Ripio → pagar con SPEI → wMXN en la wallet.
2. **Desktop:** abrir `/pagar/[id]` (o Motty) → “Aprobar y depositar” → estado `Depositada`.
3. **PSM:** conectar su wallet → “Confirmar sesión” → estado `Confirmada`.
4. **Agente:** el cron libera; la página pasa a `Pago liberado` (0.9 / 0.1).
5. **Celoscan:** abrir las tx; mostrar el sufijo `celo_0ee3486819c5` y el 90/10.
6. **Cierre:** `/finanzas/actividad` y el agente ERC-8004 `10053`.

## 6. Reproducir

```bash
# 1. Crear una sesión de escrow (agente/operator)
PATIENT_ADDRESS=0x… PAYEE_ADDRESS=0x… SESSION_AMOUNT=1 \
  SESSION_START_MINUTES=5 CHALLENGE_WINDOW_SECONDS=0 \
  npm run escrow:create

# 2. Pagar y confirmar en https://app.motusdao.org/pagar/<id>

# 3. Liberar (o dejar que el cron del VPS lo haga)
npm run agent:tick

# 4. Verificar atribución
npm run verify:attribution -- <txHash> celo_0ee3486819c5
```

Variables: `ESCROW_CONTRACT_ADDRESS`, `AGENT_PRIVATE_KEY` (Vercel), `CRON_SECRET`
(Vercel + VPS), `ESCROW_SCAN_BLOCKS` (opcional). Ver
[`env.example`](../env.example) y el [runbook del VPS](../docs/runbooks/agent-tick-vps.md).

## 7. Qué sigue (no está en este submission)

- **Motty agente de pagos** ([spec](./agentic-payments.md)): intención → herramientas →
  escrow → recibo.
- **Booking → escrow**: botón “Pagar con wFIAT” en la tarjeta de reserva.
- **Comisiones SPEI + pago simbólico** ([spec](./spei-commissions.md)).
- **Idle money**: el float del escrow financiando el fondo de pago simbólico (visión, no
  código; riesgo de custodia).

## 8. Enlaces

- [Escrow](./therapy-escrow.md) · [Rampa Ripio](./ripio-public-ramp.md) ·
  [Atribución](./celo-attribution.md) · [Historial](./onchain-history.md) ·
  [Finance hub](./finance-hub.md) · [Motty pagos](./agentic-payments.md)
- Contrato: `0xFd9F…2dBC` · Agente: `0xb3C5…d47B` · ERC-8004: `10053`
