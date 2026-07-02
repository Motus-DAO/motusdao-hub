# Alternativa: Uso de Remix IDE para Deploy

Si tienes problemas con Hardhat debido a la configuración de ESM en Next.js, puedes usar **Remix IDE** para compilar y deployar el contrato:

## 📝 Pasos con Remix IDE

### 1. Abrir Remix

Visita: https://remix.ethereum.org

### 2. Crear el Contrato

1. En el File Explorer, crea un nuevo archivo: `MotusNameService.sol`
2. Copia el contenido de `contracts/MotusNameService.sol`
3. Pega el código en Remix

### 3. Compilar

1. Ve a la pestaña "Solidity Compiler" (icono de S)
2. Selecciona version: `0.8.20`
3. Habilita optimizer con 200 runs
4. Click en "Compile MotusNameService.sol"

### 4. Conectar tu Wallet

1. Ve a la pestaña "Deploy & Run Transactions"
2. En "Environment", selecciona "Injected Provider - MetaMask"
3. Conecta tu wallet de MetaMask
4. **IMPORTANTE**: Asegúrate de estar en Celo Mainnet (Chain ID: 42220)

### 5. Deploy

1. En "Contract", selecciona "MotusNameService"
2. Click en "Deploy"
3. Confirma la transacción en MetaMask
4. Espera la confirmación
5. **Copia la dirección del contrato deployado**

### 6. Actualizar Direcciones

Actualiza las direcciones en tu código:

**lib/motus-name-service.ts** (línea 8):
```typescript
export const MNS_CONTRACT_ADDRESS = '0xTU_DIRECCION_AQUI' as const
```

**lib/celo.ts** (línea ~76):
```typescript
export const CELO_CONTRACTS = {
  motusNameService: '0xTU_DIRECCION_AQUI',
}
```

### 7. Verificar en Celoscan (Opcional)

1. Ve a https://celoscan.io
2. Busca tu dirección de contrato
3. Ve a la pestaña "Contract"
4. Click en "Verify and Publish"
5. Selecciona:
   - Compiler: 0.8.20
   - Optimization: Yes, 200 runs
   - License: MIT
6. Pega el código del contrato (flatten si es necesario)
7. Submit

## 🔧 Solución para Hardhat (Avanzado)

Si prefieres usar Hardhat, necesitas ajustar la configuración del proyecto.

### Opción A: Modificar package.json temporalmente

Antes de cada comando de Hardhat:

```bash
# Backup
cp package.json package.json.backup

# Agregar type: module
npm pkg set type="module"

# Compilar/Deploy
npx hardhat compile
# o
npx hardhat run scripts/mns/deploy-mns.js --network celo

# Restaurar
mv package.json.backup package.json
```

### Opción B: Usar script automatizado

```bash
# Dar permisos de ejecución
chmod +x scripts/mns/compile.sh

# Ejecutar
./scripts/mns/compile.sh
```

### Opción C: Separar proyecto de contratos

Crea un proyecto separado solo para contratos:

```bash
mkdir ../motusdao-contracts
cd ../motusdao-contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
npx hardhat init

# Copiar archivos
cp ../motusdao-hub/contracts/* contracts/
cp ../motusdao-hub/hardhat.config.ts .
cp ../motusdao-hub/scripts/mns/* scripts/

# Compilar y deployar desde este proyecto
npx hardhat compile
npx hardhat run scripts/deploy-mns.js --network celo
```

## 📚 Recursos

- [Remix IDE](https://remix.ethereum.org)
- [Celo Faucet (Testnet)](https://faucet.celo.org)
- [Celoscan](https://celoscan.io)
- [MetaMask - Agregar Celo](https://chainlist.org/?search=celo)

---

**Recomendación**: Para una primera implementación, usa Remix IDE. Es más simple y no requiere configuración local.




