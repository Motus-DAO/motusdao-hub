# Probar Jitsi en Producción HOY - Sin Contratar Servicio

## 🚀 Opción Rápida: Docker Local + Túnel (Recomendado para HOY)

Esta es la forma más rápida de tener Jitsi accesible desde internet HOY sin contratar un servidor.

### Paso 1: Instalar ngrok (Túnel gratuito)

```bash
# macOS
brew install ngrok

# O descargar desde: https://ngrok.com/download
```

### Paso 2: Configurar Jitsi Local

```bash
cd jitsi
./setup.sh
docker-compose up -d
```

Esto iniciará Jitsi en `localhost:8080`

### Paso 3: Crear Túnel con ngrok

```bash
# En una nueva terminal
ngrok http 8080
```

Esto te dará una URL pública como:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8080
```

### Paso 4: Configurar Next.js

En tu `.env.local`:

```env
# Usar la URL de ngrok (cambia cada vez que reinicias ngrok)
NEXT_PUBLIC_JITSI_DOMAIN=abc123.ngrok.io
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=<el-secret-de-jitsi/.env>
```

**⚠️ IMPORTANTE:** 
- La URL de ngrok cambia cada vez que reinicias ngrok (gratis)
- Para URL fija, necesitas cuenta ngrok Pro ($8/mes) o usar otra opción

### Paso 5: Actualizar jitsi/.env

Edita `jitsi/.env`:

```env
PUBLIC_URL=https://abc123.ngrok.io
ENABLE_LETSENCRYPT=0  # No necesitas SSL con ngrok (ya viene con HTTPS)
HTTP_PORT=8080
```

Reinicia Jitsi:
```bash
cd jitsi
docker-compose restart
```

### Paso 6: Probar

1. Inicia Next.js: `npm run dev`
2. Visita: `http://localhost:3000/videochat`
3. Comparte la URL de ngrok con tu equipo
4. Todos pueden conectarse desde internet

---

## 🔄 Alternativa: localtunnel (Gratis, URL más estable)

### Instalar localtunnel

```bash
npm install -g localtunnel
```

### Crear túnel

```bash
lt --port 8080 --subdomain motusdao-jitsi
```

Esto te dará: `https://motusdao-jitsi.loca.lt`

**Ventajas:**
- URL más estable (mismo subdominio si está disponible)
- Gratis
- No requiere cuenta

**Desventajas:**
- Puede pedir "Continue" la primera vez (página intermedia)

---

## 📋 Checklist Rápido

- [ ] Instalar ngrok o localtunnel
- [ ] Ejecutar `./setup.sh` en `jitsi/`
- [ ] Iniciar Jitsi: `docker-compose up -d`
- [ ] Crear túnel: `ngrok http 8080` o `lt --port 8080`
- [ ] Copiar URL del túnel
- [ ] Actualizar `jitsi/.env` con `PUBLIC_URL=https://tunel-url`
- [ ] Actualizar `.env.local` con `NEXT_PUBLIC_JITSI_DOMAIN=tunel-url`
- [ ] Reiniciar Jitsi: `docker-compose restart`
- [ ] Probar: `npm run dev` y visitar `/videochat`

---

## ⚠️ Limitaciones de esta Solución

1. **URL cambia** (ngrok gratis): Cada vez que reinicias ngrok, la URL cambia
2. **Tu computadora debe estar encendida**: Si apagas tu PC, el túnel se cae
3. **No es para producción real**: Es solo para pruebas

---

## 🎯 Para Producción Real (Después)

Cuando estés listo para producción permanente:

1. **Contratar servidor** (DigitalOcean ~$12/mes)
2. **Configurar dominio** (`videochat.motusdao.org`)
3. **Migrar configuración** del túnel al servidor

---

## 🚀 Comandos Rápidos (Copia y Pega)

```bash
# Terminal 1: Jitsi
cd jitsi
./setup.sh
docker-compose up -d

# Terminal 2: Túnel
ngrok http 8080
# Copia la URL que aparece (ej: https://abc123.ngrok.io)

# Terminal 3: Editar configuración
# Edita jitsi/.env:
# PUBLIC_URL=https://abc123.ngrok.io

# Edita .env.local:
# NEXT_PUBLIC_JITSI_DOMAIN=abc123.ngrok.io
# JITSI_APP_SECRET=<del-jitsi/.env>
# JITSI_APP_ID=motusdao

# Reiniciar Jitsi
cd jitsi
docker-compose restart

# Terminal 4: Next.js
npm run dev
```

---

## 💡 Tip: URL Fija con ngrok

Si quieres URL fija (no cambia):

1. Crear cuenta en ngrok.com (gratis)
2. Obtener authtoken
3. Configurar: `ngrok config add-authtoken TU_TOKEN`
4. Usar: `ngrok http 8080 --domain=tu-dominio.ngrok-free.app`

O mejor aún, usar localtunnel con subdominio personalizado.









