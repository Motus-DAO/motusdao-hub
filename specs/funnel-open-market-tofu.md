# Funnel · Open market + TOFU + app sin bloquear

**Status:** **SHIPPED** (F1–F4 on `main`, 2026-11-17) · product **LOCKED**  
**Parent:** [platform-harmonize.md](./platform-harmonize.md) · [academy-marketing-funnel-sdd.md](./academy-marketing-funnel-sdd.md)  
**Last updated:** 2026-11-17  
**Reference (concepto):** conversación Antseed ([antseed.com](https://antseed.com)) — mercado abierto oferta / privacidad demanda; no copiar producto.

**Related:** [founding-allowlist-usuario-psm.md](./founding-allowlist-usuario-psm.md) · [psychat-usuario-modo-exploracion.md](./psychat-usuario-modo-exploracion.md) · [psm-public-profile.md](./psm-public-profile.md) · [safety-slice-2-psychat.md](./safety-slice-2-psychat.md) · [therapy-payments-clabe-connect.md](./therapy-payments-clabe-connect.md) · [identity-safari-connect-routing.md](./identity-safari-connect-routing.md)

---

## 1. One-liner

**Dos caras del mismo Hub:** mercado **abierto y comparable** para profesionales (PSM); entrada **liviana** para personas usuarias (Psychat + explorar) **sin wallet en el primer contacto**; **instalar la PWA** antes que forzar login; wallet + consentimientos + intake **solo al pagar, comprar crédito o reservar terapia**.

---

## 2. Principio “open market” (locked)

Inspiración: marketplaces tipo Antseed — **lado oferta transparente**, **lado demanda con control de exposición**.

| Lado | Principio | Superficie Hub (hoy / objetivo) |
|------|-----------|--------------------------------|
| **Oferta (PSM)** | Listar, comparar, reservar sin fricción opaca | `/psicoterapia`, perfiles públicos, horarios (`TherapistBookingCard` → book/checkout). **Founding** acelera adoption, **no** sustituye gate admin de perfil publicado. |
| **Demanda (usuario)** | Probar valor antes de identidad fuerte | **TOFU:** Psychat (techo gratuito) → créditos → **terapeuta humano** vía marketplace (slot → registro mínimo → pago), no handoff que exija match previo desde el chat. |
| **Identidad** | Una cuenta puede crecer en pasos | Ver §4 escalera; compatible con [identity-waap-thirdweb-siwe-multilink.md](./identity-waap-thirdweb-siwe-multilink.md). |

**No confundir con:** founding waitlist (MKT), OAuth masivo, Psychat sin límites, ni aprobar PSM solo por estar en lista fundadora.

---

## 3. TOFU vs gates (locked)

### 3.1 Qué debe ser público (sin SIWE)

1. **Home / marketing** — hero, CTAs que abren valor, no Human directo (ver I6 login modal).
2. **Academia** — catálogo y outline de cursos publicados (Génesis / contenido free donde aplique).
3. **Psicoterapia** — directorio PSM + páginas por slug (sin datos clínicos del visitante).
4. **Founding** — **leaderboard** `GET` por rol (sin email); modal de signup es conversión, no muro de entrada al sitio.
5. **Psychat (v1 objetivo)** — primera experiencia **limitada** sin cuenta (ver F3); hoy **sigue** safety slice 2 (sesión + consentimiento).

### 3.2 Dónde sí pedir wallet / SIWE (no negociable v1)

| Acción | Gate |
|--------|------|
| Comprar crédito Psychat 5/10 USD | SIWE + consentimiento IA |
| Terapia humana (reserva + pago) | SIWE + intake terapia / legal al reservar (no al primer pixel) |
| Perfil clínico, bitácora, pagos wallet, admin | SIWE |
| Founding waitlist **POST** | Wallet + MNS + email (como [founding-allowlist-usuario-psm.md](./founding-allowlist-usuario-psm.md)) |

### 3.3 Orden de fricción (objetivo)

```text
Llegada → (opcional PWA) → explorar Psychat / catálogo / PSM
       → instalar app / guardar acceso
       → login (modal Safari-aware) solo al convertir
       → founding / créditos / reserva
```

---

## 4. Escalera de producto (usuario)

| Paso | Intención | Estado código (2026-11-17) |
|------|-----------|----------------------------|
| **A** | Navegar sin wallet | Parcial: academia/psicoterapia públicas; home empuja login |
| **B** | Psychat con techo diario | Requiere sesión + consentimiento + crédito por `userId` |
| **C** | Comprar crédito | Shipped (Stripe 5/10) |
| **D** | Elegir PSM + horario → login → pago | Shipped en marketplace; Psychat “humano” aún puede exigir match distinto — alinear handoff a marketplace |

**Retención (dirección):** medir qué retiene (Psychat vs booking vs academia free); sin copiar algoritmo de redes; eventos analytics opcionales en founding M4 y funnel.

---

## 5. PWA / “pedir la app” (locked)

- `manifest.json` + `appleWebApp` ya en `app/layout.tsx`.
- **F1:** banner o sheet **“Añadir a pantalla de inicio”** en iOS Safari / Android Chrome, **no bloqueante**, dismiss persistente (`localStorage`), mostrar en segunda visita o tras primer scroll en Psychat/catálogo.
- **No** usar install prompt como único camino a Psychat.
- **No** exigir PWA instalada para founding o login.

---

## 6. Relación con Founding MKT

| Pieza | Orden recomendado |
|-------|-------------------|
| Este SDD (F0) | **Primero** — criterios de “no bloquear” |
| **F1** Ungating + PWA hint | **Antes** de marketing fuerte founding |
| **Founding M1** (APIs públicas + modal + leaderboard) | En paralelo tras F1; entrada desde landing, no como login wall |
| **F3** Psychat guest/limit | **Después** — addendum safety + rate limit; no romper slice 2 sin decisión explícita |
| **F2** Handoff Psychat → marketplace booking | Medio plazo; reduce sensación “todo cerrado” |

Founding **redención** sigue Psychat créditos / Academia checkout; founding **captura** sigue siendo alta intención (wallet + MNS), no reemplaza TOFU anónimo.

---

## 7. Delivery phases

| Phase | ID | Entregable |
|-------|-----|------------|
| **F0** | FUNNEL-0 | Este SDD locked + links en STATUS |
| **F1** | FUNNEL-1 | Rutas públicas revisadas; home/no-auth CTAs → explorar; PWA install hint; login modal global (I6) |
| **F2** | FUNNEL-2 | Psychat CTA humano → `/psicoterapia` o booking, sin `POST /api/sessions` prematuro |
| **F3** | FUNNEL-3 | Psychat sin cuenta: rate limit + techo $/IP/día **o** acortar trial post-login (elegir uno en implementación) + addendum safety |
| **F4** | FUNNEL-4 | Analytics funnel (PostHog): tofu → login → credit → book |

---

## 8. Acceptance criteria (Given / When / Then)

1. **Given** visitante sin sesión, **when** abre `/`, **then** puede llegar a `/psychat`, `/academia`, `/psicoterapia` sin modal Human obligatorio al primer tap.
2. **Given** iOS Safari, **when** toca “Iniciar sesión”, **then** ve modal proveedor (Thirdweb default), no iframe Human directo (I6).
3. **Given** segunda sesión sin PWA, **when** navega TOFU, **then** puede ver hint install dismissible.
4. **Given** usuario en Psychat, **when** pide terapeuta humano, **then** ruta hacia marketplace/reserva (F2), no dead-end por match inexistente.
5. **Given** founding leaderboard público, **when** `GET` sin auth, **then** sin PII (alineado founding AC).

---

## 9. Non-goals

- Psychat clínico completo sin consentimiento.
- Abrir admin, bitácora o pagos sin SIWE.
- Founding sin wallet/MNS en POST.
- Sustituir [academy-marketing-funnel-sdd.md](./academy-marketing-funnel-sdd.md) (contenido Génesis); este SDD es **acceso y gates**.

---

## Change log

| Date | Change |
|------|--------|
| 2026-11-17 | Initial SDD — open market, TOFU, PWA, orden vs founding MKT |
| 2026-11-17 | F1–F4 implemented — guest Psychat, PWA hint, home TOFU, marketplace handoff, PostHog `funnel_step` |