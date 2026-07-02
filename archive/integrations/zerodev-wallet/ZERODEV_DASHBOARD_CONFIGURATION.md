# Guía: Configurar ZeroDev Dashboard para Mainnet y Gas Credits

## Problema Actual

- Error: "Missing chainId and unable to fetch from project"
- Tienes $10 USD en gas credits pero ZeroDev pide $69/mes para mainnet
- No encuentras la opción de límite de tarjeta en el dashboard

## Solución: Configurar el Proyecto en el Dashboard

### Paso 1: Acceder al Dashboard

1. Ve a https://dashboard.zerodev.app
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto (ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`)

### Paso 2: Configurar Redes/Chains

**Ubicación:** Settings → Networks o Project Settings → Supported Chains

1. Busca la sección "Networks", "Chains", o "Supported Networks"
2. Verifica si Celo Mainnet (Chain ID: 42220) está listado
3. Si NO está:
   - Haz clic en "Add Network" o "Add Chain"
   - Busca "Celo" o ingresa Chain ID: `42220`
   - Guarda los cambios

**Nota:** Si el proyecto fue creado en Alfajores (testnet), puede que necesites agregar mainnet manualmente.

### Paso 3: Configurar Gas Policies (Para usar tus $10 en créditos)

**Ubicación:** Gas Policies en el menú lateral

1. Ve a "Gas Policies" en el menú izquierdo
2. Haz clic en "New" o "Create Policy"
3. Selecciona "Project Policy" (afecta a todo el proyecto)
4. Configura:
   - **Type:** Project Policy
   - **Amount:** Deja en blanco o establece un límite (ej: $10 USD)
   - **Interval:** Por minuto, hora, o día
   - **Max Transactions:** Ej: 100 por minuto
5. Guarda la política

**Esto permitirá que tus $10 en gas credits se usen automáticamente.**

### Paso 4: Verificar Billing/Credits

**Ubicación:** Billing o Credits en el menú

1. Ve a "Billing" o "Credits"
2. Verifica que veas:
   - Tu balance de $10 USD en gas credits
   - Tu plan actual (Free, Starter, etc.)
3. Si no ves los créditos, contacta a ZeroDev support

### Paso 5: Configurar Método de Pago (Opcional - Solo si actualizas plan)

**Ubicación:** Billing → Payment Methods

1. Si decides actualizar el plan:
   - Ve a "Billing" → "Payment Methods"
   - Agrega tu tarjeta de crédito
   - **IMPORTANTE:** El límite de gasto NO se configura aquí
   - El límite se configura en tu banco/app de tarjeta

2. Para establecer límite de gasto:
   - **NO se hace en ZeroDev**
   - Usa la app de tu banco o tarjeta
   - Establece un límite mensual (ej: $100 USD)
   - Esto previene cargos excesivos

## Verificación

Después de configurar:

1. **Verifica que Celo Mainnet esté habilitado:**
   - Settings → Networks → Debe aparecer "Celo Mainnet (42220)"

2. **Verifica Gas Policies:**
   - Gas Policies → Debe haber al menos una política activa

3. **Verifica Credits:**
   - Billing → Debe mostrar tu balance de $10 USD

4. **Prueba en tu app:**
   - Intenta hacer una transacción
   - El error del chainId debería desaparecer
   - Los gas credits deberían usarse automáticamente

## Si No Encuentras las Opciones

### Opción A: El Dashboard Puede Haber Cambiado

- ZeroDev actualiza su dashboard frecuentemente
- Las opciones pueden estar en diferentes lugares
- Busca en:
  - Settings
  - Project Settings
  - Network Configuration
  - Chain Management

### Opción B: Permisos Insuficientes

- Verifica que tengas permisos de administrador en el proyecto
- Si no eres el dueño, pide acceso de admin

### Opción C: Contactar Soporte

Si no encuentras las opciones:

1. Ve a https://zerodev.app
2. Busca "Support" o "Contact"
3. Pregunta específicamente:
   - "¿Cómo agrego Celo Mainnet (42220) a mi proyecto?"
   - "¿Cómo configuro gas policies para usar mis gas credits?"
   - "¿Dónde veo mi balance de gas credits?"

## Alternativa: Usar Pimlico

Si no puedes configurar ZeroDev para mainnet:

1. Usa Pimlico como paymaster alternativo
2. Funciona en mainnet sin restricciones de plan
3. Ver `ZERODEV_MAINNET_LIMITATION.md` para más detalles

## Notas Importantes

- **Gas Credits ≠ Plan de Pago:** Los créditos son diferentes del plan mensual
- **Plan Gratuito:** Puede bloquear mainnet a nivel de API
- **Límite de Tarjeta:** Se configura en tu banco, NO en ZeroDev
- **Self-Funded:** Requiere que el proyecto esté configurado para mainnet

## Próximos Pasos

1. ✅ Configura el proyecto para mainnet en el dashboard
2. ✅ Crea una gas policy para usar tus créditos
3. ✅ Verifica que los créditos estén disponibles
4. ✅ Prueba una transacción en tu app
5. ✅ Si sigue fallando, considera usar Pimlico










