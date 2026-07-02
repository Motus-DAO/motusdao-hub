# ZeroDev Mainnet Limitation - Plan Gratuito

## Problema Identificado

**ZeroDev en el plan gratuito NO permite usar mainnet**, incluso con:
- ✅ Contratos de paymaster fondeados directamente
- ✅ Parámetro `selfFunded=true`
- ✅ Depósitos en Celo Mainnet

El error que recibes:
```
"You have hit your monthly gas sponsorship limit. Please upgrade your billing plan."
```

Esto ocurre porque **ZeroDev API bloquea el acceso a mainnet en el plan gratuito**, independientemente de si tienes los contratos fondeados.

## Contratos Fondeados

Tienes dos paymasters fondeados en Celo Mainnet:

1. **Verifying Paymaster**: `0x7d5BC773220165457536fCBb907722ef7487c840`
   - Fondeado con: 1.1 CELO
   - Para transacciones nativas (CELO)

2. **ERC20 Paymaster**: `0xEb2142cAc0B6b434dD4E004B269b4cD1F6653394`
   - Fondeado con: 1 CELO
   - Para transacciones con tokens ERC20

## Soluciones Posibles

### Opción 1: Usar Pimlico como Paymaster Alternativo (Recomendado)

Pimlico permite self-funded en mainnet sin restricciones del plan gratuito.

**Pasos:**
1. Crea una cuenta en [Pimlico Dashboard](https://dashboard.pimlico.io)
2. Obtén tu API key
3. Configura el paymaster en el código (ver abajo)
4. Fondea el paymaster de Pimlico con CELO

**Ventajas:**
- ✅ Funciona en mainnet con plan gratuito
- ✅ Soporta self-funded
- ✅ Compatible con Kernel/ZeroDev
- ✅ Buena documentación

### Opción 2: Actualizar Plan de ZeroDev

Si quieres seguir usando ZeroDev:
1. Actualiza tu plan en ZeroDev Dashboard
2. Esto te permitirá usar mainnet
3. Puedes seguir usando los contratos que ya fondeaste

**Desventajas:**
- ❌ Requiere pago mensual
- ❌ Puede ser costoso para desarrollo

### Opción 3: Usar Contrato de Paymaster Directamente (Avanzado)

Implementar un cliente de paymaster personalizado que use el contrato directamente, sin pasar por la API de ZeroDev.

**Complejidad:** Alta - requiere implementar toda la lógica del paymaster manualmente.

## Implementación: Usar Pimlico

Si decides usar Pimlico, aquí está la configuración:

### 1. Instalar dependencias (si no están):
```bash
npm install @pimlico/sdk
```

### 2. Actualizar el código del provider:

```typescript
import { createPimlicoPaymasterClient } from '@pimlico/sdk'

// En lugar de ZeroDev paymaster:
const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY
if (pimlicoApiKey) {
  const paymasterClient = createPimlicoPaymasterClient({
    chain: FORCED_CHAIN,
    transport: http(`https://api.pimlico.io/v2/${FORCED_CHAIN.id}/rpc?apikey=${pimlicoApiKey}`),
  })
}
```

### 3. Configurar en `.env.local`:
```
NEXT_PUBLIC_PIMLICO_API_KEY=tu_api_key_aqui
```

## Verificación de Contratos Fondeados

Para verificar que tus contratos están fondeados:

1. **Verifying Paymaster** (`0x7d5BC773220165457536fCBb907722ef7487c840`):
   - [Ver en Celo Explorer](https://explorer.celo.org/address/0x7d5BC773220165457536fCBb907722ef7487c840)

2. **ERC20 Paymaster** (`0xEb2142cAc0B6b434dD4E004B269b4cD1F6653394`):
   - [Ver en Celo Explorer](https://explorer.celo.org/address/0xEb2142cAc0B6b434dD4E004B269b4cD1F6653394)

## Recomendación

**Usa Pimlico como paymaster alternativo** porque:
1. ✅ Funciona en mainnet sin restricciones
2. ✅ Soporta self-funded
3. ✅ Compatible con tu stack actual
4. ✅ Los contratos que ya fondeaste en ZeroDev pueden quedarse ahí (no se pierden)

Los contratos de ZeroDev que ya fondeaste seguirán ahí, pero no podrás usarlos hasta que actualices el plan o implementes una solución personalizada.

## Próximos Pasos

1. **Decide qué opción prefieres** (recomiendo Pimlico)
2. Si eliges Pimlico:
   - Crea cuenta en Pimlico Dashboard
   - Obtén API key
   - Configura en el código
   - Fondea el paymaster de Pimlico
3. Si prefieres actualizar ZeroDev:
   - Ve al dashboard
   - Actualiza tu plan
   - Los contratos que ya fondeaste seguirán funcionando










