# Cómo Habilitar JWT en tu Servidor Jitsi

## Problema Detectado

Tu `docker-compose.yml` tiene JWT deshabilitado con valores hardcodeados:
- `ENABLE_AUTH=0`
- `AUTH_TYPE=anonymous`

## Solución: Actualizar docker-compose.yml

### Paso 1: Abre el archivo

```bash
cd ~/jitsi-meet
nano docker-compose.yml
# o usa tu editor favorito: code docker-compose.yml, vim docker-compose.yml, etc.
```

### Paso 2: Busca y actualiza el servicio `web`

Busca la sección del servicio `web` y cambia:

**ANTES:**
```yaml
environment:
  - ENABLE_AUTH=0
```

**DESPUÉS:**
```yaml
environment:
  - ENABLE_AUTH=1
  - JWT_APP_ID=${JWT_APP_ID}
  - JWT_APP_SECRET=${JWT_APP_SECRET}
```

### Paso 3: Busca y actualiza el servicio `prosody`

Busca la sección del servicio `prosody` y cambia:

**ANTES:**
```yaml
environment:
  - AUTH_TYPE=anonymous
  - ENABLE_AUTH=0
  - ENABLE_GUESTS=1
  - XMPP_DOMAIN=meet.jitsi
  # ... otras variables
```

**DESPUÉS:**
```yaml
environment:
  - AUTH_TYPE=jwt
  - ENABLE_AUTH=1
  - ENABLE_GUESTS=1
  - XMPP_DOMAIN=meet.jitsi
  - JWT_APP_ID=${JWT_APP_ID}
  - JWT_APP_SECRET=${JWT_APP_SECRET}
  - JWT_ALLOW_EMPTY=0
  # ... otras variables
```

### Paso 4: Verifica que el .env tenga las variables

Asegúrate de que `~/jitsi-meet/.env` tenga:

```env
JWT_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
JWT_APP_ID=motusdao
```

### Paso 5: Reinicia el servidor

```bash
cd ~/jitsi-meet
docker-compose down
docker-compose up -d
```

### Paso 6: Verifica la configuración

```bash
cd ~/motusdao-hub
./scripts/test-jitsi-jwt.sh
```

Deberías ver:
```
✅ JITSI_APP_ID coincide con JWT_APP_ID
✅ JITSI_APP_SECRET coincide con JWT_APP_SECRET
✅ ¡Todas las variables coinciden correctamente!
```

## Resumen de Cambios Necesarios

| Servicio | Variable | Valor Anterior | Valor Nuevo |
|----------|----------|----------------|-------------|
| `web` | `ENABLE_AUTH` | `0` | `1` |
| `web` | `JWT_APP_ID` | (no existe) | `${JWT_APP_ID}` |
| `web` | `JWT_APP_SECRET` | (no existe) | `${JWT_APP_SECRET}` |
| `prosody` | `AUTH_TYPE` | `anonymous` | `jwt` |
| `prosody` | `ENABLE_AUTH` | `0` | `1` |
| `prosody` | `JWT_APP_ID` | (no existe) | `${JWT_APP_ID}` |
| `prosody` | `JWT_APP_SECRET` | (no existe) | `${JWT_APP_SECRET}` |
| `prosody` | `JWT_ALLOW_EMPTY` | (no existe) | `0` |

## Nota Importante

Después de hacer estos cambios, el servidor Jitsi **requerirá JWT** para acceder a las salas. Asegúrate de que:
1. ✅ Next.js tenga `JITSI_APP_SECRET` y `JITSI_APP_ID` configurados
2. ✅ Los valores coincidan exactamente entre servidor y Next.js
3. ✅ Reinicies ambos servicios después de los cambios

## Si Algo Sale Mal

Puedes restaurar el backup:
```bash
cd ~/jitsi-meet
cp docker-compose.yml.backup.* docker-compose.yml
docker-compose restart
```

