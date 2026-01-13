# Solución: Error de Autenticación en Jitsi

## Problema
Recibes el error: "autenticación falló, no estás permitido entrar a esa llamada"

## Causa
El servidor Jitsi está configurado para requerir JWT, pero:
1. Los valores no coinciden entre servidor y Next.js
2. El servidor no está configurado correctamente
3. El token JWT no se está generando correctamente

## Solución Rápida (Desarrollo Local)

### Opción 1: Deshabilitar JWT en el Servidor (Más Fácil)

Si solo quieres probar localmente sin JWT:

1. **Edita el `.env` del servidor Jitsi** (`~/jitsi-meet/.env`):
```env
ENABLE_AUTH=0
AUTH_TYPE=anonymous
```

2. **Reinicia el servidor Jitsi**:
```bash
cd ~/jitsi-meet
docker-compose restart
```

3. **En Next.js, NO necesitas JWT** - el código funcionará sin token

### Opción 2: Configurar JWT Correctamente (Recomendado)

#### Paso 1: Verificar valores en el servidor Jitsi

Edita `~/jitsi-meet/.env` y asegúrate de tener:

```env
# JWT Configuration
JWT_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
JWT_APP_ID=motusdao

# Authentication
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_ALLOW_EMPTY=0  # Requiere JWT (no permite acceso sin token)
```

#### Paso 2: Verificar valores en Next.js

Tu `.env.local` debe tener:

```env
JITSI_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
JITSI_APP_ID=motusdao
```

**⚠️ IMPORTANTE:** Los valores deben ser EXACTAMENTE iguales (sin espacios, sin comillas)

#### Paso 3: Verificar docker-compose.yml

Asegúrate de que `docker-compose.yml` pase las variables:

```yaml
environment:
  - JWT_APP_ID=${JWT_APP_ID}
  - JWT_APP_SECRET=${JWT_APP_SECRET}
  - ENABLE_AUTH=${ENABLE_AUTH:-1}
  - AUTH_TYPE=${AUTH_TYPE:-jwt}
```

#### Paso 4: Reiniciar todo

```bash
# Reiniciar servidor Jitsi
cd ~/jitsi-meet
docker-compose down
docker-compose up -d

# Reiniciar Next.js
cd ~/motusdao-hub
npm run dev
```

## Verificación

1. **Abre la consola del navegador** (F12) y ve a la pestaña "Console"
2. **Navega a `/videochat`**
3. **Busca estos mensajes:**
   - ✅ `JWT token generado correctamente` = Todo bien
   - ⚠️ `JWT token no disponible` = JWT no configurado (modo sin auth)
   - ❌ Error de autenticación = Valores no coinciden

## Debug

### Ver logs del servidor Jitsi:
```bash
cd ~/jitsi-meet
docker-compose logs -f prosody
```

### Ver logs de Next.js:
Revisa la consola del navegador y los logs del servidor Next.js

### Verificar que el token se genera:
```bash
# En otra terminal, prueba el endpoint
curl -X POST http://localhost:3000/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test-room"}'
```

Deberías recibir un JSON con `{"success":true,"token":"..."}`

## Resumen de Variables

| Ubicación | Variable | Valor |
|-----------|----------|-------|
| Servidor Jitsi `.env` | `JWT_APP_SECRET` | `c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1` |
| Next.js `.env.local` | `JITSI_APP_SECRET` | `c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1` |
| Servidor Jitsi `.env` | `JWT_APP_ID` | `motusdao` |
| Next.js `.env.local` | `JITSI_APP_ID` | `motusdao` |

## Si Nada Funciona

1. **Deshabilita JWT temporalmente** (Opción 1 arriba)
2. **Verifica que el servidor Jitsi esté corriendo**: `docker-compose ps`
3. **Verifica que puedas acceder a `http://localhost:8080`** sin problemas
4. **Prueba crear una sala directamente en `http://localhost:8080`** (sin Next.js)










