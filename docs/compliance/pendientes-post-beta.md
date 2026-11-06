# Pendientes post-beta (no bloquean slice 6)

**Contexto:** Slice 6 quedó **listo para vender en beta** (aviso publicado, términos, subprocesadores, consentimiento versionado). Esta tabla es la **deuda consciente** hasta tracción, ingresos o abogado.

| Tema | Estado hoy | Cuándo abordarlo |
|------|------------|------------------|
| **Razón social y domicilio fiscal** en aviso | Responsable: “MotusDAO” + contact@motusdao.org | Al constituir persona moral; actualizar `docs/compliance/legal/aviso-de-privacidad-integral.md` y `/privacy` |
| **DPAs / BAA** (Supabase, Venice/OpenAI, Stripe, etc.) | No firmados en esta etapa | Con ingresos o flujo clínico en EE. UU. que trate ePHI |
| **Portal ARCO automático** (export / borrado en app) | Solicitudes manuales a contact@motusdao.org | Producto cuando haya volumen de solicitudes ARCO |
| **Bitácora en claro en servidor** | ✅ Cifrado cliente (`motus-safe-notes`) desde slice 7 (`f7f2615`); el servidor guarda ciphertext | Mantener aviso alineado; export en chat-data |
| **Entrenamiento de modelos** con copia legible | No activo; aviso §3.3 | Pasos en `docs/specs/SDD-chat-data.md` **después** del aviso (ya publicado) |
| **Región Supabase / PostHog** | Inventario dice “verificar en consola” | Revisar dashboard de prod y actualizar `/subprocesadores` + inventario |

## Criterio “beta OK” (slice 6)

- Aviso integral y simplificado en **`/privacy`**
- **`/terms`**, **`/cookies`**, **`/subprocesadores`** publicados
- Onboarding enlaza políticas que **existen**; `consentPolicyVersion` **`2026-10-27`**
- Sin badge HIPAA; sin prometer borrado total de IPFS/Celo
- Inventario y régimen en `docs/compliance/`

## Reabrir slice 6 (documentación)

Actualizar aviso y subprocesadores cuando ocurra cualquiera de:

1. Primer flujo clínico de pago en EE. UU.
2. Recolección de copias para entrenamiento de modelos
3. Razón social / domicilio fiscal formal

Ver también: `specs/safety-slice-6-program-gap.md` §5.

## Estado del plan safety

Los slices 1–7 están **shipped** (ver `specs/STATUS.md` y `specs/safety-slice-7-bitacora-ciphertext.md`).
El siguiente trabajo de código no es un slice de safety: es cerrar Psychat PSM (slices 2–3) y
verificar el deploy de este refresh.
