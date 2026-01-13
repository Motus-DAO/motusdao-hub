# Arquitectura Jitsi con Vercel - Guía Importante

## ⚠️ Concepto Clave

**Vercel aloja tu aplicación Next.js**, pero **Jitsi necesita su propio servidor** con Docker.

```
┌─────────────────────────────────────┐
│   Vercel (Next.js App)              │
│   https://motusdao-hub.vercel.app   │
│   └─ /videochat (página)             │
│   └─ /api/jitsi/token (API)         │
└─────────────────────────────────────┘
              │
              │ Conecta a
              ▼
┌─────────────────────────────────────┐
│   Servidor Jitsi (Docker)          │
│   https://videochat.motusdao.org    │
│   o http://localhost:8080 (local)   │
│   └─ Jitsi Meet Web Interface       │
│   └─ Prosody (XMPP)                  │
│   └─ JVB (Videobridge)               │
└─────────────────────────────────────┘
```

## Configuración Actual

### 1. Next.js en Vercel
- **URL:** `https://motusdao-hub.vercel.app`
- **Página de videochat:** `https://motusdao-hub.vercel.app/videochat`
- **API de tokens:** `https://motusdao-hub.vercel.app/api/jitsi/token`

### 2. Servidor Jitsi (Necesita Configurarse)

Tienes dos opciones:

#### Opción A: Desarrollo Local
- **URL:** `http://localhost:8080` (en tu máquina)
- **Uso:** Para desarrollo y pruebas

#### Opción B: Producción (Recomendado)
- **URL:** `https://videochat.motusdao.org` (servidor dedicado)
- **Requisitos:** 
  - Servidor con Docker (DigitalOcean, AWS, etc.)
  - Dominio configurado
  - SSL con Let's Encrypt

## Configuración Paso a Paso

### Para Desarrollo Local

#### 1. Configurar Jitsi Local

```bash
cd jitsi
./setup.sh
```

Esto creará `jitsi/.env` con:
```env
PUBLIC_URL=http://localhost:8080
HTTP_PORT=8080
ENABLE_LETSENCRYPT=0
JWT_APP_ID=motusdao
JWT_APP_SECRET=<generado-automáticamente>
```

#### 2. Iniciar Jitsi

```bash
docker-compose up -d
```

#### 3. Configurar Vercel (Variables de Entorno)

En el dashboard de Vercel, agrega estas variables:

```env
# Para desarrollo local (cuando pruebas localmente)
NEXT_PUBLIC_JITSI_DOMAIN=localhost:8080
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<el-secret-de-jitsi/.env>
```

**⚠️ IMPORTANTE:** Para desarrollo local, necesitas ejecutar Next.js localmente también, porque Vercel no puede conectarse a `localhost:8080`.

### Para Producción

#### 1. Configurar Servidor Jitsi

**⚠️ IMPORTANTE:** Para producción necesitas un servidor dedicado (DigitalOcean, AWS EC2, etc.) porque:
- Jitsi debe estar corriendo 24/7
- Vercel no puede ejecutar Docker
- Necesitas control de puertos (80, 443, 10000/udp, 4443/tcp)

**Para desarrollo local:** Puedes usar Docker en tu computadora con `localhost:8080` (ver sección de desarrollo arriba).

**Servidor requerido:**
- Docker instalado
- Dominio apuntando al servidor (ej: `videochat.motusdao.org` - subdominio de motusdao.org)
- Puertos abiertos: 80, 443, 10000/udp, 4443/tcp

En el servidor:

```bash
cd jitsi
cp env.example .env
nano .env
```

Configura `.env`:
```env
PUBLIC_URL=https://videochat.motusdao.org
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=videochat.motusdao.org
LETSENCRYPT_EMAIL=tu-email@example.com
HTTP_PORT=80
HTTPS_PORT=443
JWT_APP_ID=motusdao
JWT_APP_SECRET=<genera-con-openssl-rand-hex-32>
```

Inicia Jitsi:
```bash
docker-compose up -d
```

#### 2. Configurar Vercel (Variables de Entorno)

En el dashboard de Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_JITSI_DOMAIN=videochat.motusdao.org
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<el-mismo-secret-que-en-jitsi/.env>
```

**⚠️ CRÍTICO:** `JITSI_APP_SECRET` en Vercel debe ser **exactamente igual** a `JWT_APP_SECRET` en el servidor Jitsi.

**Nota:** Los nombres son diferentes (`JITSI_APP_SECRET` vs `JWT_APP_SECRET`), pero el **valor** debe ser idéntico. Ver `JITSI_FAQ.md` para más detalles.

## Flujo de Funcionamiento

1. **Usuario visita:** `https://motusdao-hub.vercel.app/videochat`
2. **Next.js (Vercel):**
   - Carga la página `/videochat`
   - Llama a `/api/jitsi/token` para generar JWT
   - Usa `NEXT_PUBLIC_JITSI_DOMAIN` para saber dónde está Jitsi
3. **Jitsi (Servidor separado):**
   - Recibe la conexión del navegador
   - Valida el JWT token
   - Establece la videollamada

## Solución al Error del Script

El script estaba buscando `.env.example` pero el archivo es `env.example`. Ya está corregido.

Ahora puedes ejecutar:

```bash
cd jitsi
./setup.sh
```

## Opciones de Hosting para Jitsi

### 1. DigitalOcean Droplet (Recomendado)
- **Costo:** ~$12/mes (4GB RAM)
- **Ventajas:** Fácil de configurar, buena documentación
- **Pasos:**
  1. Crear Droplet con Ubuntu
  2. Instalar Docker
  3. Clonar/copiar archivos de `jitsi/`
  4. Ejecutar `./setup.sh`

### 2. AWS EC2
- **Costo:** ~$10-20/mes (t3.medium)
- **Ventajas:** Integración con otros servicios AWS
- **Pasos:** Similar a DigitalOcean

### 3. Google Cloud Platform
- **Costo:** Similar a AWS
- **Ventajas:** Integración con GCP

### 4. Servidor Propio
- Si ya tienes un servidor, solo necesitas Docker

## Checklist de Configuración

### Desarrollo Local
- [ ] Docker instalado localmente
- [ ] Ejecutar `./setup.sh` en `jitsi/`
- [ ] Jitsi corriendo en `localhost:8080`
- [ ] Next.js `.env.local` configurado con `localhost:8080`
- [ ] Probar localmente: `npm run dev`

### Producción
- [ ] Servidor con Docker configurado
- [ ] Dominio apuntando al servidor
- [ ] Jitsi corriendo en el servidor
- [ ] SSL funcionando (Let's Encrypt)
- [ ] Variables de entorno en Vercel configuradas
- [ ] `JITSI_APP_SECRET` coincide entre Vercel y servidor Jitsi
- [ ] Probar desde `https://motusdao-hub.vercel.app/videochat`

## Resumen

1. **Vercel:** Solo aloja Next.js → `https://motusdao-hub.vercel.app`
2. **Jitsi:** Necesita servidor separado → `https://videochat.motusdao.org` (o `localhost:8080` para local)
3. **Conexión:** Next.js en Vercel se conecta al servidor Jitsi usando `NEXT_PUBLIC_JITSI_DOMAIN`
4. **Autenticación:** JWT tokens generados en Vercel, validados en Jitsi

## Próximos Pasos

1. ✅ Script corregido (busca `env.example` correctamente)
2. ⏭️ Ejecutar `./setup.sh` en `jitsi/`
3. ⏭️ Configurar servidor de producción (si no es solo local)
4. ⏭️ Configurar variables de entorno en Vercel
5. ⏭️ Probar la conexión

