# Troubleshooting: Paymaster Self-Funded Mode

## Problema Actual

Estás recibiendo el error:
```
"You have hit your monthly gas sponsorship limit. Please upgrade your billing plan."
```

Esto indica que ZeroDev está usando su sistema de facturación mensual en lugar del modo self-funded, a pesar de que:
- ✅ Tienes `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true` configurado
- ✅ Has fondeado el paymaster con 1.1 CELO en Celo Mainnet

## Posibles Causas

### 1. Variable de Entorno No Está Siendo Leída

**Verificar:**
- Abre la consola del navegador (F12)
- Busca logs que digan `[ZERODEV] ⚙️ Configuration:`
- Verifica que `selfFundedEnv: "true"` y `useSelfFunded: true`

**Si no está configurada:**
- Verifica que `.env.local` tenga `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true`
- Reinicia el servidor de desarrollo (`npm run dev`)
- Limpia la caché del navegador

### 2. Proyecto en ZeroDev Dashboard No Está Configurado para Self-Funded

**Pasos para verificar:**
1. Ve a [ZeroDev Dashboard](https://dashboard.zerodev.app)
2. Selecciona tu proyecto (el que tiene el ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`)
3. Ve a la sección "Paymasters"
4. Verifica si hay una opción para "Self-Funded Mode" o "Deposit"
5. Si solo ves "Credit Card Billing", el proyecto puede no estar configurado para self-funded

**Solución:**
- Contacta a ZeroDev support para habilitar self-funded mode en tu proyecto
- O verifica si necesitas crear un nuevo proyecto específicamente para self-funded

### 3. Dirección del Paymaster Incorrecta

**Verificar la dirección correcta:**
1. En ZeroDev Dashboard, ve a "Paymasters"
2. Busca la dirección del contrato "Verifying Paymaster" para Celo Mainnet (42220)
3. Verifica en [Celo Explorer](https://explorer.celo.org) que esa dirección tenga tu depósito de 1.1 CELO

**Si la dirección es diferente:**
- El depósito puede estar en la dirección incorrecta
- Necesitas depositar a la dirección correcta del paymaster

### 4. El Parámetro `selfFunded=true` No Está Funcionando

**Solución implementada:**
- He añadido el `chainId` al URL del paymaster: `?selfFunded=true&chainId=42220`
- Esto puede ayudar a ZeroDev a identificar correctamente el modo self-funded

## Pasos de Diagnóstico

### Paso 1: Verificar Variables de Entorno

```bash
# En tu terminal, verifica que la variable esté configurada
echo $NEXT_PUBLIC_ZERODEV_SELF_FUNDED
# Debe mostrar: true
```

O verifica en `.env.local`:
```
NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true
```

### Paso 2: Verificar Logs en Consola

1. Abre la consola del navegador (F12)
2. Busca logs que empiecen con `[ZERODEV]`
3. Verifica estos valores:
   - `mode: 'self-funded'` (no 'credit-card-billing')
   - `selfFundedEnv: "true"`
   - `useSelfFunded: true`

### Paso 3: Verificar Balance del Paymaster

1. Obtén la dirección del paymaster desde ZeroDev Dashboard
2. Verifica en [Celo Explorer](https://explorer.celo.org):
   - Busca la dirección del contrato
   - Verifica que tenga balance > 0 CELO
   - Verifica que esté en Celo Mainnet (no Alfajores)

### Paso 4: Contactar ZeroDev Support

Si todo lo anterior está correcto pero sigue fallando:
1. Contacta a ZeroDev support
2. Proporciona:
   - Tu Project ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`
   - El error completo
   - Confirmación de que el paymaster está fondeado
   - Screenshot de los logs de configuración

## Solución Temporal

Mientras resuelves el problema de self-funded, puedes:

1. **Usar Credit Card Billing temporalmente:**
   - Cambia `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=false` o elimínalo
   - Esto usará el plan de facturación de ZeroDev
   - Necesitarás tener crédito o actualizar el plan

2. **Verificar el plan de ZeroDev:**
   - Ve al dashboard
   - Verifica tu plan actual
   - Considera actualizar si has alcanzado el límite

## Cambios Realizados en el Código

1. ✅ Añadido `chainId` al URL del paymaster para self-funded
2. ✅ Mejorado el logging para mostrar el estado de self-funded
3. ✅ Mejorado el manejo de errores para detectar límites de facturación
4. ✅ Mensajes de error más descriptivos

## Próximos Pasos

1. Verifica los logs en la consola del navegador
2. Confirma que la variable de entorno está configurada
3. Verifica el balance del paymaster en Celo Explorer
4. Si todo está correcto, contacta a ZeroDev support










