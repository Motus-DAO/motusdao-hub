# Instrucciones para Acceder al Dashboard Admin

## ✅ Usuario Admin Creado

Tu usuario admin ha sido creado con las siguientes direcciones:
- **EOA MetaMask**: `0x979b2363895FC246ce5eafDe5f6785a2F364CbB0`
- **Smart Wallet ZeroDev**: `0xf4161CeC600885D11dAD862e41E6FcF00421e79f`
- **Email temporal**: `admin-979b2363@motusdao.local`
- **Rol**: `admin`

## 🔐 Pasos para Acceder

### Opción 1: Sincronización Automática (Recomendado)

1. **Inicia sesión en la plataforma**:
   - Ve a la página principal
   - Conecta MetaMask con la wallet `0x979b2363895FC246ce5eafDe5f6785a2F364CbB0`
   - Completa el proceso de login con Privy

2. **Obtén tu PrivyId**:
   - Abre la consola del navegador (F12)
   - Ejecuta: `window.privy?.user?.id`
   - Copia el `privyId` que aparece

3. **Sincroniza el PrivyId**:
   ```bash
   npm run update-privy-id -- <tu-privy-id>
   ```

4. **Accede al dashboard**:
   - Navega a `/admin`
   - Deberías tener acceso completo

### Opción 2: Sincronización desde el Navegador

Si prefieres hacerlo desde el navegador:

1. **Inicia sesión** en la plataforma con MetaMask

2. **Abre la consola** (F12) y ejecuta:
   ```javascript
   const privyId = window.privy?.user?.id;
   const eoaAddress = '0x979b2363895FC246ce5eafDe5f6785a2F364CbB0';
   
   fetch('/api/admin/sync-privy-id', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ eoaAddress, privyId })
   })
   .then(r => r.json())
   .then(data => console.log('✅ PrivyId sincronizado:', data))
   .catch(err => console.error('❌ Error:', err));
   ```

3. **Accede al dashboard**:
   - Navega a `/admin`
   - Deberías tener acceso completo

## 🔍 Verificar Estado

Para verificar el estado de tu usuario admin:

```bash
npm run assign-admin-wallet
```

Este comando mostrará:
- Si el usuario existe
- El rol actual
- Si tiene privyId asignado

## 🛠️ Scripts Disponibles

- `npm run assign-admin-wallet` - Verifica y asigna rol admin a usuario existente
- `npm run create-admin-wallet` - Crea nuevo usuario admin con wallets
- `npm run update-privy-id -- <privyId>` - Actualiza el privyId de un usuario

## ⚠️ Solución de Problemas

### Error: "Acceso Denegado"

**Causa**: El usuario no tiene `privyId` asignado o el `privyId` no coincide.

**Solución**:
1. Verifica que hayas iniciado sesión con Privy
2. Obtén tu `privyId` desde la consola: `window.privy?.user?.id`
3. Ejecuta: `npm run update-privy-id -- <tu-privy-id>`

### Error: "User not found"

**Causa**: El usuario no existe en la base de datos.

**Solución**:
1. Ejecuta: `npm run create-admin-wallet`
2. Luego sigue los pasos de sincronización

### El privyId no se actualiza automáticamente

**Causa**: El sistema solo actualiza el `privyId` durante el onboarding completo.

**Solución**:
- Usa el script `npm run update-privy-id` manualmente
- O usa el endpoint `/api/admin/sync-privy-id` desde el navegador

## 📝 Notas Importantes

1. **El privyId es necesario**: El sistema de autenticación admin requiere `privyId` para verificar el acceso.

2. **Actualización automática**: Si completas el onboarding completo, el `privyId` se actualizará automáticamente.

3. **Email temporal**: El email `admin-979b2363@motusdao.local` es temporal. Puedes actualizarlo desde el panel de admin una vez que tengas acceso.

4. **Seguridad**: Asegúrate de mantener tu wallet segura. Solo usuarios con rol `admin` pueden acceder al dashboard.










