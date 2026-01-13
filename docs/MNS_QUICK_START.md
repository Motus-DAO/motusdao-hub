# Motus Name Service - Quick Start

## ✅ Todo está listo para deployar

He creado todo el sistema de Motus Name Service (.motus). Aquí está lo que se ha implementado:

### 📦 Archivos Creados

1. **Contrato Solidity**
   - `contracts/MotusNameService.sol` - Contrato ERC-721 con sistema de nombres

2. **Scripts de Deploy**
   - `scripts/mns/deploy-mns.js` - Deploy a Celo Mainnet
   - `scripts/mns/deploy-testnet.js` - Deploy a Alfajores Testnet
   - `scripts/mns/test-contract.js` - Tests del contrato

3. **Biblioteca JavaScript**
   - `lib/motus-name-service.ts` - API completa para interactuar con MNS

4. **Componentes UI**
   - `app/motus-names/page.tsx` - Página para registrar nombres
   - `components/payments/SendWithMotusName.tsx` - Enviar tokens con nombres

5. **Configuración**
   - `hardhat.config.js` - Configuración de Hardhat para Celo
   - `.env.mns.example` - Ejemplo de variables de entorno

6. **Documentación**
   - `MOTUS_NAME_SERVICE_README.md` - Documentación completa

### 🚀 Próximos Pasos

#### 1. Configurar Variables de Entorno

Copia `.env.mns.example` a `.env.local` y agrega tu private key:

```bash
cp .env.mns.example .env.local
```

Edita `.env.local`:
```
DEPLOYER_PRIVATE_KEY=tu_private_key_aquí
```

#### 2. Deploy a Testnet (Recomendado primero)

```bash
# Obtener CELO de testnet
# Visita: https://faucet.celo.org

# Deploy
npm run mns:deploy:testnet

# Copiar la dirección del contrato que aparece
```

#### 3. Actualizar Direcciones del Contrato

Después del deploy, actualiza la dirección en:

**`lib/motus-name-service.ts`** (línea 8):
```typescript
export const MNS_CONTRACT_ADDRESS = '0xTU_DIRECCION_AQUI' as const
```

**`lib/celo.ts`** (línea ~76):
```typescript
export const CELO_CONTRACTS = {
  motusNameService: '0xTU_DIRECCION_AQUI',
}
```

#### 4. Probar el Contrato

```bash
npm run mns:test 0xTU_DIRECCION_AQUI
```

#### 5. Probar en la UI

```bash
npm run dev
```

Visita: http://localhost:3000/motus-names

### 🎯 Flujo Completo

1. **Usuario se registra** → Privy crea EOA
2. **ZeroDev crea Smart Wallet** → Determinística basada en EOA
3. **Usuario registra nombre** → Va a `/motus-names` y registra `juan.motus`
4. **Paga 5 cUSD** → Transacción gasless (Pimlico patrocina el gas)
5. **Recibe NFT** → El nombre es un ERC-721 transferible
6. **Usa el nombre** → Puede recibir pagos con `juan.motus` en lugar de `0x742d...`

### 📱 Características Principales

- ✅ Nombres legibles (.motus)
- ✅ NFTs transferibles (ERC-721)
- ✅ Metadata personalizable (avatar, bio, redes)
- ✅ Transacciones gasless (AA + Paymaster)
- ✅ Reverse lookup (dirección → nombre)
- ✅ Precio fijo: 5 cUSD
- ✅ Registro permanente on-chain

### 🛠️ Scripts NPM Disponibles

```bash
npm run mns:compile          # Compilar contratos
npm run mns:deploy:testnet   # Deploy a Alfajores
npm run mns:deploy           # Deploy a Mainnet
npm run mns:test <ADDRESS>   # Probar contrato
```

### 📚 Documentación Completa

Lee `MOTUS_NAME_SERVICE_README.md` para:
- Arquitectura detallada
- API completa
- Troubleshooting
- Personalización avanzada

---

**¡Todo listo para deployar!** 🎉

Empieza con testnet, prueba todo, y luego deploya a mainnet.




