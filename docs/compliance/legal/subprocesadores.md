# Subprocesadores y encargados — MotusDAO Hub

**Versión:** 2026-10-27  
Inventario técnico interno: `docs/compliance/processors-inventory.md` en el repositorio.

Esta página resume a quién puede acceder a datos al operar el Hub en producción.

| Encargado | Servicio | Datos típicos | Ubicación (orientativa) |
|-----------|----------|---------------|-------------------------|
| Supabase | Base de datos y archivos | Perfil, intake, bitácora, academia, documentos | Según proyecto (verificar en consola) |
| Vercel | Hosting y ejecución serverless | Tráfico HTTP, logs | EE. UU. / global |
| Human.tech (WaaP) | Wallet y login | Email, wallet | Según proveedor |
| OpenAI | IA (si `AI_PROVIDER=openai`) | Texto de chat e intake | EE. UU. |
| Venice.ai | IA (si `AI_PROVIDER=venice`) | Texto o ciphertext relay | Según Venice |
| Motus (Jitsi) | Videollamadas | Audio/video, nombre en sala | Infra MotusDAO |
| Stripe | Pagos tarjeta | Pago, email de checkout | EE. UU. / global |
| Lighthouse / IPFS | Pin de metadata NFT | Wallet, rol, fecha (público) | Red descentralizada |
| PostHog | Analítica (opcional) | Eventos de producto, IP | Configurable (host en env) |
| Ripio / Transak / Mt Pelerin | Rampas (opcional) | Wallet, KYC en su UI | Según proveedor |
| Pimlico / ZeroDev | Smart wallet (opcional) | UserOperations | EE. UU. / global |

Actualizaremos esta lista cuando cambiemos proveedores. Para ejercer derechos ARCO: contact@motusdao.org.
