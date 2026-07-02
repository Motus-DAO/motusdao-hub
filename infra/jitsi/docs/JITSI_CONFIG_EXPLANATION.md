# Explicación de Variables Jitsi

## Diferencia entre JWT_APP_SECRET y JITSI_APP_SECRET

### En el Servidor Jitsi (Docker)
- **Variable:** `JWT_APP_SECRET` (en el archivo `.env` del servidor Jitsi)
- **Ubicación:** `~/jitsi-meet/.env`
- **Uso:** Configuración interna del servidor Jitsi

### En Next.js (Tu aplicación)
- **Variable:** `JITSI_APP_SECRET` (en `.env.local`)
- **Ubicación:** `/Users/main/motusdao-hub/.env.local`
- **Uso:** Para generar tokens JWT que el servidor Jitsi validará

## ⚠️ IMPORTANTE: Ambos deben tener el MISMO valor

Si tu servidor Jitsi tiene:
```env
JWT_APP_SECRET=abc123...
```

Tu Next.js debe tener:
```env
JITSI_APP_SECRET=abc123...  # MISMO valor
JITSI_APP_ID=motusdao        # MISMO valor que en el servidor
```

## Verificación

1. **Servidor Jitsi** (`~/jitsi-meet/.env`):
   ```env
   JWT_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
   JWT_APP_ID=motusdao
   ```

2. **Next.js** (`.env.local`):
   ```env
   JITSI_APP_SECRET=c6b107c1299735a3f3b24c518febdc72de379d2181777d671603c78da6836ab1
   JITSI_APP_ID=motusdao
   ```

## Solución al Error de Autenticación

Si recibes "autenticación falló", verifica:

1. ✅ Los valores coinciden exactamente (sin espacios extra)
2. ✅ El servidor Jitsi tiene `ENABLE_AUTH=1` y `AUTH_TYPE=jwt`
3. ✅ El servidor Jitsi tiene `JWT_ALLOW_EMPTY=0` (requiere JWT)
4. ✅ Reiniciaste el servidor Jitsi después de cambiar variables: `docker-compose restart`










