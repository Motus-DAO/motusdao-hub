# Solución: Error "Missing chainId and unable to fetch from project"

## Problema

El error persiste incluso después de cambiar a credit card billing:
```
HTTP request failed. Status: 400
Details: "Missing chainId and unable to fetch from project."
```

## Causa Raíz

El proyecto en ZeroDev dashboard está configurado **solo para Alfajores (testnet)**. Aunque el código especifica `chainId=42220` (Celo Mainnet) en las URLs, la API de ZeroDev necesita que el proyecto tenga mainnet habilitado en su configuración interna.

## Soluciones

### Solución 1: Usar API v3 (Implementada)

He cambiado el código para usar la API v3 del paymaster (igual que el bundler):

**Antes (v2):**
```
https://rpc.zerodev.app/api/v2/paymaster/{projectId}?chainId=42220
```

**Ahora (v3):**
```
https://rpc.zerodev.app/api/v3/{projectId}/chain/42220/paymaster
```

La API v3 incluye el chainId en la ruta, lo que puede ser más confiable.

### Solución 2: Contactar ZeroDev Support (Recomendado)

**Necesitas que agreguen Celo Mainnet a tu proyecto:**

1. Ve a https://zerodev.app
2. Busca "Support" o "Contact"
3. Envía un mensaje con:
   - **Subject:** "Add Celo Mainnet (42220) to existing project"
   - **Project ID:** `706600cd-c797-4fa4-9130-7ca2b9cccfed`
   - **Request:** "My project was created on Alfajores (testnet) but I need to use Celo Mainnet (chainId 42220). Can you please add mainnet support to my project? I have gas credits and credit card billing configured."
   - **Error:** "Missing chainId and unable to fetch from project"

### Solución 3: Crear Nuevo Proyecto en Mainnet

Si ZeroDev support no puede agregar mainnet al proyecto existente:

1. Ve al dashboard de ZeroDev
2. Crea un **nuevo proyecto**
3. **Selecciona Celo Mainnet** al crear (si está disponible)
4. O crea en otra red y luego pide que agreguen Celo Mainnet
5. Copia el nuevo Project ID
6. Actualiza `NEXT_PUBLIC_ZERODEV_PROJECT_ID` en tu `.env`

**Desventaja:** Perderás la configuración del proyecto anterior (gas policies, etc.)

### Solución 4: Usar Pimlico como Paymaster Alternativo

Si ZeroDev no puede resolver el problema:

1. Crea cuenta en https://dashboard.pimlico.io
2. Obtén tu API key
3. Configura `NEXT_PUBLIC_PIMLICO_API_KEY` en tu `.env`
4. Modifica el código para usar Pimlico en lugar de ZeroDev paymaster

**Ventaja:** Pimlico funciona en mainnet sin restricciones de plan

## Verificación

Después de implementar Solución 1 (API v3):

1. Reinicia tu servidor
2. Abre la consola del navegador
3. Busca logs `[ZERODEV] 💰 Paymaster URL:`
4. Debe mostrar: `.../api/v3/.../chain/42220/paymaster`
5. Intenta una transacción
6. Si sigue fallando, usa Solución 2 (contactar support)

## Estado Actual

- ✅ Código actualizado para usar API v3
- ✅ Credit card billing configurado
- ⚠️ Proyecto necesita mainnet habilitado en dashboard
- ⚠️ Error persiste porque proyecto solo tiene Alfajores

## Próximos Pasos

1. **PRIMERO:** Prueba con API v3 (ya implementado)
2. **SI FALLA:** Contacta ZeroDev support (Solución 2)
3. **ALTERNATIVA:** Usa Pimlico (Solución 4)

## Notas Importantes

- El dashboard puede mostrar solo Alfajores, pero mainnet debería funcionar si el proyecto lo tiene habilitado
- Los gas credits se usarán automáticamente una vez que funcione
- El error es del lado de ZeroDev API, no de tu código
- Necesitas que ZeroDev habilite mainnet en tu proyecto










