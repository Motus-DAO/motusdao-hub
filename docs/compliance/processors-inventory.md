# MotusDAO Hub — Inventario de encargados y subprocesadores

**Fecha:** 2026-10-27  
**Repo:** `motusdao-hub`  
**Propósito:** Safety plan **slice 6** — base para aviso de privacidad, DPAs y decisiones US/MX.  
**No es asesoría legal.** Validar env de producción y contratos firmados.

**Alcance declarado:** operación con responsable en México; usuarios en **EE. UU.** (p. ej. mercado latino) implican transferencias internacionales y revisión HIPAA/BAA **solo si** se trata ePHI de titulares/con profesionales en EE. UU.

### Leyenda de categorías de dato

| Código | Categoría |
|--------|-----------|
| HT | Salud / salud mental (intake, bitácora, chat, narrativas) |
| AV | Audio/video (sesiones) |
| PII | Identificación y contacto |
| WAL | Wallet / on-chain |
| PAY | Pagos y rampas |
| DOC | Archivos subidos |
| TECH | Telemetría, IP, logs |

---

## 1. Resumen ejecutivo

| Nivel | Encargados |
|-------|------------|
| **Núcleo prod** | Supabase (Postgres + Storage), Vercel, WaaP (wallet por defecto), Jitsi Motus (`jitsi.motusdao.org`, `meet.motusdao.org`), RPC Celo |
| **Funcionalidad condicional** | OpenAI **o** Venice (IA); Stripe; PostHog; Lighthouse→IPFS (NFT perfil); Ripio/Transak/Mt Pelerin; Pimlico/ZeroDev (smart wallet — código presente, provider no montado en layout); Textile (FX) |
| **Opcional A/B** | Privy (+ WalletConnect) |
| **Adjunto (no SDK Hub)** | WorkAdventure / LiveKit en `metaverso.motusdao.org` (CSP; AV si el usuario entra al metaverso) |
| **No usado en app** | Pinata, Arweave, Walrus; `web3.storage` / `nft.storage` solo en `package.json` |
| **Sin proveedor email** | `POST /api/contact` solo Postgres |

Detalle IPFS: [ipfs-storage-audit.md](./ipfs-storage-audit.md).

---

## 2. Tabla maestra

| Encargado | Datos | Rutas / anclas | Variables (habilitan) | ¿Requerido? |
|-----------|-------|----------------|-------------------------|-------------|
| **Supabase** | PII, HT, DOC, WAL | `lib/prisma.ts`, `lib/storage.ts`, `lib/supabase-admin.ts`, APIs clínicas/academia | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | Sí (prod) |
| **Vercel** | Todo el tráfico HTTP | `vercel.json`, `app/api/**` | Deploy + secretos | Sí (host documentado) |
| **Human.tech WaaP** | PII, WAL | `lib/contexts/WaaPProvider.tsx` | `NEXT_PUBLIC_WALLET_PROVIDER=waap` | Default sí |
| **Privy** | PII, WAL | `components/wallet/PrivyWalletProviderWrapper.tsx` | `NEXT_PUBLIC_WALLET_PROVIDER=privy`, `NEXT_PUBLIC_PRIVY_APP_ID` | Opcional |
| **WalletConnect** | WAL | vía WaaP/Privy | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Opcional |
| **OpenAI** | HT, PII en prompts | `lib/ai-client.ts`, `/api/chat`, `/api/onboarding/ai-intake`, RAG | `AI_PROVIDER=openai`, `OPENAI_API_KEY` | IA default |
| **Venice.ai** | HT (claro o E2EE relay) | `app/api/ai/e2ee/*`, Psychat | `AI_PROVIDER=venice`, `VENICE_*` | Opcional |
| **PostHog** | TECH | `components/PostHogProvider.tsx` | `NEXT_PUBLIC_POSTHOG_*` | Opcional |
| **Stripe** | PAY, PII checkout | `lib/stripe.ts`, `/api/stripe/*`, créditos IA | `STRIPE_*` | Opcional (pagos) |
| **Jitsi (Motus)** | AV, nombre en JWT | `lib/jitsi*.ts`, `/api/jitsi/*`, `/videochat` | `JITSI_*`, `NEXT_PUBLIC_JITSI_*` | Si hay video |
| **Lighthouse → IPFS** | WAL, rol, fecha (público) | `lib/profile-nft-metadata.ts`, `POST /api/profile/nft` | `LIGHTHOUSE_API_KEY` | Opcional (onboarding NFT) |
| **Celo (RPC público)** | WAL, PAY on-chain | `lib/celo.ts`, faucet, NFT | `CELO_FAUCET_PRIVATE_KEY`, `MOTUS_PROFILE_*` | Si on-chain |
| **Pimlico** | WAL (UserOps) | `app/api/pimlico/*` | `PIMLICO_API_KEY` | Opcional |
| **ZeroDev** | WAL | `lib/contexts/ZeroDevSmartWalletProvider.tsx` | `NEXT_PUBLIC_ZERODEV_*` | Dormant en layout |
| **Ripio** | PAY, KYC en widget | `app/api/ripio/widget-token` | `RIPIO_*`, `RIPIO_MOCK` | Opcional / mock |
| **Transak** | PAY, PII widget | `app/api/transak-lite` | `TRANSAK_*` | Opcional |
| **Mt Pelerin** | PAY, WAL | `app/pagos/page.tsx` | `NEXT_PUBLIC_MTPELERIN_WIDGET_URL` | Opcional |
| **Textile** | WAL (swaps) | `app/api/textile/*` | `TEXTILE_API_KEY` | Opcional |
| **Frankfurter.dev** | Ninguno usuario | `lib/academy/fx.ts` | — | Opcional |
| **Motus MCP** | Texto consulta Motty | `lib/motty/mcp.ts` | `MOTTY_MCP_URL` | Opcional |
| **SPEI / CLABE** | PII bancario | `app/api/spei/*` | — | **Sin API banco** (solo Postgres) |

---

## 3. IA y conocimiento

- **Psychat / intake IA:** OpenAI o Venice; hilo de visita no persistido en Postgres (slice 2). Créditos Venice en Postgres.
- **RAG clínico:** embeddings vía proveedor IA; chunks en Supabase (`lib/motus-knowledge.ts`).
- **Motty:** MCP + mismo proveedor IA; contexto de página/academia server-side.

---

## 4. Video

- Terapia: `jitsi.motusdao.org` (JWT Hub).
- Abierto/metaverso Hub: `meet.motusdao.org`.
- Metaverso WorkAdventure / LiveKit: producto adyacente; tratar como AV si se enlaza desde el Hub.

---

## 5. Pagos

- **Stripe:** academia y créditos IA.
- **Ripio:** mock sin credenciales.
- **Transak / Mt Pelerin:** widgets externos; KYC en su UI.
- **Stripe Connect / CLABE:** SPEI en DB; Connect en spec, no siempre en código.

---

## 6. Blockchain y NFT

- **Faucet CELO:** sesión + wallet (`POST /api/faucet`).
- **NFT perfil:** Lighthouse + IPFS + Celo — ver [ipfs-storage-audit.md](./ipfs-storage-audit.md).
- **MNS:** metadata on-chain `data:` URI, no IPFS.

---

## 7. Índice rápido API → egress

| Ruta | Destino externo |
|------|----------------|
| `/api/chat`, `/api/onboarding/ai-intake` | OpenAI / Venice |
| `/api/ai/e2ee/*` | Venice |
| `/api/pimlico/*` | api.pimlico.io |
| `/api/ripio/widget-token` | Ripio |
| `/api/transak-lite` | Transak |
| `/api/stripe/*` | Stripe |
| `/api/profile/nft` | Lighthouse → IPFS |
| `/api/bitacora`, `/api/profile` (datos) | Solo Supabase |

---

## 8. Huecos para verificar en prod (checklist slice 6)

- [ ] Región Supabase y DPAs firmados.
- [ ] `AI_PROVIDER` real y política de retención Venice/OpenAI.
- [ ] PostHog US vs EU (`NEXT_PUBLIC_POSTHOG_HOST`).
- [ ] Jitsi: grabación, logs, retención en VPS.
- [ ] WaaP / Privy: lista de subprocesadores del proveedor wallet.
- [ ] ¿`LIGHTHOUSE_API_KEY` en prod? ¿NFT mint activo?
- [ ] Ripio/Transak: sandbox vs producción.
- [ ] Si hay usuarios en **EE. UU.:** ¿BAA con encargados que ven HT? ¿Cláusula de transferencia en aviso?
- [x] `POST /api/profile/nft` — sesión SIWE + wallet (slice 6, 2026-10-27).

---

## 9. Documentos relacionados

- [privacy-notice-research-es.md](./privacy-notice-research-es.md) — cómo redactar el aviso (LFPDPPP + checklist Motus).
- [ipfs-storage-audit.md](./ipfs-storage-audit.md)
- `docs/specs/SDD-safety-plan.md` (slice 6)
- `docs/research/current-state-data-inventory.md`

---

*Generado a partir de revisión de código 2026-10-27. Actualizar al cambiar integraciones.*
