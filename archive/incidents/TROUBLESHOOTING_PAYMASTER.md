# 🔧 Troubleshooting: Paymaster no se aplica

## ✅ Diagnóstico Completado

### Estado Actual:
- ✅ PIMLICO_API_KEY configurada correctamente
- ✅ Endpoints de API funcionando (`/api/pimlico/paymaster`, `/api/pimlico/bundler`)
- ✅ Pimlico tiene créditos activos
- ✅ Paymaster responde correctamente: `0x777777777777AeC03fd955926DbF81597e66834C`
- ❌ **El frontend NO está usando el paymaster**

### Problema Identificado:
El error muestra:
```
paymasterAndData: 0x  ← Vacío (no se está aplicando)
callGasLimit: 0       ← Gas estimation fallando
verificationGasLimit: 0
preVerificationGas: 0
```

Esto significa que **la transacción se está enviando SIN paymaster**.

---

## 🔍 Causas Posibles

### 1. Smart Wallet no inicializada correctamente
El `kernelClient` puede no estar completamente configurado.

### 2. Usando wallet incorrecta
Podría estar usando el EOA directamente en lugar del smart wallet.

### 3. Paymaster no configurado en el client
El `kernelClient` no tiene el paymaster client configurado.

---

## 🚀 Solución

### Paso 1: Verificar en Consola del Navegador

Abre tu aplicación en: http://localhost:3000/motus-names

Abre DevTools (F12) y busca en la consola:

**✅ DEBES VER ESTOS LOGS:**
```
[ZERODEV] ✅ Paymaster configured - gasless transactions enabled
[ZERODEV] Smart account client created: 0x...
[ZERODEV] 💰 getPaymasterData called with args: { sender: ... }
```

**❌ SI VES ESTOS ERRORES:**
```
[ZERODEV] Smart wallet not found
[ZERODEV] ⚠️ Smart wallet not initialized
```

### Paso 2: Forzar Re-inicialización

Si el smart wallet no se inicializa:

1. **Cierra sesión** en Privy
2. **Limpia localStorage**:
   - En DevTools → Application → Storage → Clear site data
3. **Vuelve a iniciar sesión**
4. **Espera 10 segundos** a que se cree el smart wallet
5. Verifica en consola que veas: `[ZERODEV] ✅ Smart account client created`

### Paso 3: Verificar Smart Wallet Address

En la página `/motus-names`, debes ver tu **Smart Wallet Address**.

**NO debe ser tu EOA** (que empieza con 0x1f93... o tu wallet de MetaMask).

Ejemplo correcto:
```
Smart Wallet: 0x3B926D3E21c539Df9ADf7c2436F17D304C889c2A
```

### Paso 4: Test de Paymaster

Antes de registrar un nombre, verifica que el paymaster esté activo:

```typescript
// En la consola del navegador (DevTools)
console.log('KernelClient:', window.kernelClient)
console.log('Paymaster configurado:', window.kernelClient?.paymaster)
```

---

## 🐛 Debugging Avanzado

### Ver estado completo del Smart Account:

1. Abre: http://localhost:3000/motus-names
2. Abre DevTools (F12) → Console
3. Ejecuta:

```javascript
// Ver contexto de ZeroDev
const context = window.zeroDevContext;
console.log('Smart Account:', context);
console.log('kernelClient:', context?.kernelClient);
console.log('smartAccountAddress:', context?.smartAccountAddress);
console.log('isInitializing:', context?.isInitializing);
console.log('error:', context?.error);
```

### Logs esperados al registrar nombre:

```
[ZERODEV] 📝 Aprobando cUSD para registro...
[ZERODEV] 💰 getPaymasterData called with args: { sender: 0x3B92... }
[PIMLICO PAYMASTER PROXY] ✅ API key found
[PIMLICO PAYMASTER PROXY] 📋 Received userOperation
[PIMLICO PAYMASTER PROXY] ✅ Paymaster response
[ZERODEV] ✅ Aprobación confirmada
[ZERODEV] 📝 Registrando nombre en MNS...
```

---

## 💡 Soluciones Comunes

### Problema: "kernelClient is null"
**Solución:**
- El smart wallet aún no se ha inicializado
- Espera 10-15 segundos después de iniciar sesión
- Verifica que tu wallet esté conectada a Celo Mainnet (Chain ID: 42220)

### Problema: "paymasterAndData: 0x"
**Solución:**
- El paymaster no se está aplicando
- Verifica logs en consola
- Asegúrate de estar usando `sendPaymentWithKernel()` o `kernelClient.sendUserOperation()`
- NO uses métodos de viem directo como `walletClient.sendTransaction()`

### Problema: "AA21 didn't pay prefund"
**Solución:**
- La smart wallet no tiene fondos Y el paymaster no se aplicó
- Esto sucede cuando el paymaster no se configura correctamente
- Verifica que `getPaymasterData` se esté llamando

### Problema: Gas limits en 0
**Solución:**
- La estimación de gas falló
- Esto puede suceder si el bundler no está accesible
- Verifica logs del bundler en consola

---

## 🔧 Fix Manual (si persiste)

Si después de todo esto el paymaster aún no funciona, el problema puede estar en cómo se inicializa el `kernelClient`.

### Verificar archivo: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

El paymaster DEBE estar configurado así:

```typescript
const client = createKernelAccountClient({
  account,
  chain: FORCED_CHAIN,
  bundlerTransport: bundlerTransport,
  paymaster: paymasterClient, // ← DEBE estar presente
  client: publicClient,
})
```

### Verificar que se llame correctamente:

En `lib/motus-name-service.ts`, la función `registerName` DEBE usar:

```typescript
await kernelClient.sendUserOperation({
  calls: [{ to, value, data }]
})
```

**NO usar:**
```typescript
// ❌ Esto NO usa paymaster
await walletClient.sendTransaction({ to, value, data })
```

---

## 📞 Si Nada Funciona

1. **Reinicia el servidor**:
   ```bash
   # Ctrl+C para detener
   npm run dev
   ```

2. **Limpia caché de Next.js**:
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Verifica variables de entorno**:
   ```bash
   grep PIMLICO .env.local
   # Debe mostrar: PIMLICO_API_KEY=pim_...
   ```

4. **Revisa logs del servidor Next.js**
   - Los logs de `[PIMLICO PAYMASTER PROXY]` deben aparecer
   - Si no aparecen, el frontend no está llamando a `/api/pimlico/paymaster`

---

## ✅ Confirmación de que Funciona

Cuando todo esté bien, al registrar un nombre verás:

1. ✅ Logs de `[ZERODEV] 💰 getPaymasterData called`
2. ✅ Logs de `[PIMLICO PAYMASTER PROXY] ✅ Paymaster response`
3. ✅ La transacción se completa SIN error de fondos
4. ✅ Tu smart wallet NO pierde CELO (el gas fue patrocinado)

---

**Si sigues teniendo problemas, comparte los logs de la consola del navegador para diagnóstico detallado.**



