# Motus Name Service (.motus)

Sistema de nombres descentralizado para MotusDAO en Celo Mainnet. Permite registrar nombres legibles (como `juan.motus`) que apuntan a direcciones de smart wallets, facilitando el envío y recepción de tokens.

## 🎯 Características

- **Nombres Legibles**: Usa `juan.motus` en lugar de `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- **NFTs Transferibles**: Cada nombre es un ERC-721 NFT que puedes transferir o vender
- **Metadata Personalizable**: Avatar, bio, redes sociales
- **Gasless**: Registro con Account Abstraction (sin gas fees para usuarios)
- **On-Chain**: Todo almacenado en Celo Mainnet, 100% descentralizado
- **Precio Fijo**: 5 cUSD por registro

## 📁 Estructura del Proyecto

```
motusdao-hub/
├── contracts/
│   └── MotusNameService.sol          # Contrato principal del MNS
├── scripts/mns/
│   ├── deploy-mns.js                 # Deploy a Celo Mainnet
│   ├── deploy-testnet.js             # Deploy a Alfajores Testnet
│   └── test-contract.js              # Tests del contrato
├── lib/
│   ├── motus-name-service.ts         # Biblioteca JavaScript para MNS
│   └── celo.ts                       # Configuración de Celo + dirección MNS
├── app/motus-names/
│   └── page.tsx                      # UI para registrar nombres
├── components/payments/
│   └── SendWithMotusName.tsx         # Componente para enviar con nombres
└── hardhat.config.js                 # Configuración de Hardhat
```

## 🚀 Instalación

### 1. Instalar dependencias

Las dependencias de Hardhat ya están instaladas. Si necesitas reinstalarlas:

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
```

### 2. Configurar variables de entorno

Crea o actualiza tu archivo `.env.local`:

```bash
# Wallet que deployará el contrato
DEPLOYER_PRIVATE_KEY=tu_private_key_aquí

# API Key de Celoscan (opcional, para verificar contratos)
CELOSCAN_API_KEY=tu_api_key_aquí
```

⚠️ **IMPORTANTE**: Nunca subas tu `.env.local` a Git. Ya está en `.gitignore`.

## 📝 Deploy del Contrato

### Opción 1: Deploy a Alfajores Testnet (Recomendado para pruebas)

```bash
# 1. Obtener CELO de testnet del faucet
# Visita: https://faucet.celo.org

# 2. Deploy
npx hardhat run scripts/mns/deploy-testnet.js --network alfajores

# 3. Copiar la dirección del contrato
# Actualizar MNS_CONTRACT_ADDRESS en lib/motus-name-service.ts

# 4. (Opcional) Verificar contrato en Celoscan
npx hardhat verify --network alfajores <CONTRACT_ADDRESS>
```

### Opción 2: Deploy a Celo Mainnet (Producción)

```bash
# 1. Asegúrate de tener CELO en tu wallet de deployer
# Necesitas ~0.1 CELO para el deploy

# 2. Deploy
npx hardhat run scripts/mns/deploy-mns.js --network celo

# 3. Copiar la dirección del contrato deployado
# Ejemplo: 0x1234567890123456789012345678901234567890

# 4. Actualizar la dirección en el código
```

### 3. Actualizar direcciones del contrato

Después del deploy, actualiza estas líneas:

**En `lib/motus-name-service.ts`** (línea 3):
```typescript
export const MNS_CONTRACT_ADDRESS = '0xTU_DIRECCION_AQUI' as const
```

**En `lib/celo.ts`** (línea ~76):
```typescript
export const CELO_CONTRACTS = {
  motusNameService: '0xTU_DIRECCION_AQUI',
} as const
```

## 🧪 Probar el Contrato

```bash
# Test básico de funciones read-only
node scripts/mns/test-contract.js <CONTRACT_ADDRESS>

# Compilar contrato
npx hardhat compile

# Ejecutar tests (si los agregas)
npx hardhat test
```

## 💻 Uso en la Aplicación

### 1. Registrar un nombre

Los usuarios pueden ir a `/motus-names` para registrar su nombre:

```typescript
import { motusNameService } from '@/lib/motus-name-service'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'

function RegisterName() {
  const { kernelClient, smartAccountAddress } = useSmartAccount()
  
  const handleRegister = async (name: string) => {
    const result = await motusNameService.registerName(
      kernelClient,
      name,
      smartAccountAddress
    )
    
    if (result.success) {
      console.log('Nombre registrado!', result.txHash)
    }
  }
}
```

### 2. Resolver nombres

```typescript
import { motusNameService } from '@/lib/motus-name-service'

// Resolver nombre a dirección
const address = await motusNameService.resolve('juan')
// Retorna: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

// Resolver dirección a nombre (reverse lookup)
const name = await motusNameService.reverseLookup('0x742d35...')
// Retorna: "juan"
```

### 3. Enviar tokens con nombres

Usa el componente `SendWithMotusName`:

```tsx
import SendWithMotusName from '@/components/payments/SendWithMotusName'

function PaymentPage() {
  return <SendWithMotusName />
}
```

El componente automáticamente:
- Detecta si el input es nombre o dirección
- Resuelve nombres .motus a direcciones
- Muestra información del destinatario
- Envía transacciones gasless

## 📚 API de Motus Name Service

### Métodos de Lectura (gratuitos, no requieren transacción)

```typescript
// Verificar si un nombre está disponible
const available = await motusNameService.isAvailable('juan')

// Validar formato de nombre
const valid = motusNameService.isValidNameFormat('juan-123')

// Obtener precio de registro
const price = await motusNameService.getRegistrationPrice() // "5" (cUSD)

// Obtener total de nombres registrados
const total = await motusNameService.getTotalSupply()

// Obtener metadata de un nombre
const metadata = await motusNameService.getMetadata('juan')

// Detectar tipo de input
const type = motusNameService.detectInputType('juan.motus') // 'name'
const type2 = motusNameService.detectInputType('0x742d...') // 'address'

// Resolver automáticamente input (nombre o dirección)
const resolved = await motusNameService.resolveInput('juan.motus')
// { address: '0x742d...', type: 'name', displayName: 'juan.motus' }
```

### Métodos de Escritura (requieren transacción con Smart Wallet)

```typescript
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'

const { kernelClient, smartAccountAddress } = useSmartAccount()

// Registrar nombre (5 cUSD, gasless)
const result = await motusNameService.registerName(
  kernelClient,
  'juan',
  smartAccountAddress
)

// Actualizar metadata (gasless)
const result = await motusNameService.updateMetadata(
  kernelClient,
  'juan',
  {
    avatar: 'https://...',
    bio: 'Psicólogo especializado en...',
    twitter: '@juan',
    discord: 'juan#1234'
  }
)
```

## 🔐 Arquitectura del Sistema

```
Usuario → Privy (EOA) → ZeroDev (Smart Wallet) → MNS Contract
                              ↓
                         Pimlico Paymaster
                         (transacciones gasless)
```

1. **Privy** crea un EOA (Embedded Wallet) cuando el usuario se registra
2. **ZeroDev** usa ese EOA para crear una Smart Wallet determinística
3. El usuario registra su nombre **.motus** usando su Smart Wallet
4. **Pimlico Paymaster** patrocina el gas, haciendo la transacción gratuita
5. El nombre queda registrado on-chain como NFT ERC-721

## 🎨 Personalización

### Cambiar precio de registro

Solo el owner del contrato puede cambiar el precio:

```solidity
// Desde una wallet con permisos de owner
await mnsContract.setRegistrationPrice(parseUnits('10', 18)) // 10 cUSD
```

### Retirar fondos acumulados

```solidity
// Solo owner puede retirar fondos
await mnsContract.withdraw()
```

## 🛠️ Desarrollo

### Compilar contratos

```bash
npx hardhat compile
```

### Limpiar artifacts

```bash
npx hardhat clean
```

### Estructura del contrato

El contrato `MotusNameService.sol` hereda de:
- `ERC721`: Para hacer los nombres NFTs transferibles
- `Ownable`: Para funciones administrativas

Características principales:
- Validación de nombres (solo a-z, 0-9, guiones)
- Metadata on-chain (avatar, bio, redes sociales)
- Sistema de nombre principal por usuario
- Reverse lookup (dirección → nombre)
- Base64 encoding para metadata JSON

## 📊 Gas Costs (aproximado)

| Operación | Gas | Costo en CELO (aprox) |
|-----------|-----|------------------------|
| Deploy | ~2,500,000 | 0.01 CELO |
| Registrar nombre | ~150,000 | 0.0006 CELO |
| Actualizar metadata | ~50,000 | 0.0002 CELO |
| Transferir NFT | ~60,000 | 0.00024 CELO |

⚠️ **Nota**: Con Pimlico Paymaster, los usuarios NO pagan gas. El paymaster patrocina las transacciones.

## 🐛 Troubleshooting

### Error: "MNS contract not deployed yet"

Solución: Actualiza `MNS_CONTRACT_ADDRESS` en `lib/motus-name-service.ts` con la dirección del contrato deployado.

### Error: "Name already taken"

El nombre ya está registrado. Prueba con otro nombre usando la página `/motus-names`.

### Error: "Invalid name format"

Los nombres solo pueden contener:
- Letras minúsculas (a-z)
- Números (0-9)
- Guiones (-)
- Máximo 32 caracteres

### Error: "Insufficient cUSD balance"

Asegúrate de tener al menos 5 cUSD en tu smart wallet para registrar un nombre.

## 📖 Recursos

- [Celo Documentation](https://docs.celo.org)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [ZeroDev Documentation](https://docs.zerodev.app)
- [Pimlico Documentation](https://docs.pimlico.io)

## 🤝 Contribuciones

Para contribuir al desarrollo de MNS:

1. Crea un branch para tus cambios
2. Prueba en Alfajores testnet primero
3. Documenta los cambios
4. Crea un PR con descripción detallada

## 📄 Licencia

MIT License - Ver archivo de licencia del proyecto.

## 🎉 ¡Listo!

Ahora tienes un sistema de nombres descentralizado funcionando en tu app. Los usuarios pueden:

1. Ir a `/motus-names` y registrar su nombre (ej: `juan.motus`)
2. Usar ese nombre para recibir pagos en lugar de direcciones complejas
3. Enviar tokens usando nombres en la página `/pagos`
4. Personalizar su perfil con avatar y bio

---

**Desarrollado por MotusDAO Team** 🚀




