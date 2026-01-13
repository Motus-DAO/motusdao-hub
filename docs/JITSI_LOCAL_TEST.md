# Guía de Prueba Local de Jitsi con JWT

## ✅ Variables que Necesitas

### En Next.js (`.env.local`)
```env
NEXT_PUBLIC_JITSI_DOMAIN=localhost:8080
NEXT_PUBLIC_JITSI_ROOM_PREFIX=motusdao-
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
```

### En Servidor Jitsi (`~/jitsi-meet/.env`)
```env
JWT_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
JWT_APP_ID=motusdao
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_ALLOW_EMPTY=0

# Estas solo se usan en el servidor (NO las necesitas en Next.js):
JVB_AUTH_PASSWORD=384b3ffddefda5cf59354a6a06cf9857
JVB_AUTH_TOKEN=abdb127c9cbb22374d01c773d6ac1206
JICOFO_AUTH_PASSWORD=03775d869901fff810ef19b08aeeda71
```

## 🔍 Verificación Rápida

Ejecuta el script de verificación:
```bash
./scripts/test-jitsi-jwt.sh
```

Este script verifica que:
- ✅ Las variables existan en ambos lugares
- ✅ Los valores coincidan exactamente
- ✅ Todo esté configurado correctamente

## 🧪 Pasos para Probar

### 1. Verificar que el servidor Jitsi esté corriendo
```bash
cd ~/jitsi-meet
docker-compose ps
```

Deberías ver 3 servicios corriendo: `web`, `prosody`, `jvb`

### 2. Verificar que puedas acceder al servidor
Abre en tu navegador: `http://localhost:8080`

Deberías ver la interfaz de Jitsi Meet (puede pedirte autenticación si JWT está habilitado)

### 3. Verificar variables del servidor
```bash
cd ~/jitsi-meet
cat .env | grep JWT
```

Deberías ver:
```
JWT_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
JWT_APP_ID=motusdao
```

### 4. Verificar variables de Next.js
```bash
cd ~/motusdao-hub
cat .env.local | grep JITSI
```

Deberías ver:
```
JITSI_APP_ID=motusdao
JITSI_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
```

### 5. Reiniciar servidor Jitsi (si cambiaste variables)
```bash
cd ~/jitsi-meet
docker-compose restart
```

### 6. Iniciar Next.js
```bash
cd ~/motusdao-hub
npm run dev
```

### 7. Probar en el navegador
1. Abre `http://localhost:3000/videochat`
2. Abre la consola del navegador (F12 → Console)
3. Busca estos mensajes:
   - ✅ `JWT token generado correctamente` = Todo bien
   - ✅ `Conectado exitosamente a la sala` = Autenticación exitosa
   - ❌ `Error de autenticación JWT` = Valores no coinciden

## 🐛 Solución de Problemas

### Error: "autenticación falló"

**Causa:** Los valores de `JWT_APP_SECRET` y `JITSI_APP_SECRET` no coinciden

**Solución:**
1. Verifica que ambos tengan exactamente el mismo valor (sin espacios, sin comillas)
2. Reinicia el servidor Jitsi: `docker-compose restart`
3. Reinicia Next.js: `npm run dev`

### Error: "JWT token no disponible"

**Causa:** Las variables `JITSI_APP_SECRET` o `JITSI_APP_ID` no están en `.env.local`

**Solución:**
1. Verifica que las variables estén en `.env.local`
2. Reinicia Next.js (las variables de entorno solo se cargan al iniciar)

### El servidor Jitsi no inicia

**Causa:** Problemas con docker-compose o puertos ocupados

**Solución:**
```bash
cd ~/jitsi-meet
docker-compose down
docker-compose up -d
docker-compose logs -f
```

### Puedo acceder a localhost:8080 pero no desde Next.js

**Causa:** El servidor Jitsi está en modo "sin autenticación" pero Next.js está enviando JWT

**Solución:**
1. Verifica que `ENABLE_AUTH=1` y `AUTH_TYPE=jwt` en el servidor
2. Verifica que `JWT_ALLOW_EMPTY=0` (requiere JWT)

## ✅ Checklist de Verificación

Antes de pasar a producción, verifica:

- [ ] Servidor Jitsi corriendo (`docker-compose ps`)
- [ ] Variables coinciden (ejecuta `./scripts/test-jitsi-jwt.sh`)
- [ ] Puedes acceder a `http://localhost:8080`
- [ ] Puedes crear una sala desde Next.js (`/videochat`)
- [ ] No aparece error de autenticación en la consola
- [ ] La sala no se desconecta después de 5 minutos
- [ ] Puedes unirte desde múltiples pestañas/dispositivos

## 📝 Notas Importantes

1. **JVB_AUTH_PASSWORD, JVB_AUTH_TOKEN, JICOFO_AUTH_PASSWORD**: Estas variables SOLO se usan en el servidor Jitsi para comunicación interna. NO las necesitas en Next.js.

2. **JWT_APP_SECRET vs JITSI_APP_SECRET**: Son el mismo valor, pero diferentes nombres:
   - `JWT_APP_SECRET` = En el servidor Jitsi
   - `JITSI_APP_SECRET` = En Next.js

3. **Reiniciar después de cambios**: Siempre reinicia ambos servicios después de cambiar variables de entorno.

## 🚀 Siguiente Paso: Producción

Una vez que todo funcione en local, sigue la guía en `JITSI_SETUP.md` para configurar en producción con un dominio real.










