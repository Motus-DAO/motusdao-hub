# ✅ Checklist de Implementación - Motus Name Service

## 📋 Pre-Deploy

- [ ] Revisar el contrato en `contracts/MotusNameService.sol`
- [ ] Verificar configuración de Hardhat en `hardhat.config.ts`
- [ ] Crear archivo `.env.local` con variables (ver `.env.mns.example`)
- [ ] Tener CELO para el deploy (~0.01 CELO) o usar testnet

## 🚀 Deploy del Contrato

### Opción A: Remix IDE (Recomendado - Más Simple)
- [ ] Visitar https://remix.ethereum.org
- [ ] Copiar código de `contracts/MotusNameService.sol`
- [ ] Compilar con Solidity 0.8.20 + optimizer 200 runs
- [ ] Conectar MetaMask en Celo Mainnet (Chain ID: 42220)
- [ ] Deploy el contrato
- [ ] **Copiar dirección del contrato deployado**

### Opción B: Hardhat (Requiere Configuración)
- [ ] Configurar `.env.local` con `DEPLOYER_PRIVATE_KEY`
- [ ] Usar script: `./scripts/mns/compile.sh` (ver `MNS_DEPLOY_ALTERNATIVES.md`)
- [ ] Deploy: `npm run mns:deploy:testnet` (o `mns:deploy` para mainnet)
- [ ] **Copiar dirección del contrato deployado**

## 🔧 Actualizar Código

Después del deploy, actualizar la dirección del contrato en:

### 1. lib/motus-name-service.ts
- [ ] Línea 8: Actualizar `MNS_CONTRACT_ADDRESS`
```typescript
export const MNS_CONTRACT_ADDRESS = '0xTU_DIRECCION_AQUI' as const
```

### 2. lib/celo.ts
- [ ] Línea ~76: Actualizar `CELO_CONTRACTS.motusNameService`
```typescript
export const CELO_CONTRACTS = {
  motusNameService: '0xTU_DIRECCION_AQUI',
}
```

## 🧪 Testing

- [ ] Probar funciones read-only: `npm run mns:test <CONTRACT_ADDRESS>`
- [ ] Verificar que la dirección está actualizada en el código
- [ ] Iniciar servidor de desarrollo: `npm run dev`
- [ ] Visitar `http://localhost:3000/motus-names`
- [ ] Conectar wallet y verificar que carga correctamente
- [ ] (Testnet) Registrar un nombre de prueba
- [ ] Verificar que aparece el NFT en tu wallet
- [ ] Probar resolver el nombre en la interfaz

## 📱 Integración en la App

### Agregar Navegación
- [ ] Agregar link a `/motus-names` en el Sidebar o Topbar
- [ ] Agregar link en la página de pagos (opcional)

### Componente de Envío con Nombres
- [ ] Integrar `SendWithMotusName` en la página de pagos
- [ ] O reemplazar el componente de envío existente
- [ ] Probar envío usando nombres .motus

### Ejemplo de Integración en página de pagos:
```tsx
// En app/pagos/page.tsx
import SendWithMotusName from '@/components/payments/SendWithMotusName'

export default function PagosPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Enviar Pagos</h1>
      <SendWithMotusName />
    </div>
  )
}
```

## 🎨 Personalización (Opcional)

- [ ] Ajustar colores y estilos en los componentes UI
- [ ] Cambiar precio de registro (solo owner del contrato)
- [ ] Agregar más campos de metadata si lo necesitas
- [ ] Crear página de perfil público con nombres

## 🔐 Seguridad

- [ ] Verificar que `.env.local` está en `.gitignore`
- [ ] Nunca subir private keys a Git
- [ ] Guardar backup seguro de la private key del deployer
- [ ] Guardar backup de la dirección del contrato
- [ ] (Opcional) Verificar contrato en Celoscan

## 📊 Monitoreo

- [ ] Revisar el contrato en Celoscan: `https://celoscan.io/address/<TU_DIRECCION>`
- [ ] Monitorear registros de nombres
- [ ] Verificar que el paymaster tiene fondos suficientes
- [ ] Revisar logs de transacciones en la consola del navegador

## 📚 Documentación

- [ ] Leer `MOTUS_NAME_SERVICE_README.md` completo
- [ ] Revisar `MNS_QUICK_START.md` para referencia rápida
- [ ] Consultar `MNS_DEPLOY_ALTERNATIVES.md` si tienes problemas
- [ ] Revisar `MNS_IMPLEMENTATION_SUMMARY.md` para el overview

## 🎯 Verificación Final

### Funcionalidades Básicas
- [ ] Usuarios pueden registrar nombres .motus
- [ ] Nombres se resuelven a direcciones correctamente
- [ ] Reverse lookup funciona (dirección → nombre)
- [ ] Transacciones son gasless (via paymaster)
- [ ] NFTs aparecen en wallets

### Funcionalidades Avanzadas (Opcional)
- [ ] Usuarios pueden actualizar metadata
- [ ] Usuarios pueden transferir nombres (NFTs)
- [ ] Sistema detecta automáticamente nombres vs direcciones
- [ ] Componente de envío funciona con nombres

## 🐛 Troubleshooting

Si encuentras problemas:

### Problema: "MNS contract not deployed yet"
- **Solución**: Actualizar `MNS_CONTRACT_ADDRESS` en `lib/motus-name-service.ts`

### Problema: Errores de compilación con Hardhat
- **Solución**: Usar Remix IDE o ver `MNS_DEPLOY_ALTERNATIVES.md`

### Problema: "Name already taken"
- **Solución**: Elegir otro nombre disponible

### Problema: Transacciones fallan
- **Solución 1**: Verificar que paymaster tiene fondos
- **Solución 2**: Verificar que smart wallet está inicializada
- **Solución 3**: Revisar logs en consola del navegador

### Problema: No se resuelven nombres
- **Solución**: Verificar que el nombre está registrado en el contrato
- **Solución**: Verificar dirección del contrato en `lib/motus-name-service.ts`

## 📞 Recursos de Ayuda

- Documentación de Celo: https://docs.celo.org
- Remix IDE: https://remix.ethereum.org
- Celoscan: https://celoscan.io
- Faucet (Testnet): https://faucet.celo.org
- ChainList (MetaMask): https://chainlist.org/?search=celo

## ✅ ¡Completado!

Una vez que hayas marcado todos los items esenciales, tu Motus Name Service estará operativo.

**Felicitaciones por implementar tu sistema de nombres descentralizado!** 🎉

---

*Última actualización: Enero 2026*  
*Sistema desarrollado para MotusDAO*




