# Migration Guide: Privy → WaaP (Human.tech)

## Overview

This guide documents the migration from **Privy** to **WaaP (Wallet as a Protocol)** by Human.tech as the EOA (Externally Owned Account) creation provider while maintaining:
- ✅ ZeroDev for smart wallet creation (Kernel v3.1)
- ✅ Pimlico for paymaster (gasless transactions)
- ✅ Celo Mainnet support (custom EVM chain)

## Architecture Comparison

### Before (Privy)
```
PrivyProvider (authentication + EOA creation)
  └── ZeroDevSmartWalletProvider (smart wallet via Kernel)
      └── App Components
```

### After (WaaP)
```
WaaPProvider (authentication + EOA creation with Human Keys)
  └── ZeroDevSmartWalletProvider (smart wallet via Kernel)
      └── App Components
```

## What is WaaP?

**Wallet as a Protocol (WaaP)** is a Web3 wallet solution with:
- **Two-Party Computation (2PC)** - No single point of failure
- **Human Keys Technology** - User-friendly key management
- **Dual-Share Security Model**:
  - Sovereign Share (user-controlled)
  - Security Share (TEE-managed)
- **EIP-1193 Compliant** - Works with standard Web3 libraries

Learn more: https://docs.wallet.human.tech/

## Migration Steps

### 1. Install WaaP SDK

```bash
npm install @human.tech/waap-sdk
```

**Note: No App ID required!** WaaP uses a simple config-based initialization.

### 2. Environment Variables

Update your `.env.local`:

```bash
# Remove old Privy config (no longer needed)
# NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# NO WaaP App ID needed! Just install the SDK

# Keep ZeroDev and Pimlico unchanged
NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_zerodev_project_id
PIMLICO_API_KEY=your_pimlico_api_key

# Optional: WalletConnect Project ID (only if using 'wallet' auth method)
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 3. Import Changes

All components using Privy hooks need updated imports:

```typescript
// Before
import { usePrivy, useWallets } from '@privy-io/react-auth'

// After
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
```

### 4. Hook Usage Changes

The hooks maintain API compatibility:

```typescript
// Before
const { authenticated, user, login, logout } = usePrivy()
const { wallets } = useWallets()

// After
const { authenticated, user, login, logout } = useWaaP()
const { wallets } = useWaaPWallets()
```

### 5. Email OTP Login

**Note:** WaaP handles email authentication through its unified login modal.
The `sendCode`/`loginWithCode` methods are provided for backwards compatibility,
but WaaP's `login()` method opens a modal that handles all authentication methods.

```typescript
// Before
import { useLoginWithEmail } from '@privy-io/react-auth'

// After
import { useLoginWithEmail } from '@/lib/contexts/WaaPProvider'

// Usage remains the same
const { sendCode, loginWithCode } = useLoginWithEmail()
await sendCode({ email: 'user@example.com' })
await loginWithCode({ code: '123456' })
```

## Files Changed

### New Files
- `lib/contexts/WaaPProvider.tsx` - WaaP context and hooks
- `components/WaaPProviderWrapper.tsx` - App provider wrapper

### Updated Files
- `app/layout.tsx` - Uses WaaPProviderWrapper
- `lib/contexts/ZeroDevSmartWalletProvider.tsx` - Uses WaaP hooks
- `lib/wallet-utils.ts` - Updated for WaaP wallet types
- `lib/smart-wallet-helper.ts` - Updated for WaaP
- `lib/payments.ts` - Updated for WaaP
- All components using Privy hooks (see list below)

### Components Updated
```
components/layout/Topbar.tsx
components/layout/Sidebar.tsx
components/onboarding/EmailLoginModal.tsx
components/onboarding/steps/StepConnect.tsx
components/payments/TestGaslessTransaction.tsx
app/page.tsx
app/pagos/page.tsx
app/perfil/page.tsx
app/registro/page.tsx
app/motusai/page.tsx
app/motus-names/page.tsx
```

## Adding Celo Mainnet (Custom EVM)

Since Celo is not officially supported by WaaP, it's added as a custom chain:

```typescript
// In WaaPProvider.tsx
const CELO_CHAIN_CONFIG = {
  chainId: 42220,
  name: 'Celo',
  rpcUrl: 'https://forno.celo.org',
  symbol: 'CELO',
  blockExplorerUrl: 'https://explorer.celo.org',
}

const initConfig: WaaPInitConfig = {
  config: {
    // ... other config
    customChains: [CELO_CHAIN_CONFIG],
  },
}
```

## Wallet Types

### WaaP Wallet Structure
```typescript
interface WaaPWallet {
  address: `0x${string}`
  walletClientType: 'waap' | 'external'
  chainId: string
  connected: boolean
}
```

### Type Compatibility
The `WaaPWallet` interface is compatible with the old `ConnectedWallet` type for backwards compatibility:

```typescript
export type ConnectedWallet = WaaPWallet
```

## Smart Wallet Integration

The ZeroDev integration remains largely unchanged:

1. **WaaP provides the EOA** (signer wallet)
2. **ZeroDev creates the smart wallet** using the WaaP EOA as owner
3. **Pimlico sponsors gas** via the paymaster

```typescript
// ZeroDevSmartWalletProvider uses WaaP provider for signing
const walletClient = createWalletClient({
  account: waapWallet.address,
  chain: celoMainnet,
  transport: custom(waapProvider),
})

// Create ECDSA validator with WaaP-backed wallet client
const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer: walletClient,
  entryPoint,
  kernelVersion: KERNEL_V3_1,
})
```

## Testing

### Development Mode

In development without the WaaP SDK installed, a mock provider is used:

```typescript
// Mock credentials for development
email: 'dev@motusdao.com'
OTP code: '123456'
```

### Production

Ensure you have:
1. `@human.tech/waap-sdk` installed (no App ID needed!)
2. ZeroDev Project ID configured
3. Pimlico API Key configured
4. Environment variables set in Vercel (ZeroDev + Pimlico only)

## Troubleshooting

### "WaaP not initialized"
Ensure `@human.tech/waap-sdk` is installed: `npm install @human.tech/waap-sdk`

### "No WaaP wallet found"
User needs to complete authentication via WaaP (email, phone, or social login).

### Smart wallet not creating
Check that:
1. WaaP authentication completed
2. ZeroDev project ID is valid
3. Pimlico API key is working

### Celo network not available
WaaP custom chain configuration may need verification. Contact Human.tech support if issues persist.

## Resources

- WaaP Documentation: https://docs.wallet.human.tech/
- WaaP Quick Start: https://docs.wallet.human.tech/quick-start
- ZeroDev Documentation: https://docs.zerodev.app/
- Pimlico Documentation: https://docs.pimlico.io/

## Support

For WaaP-specific issues, contact Human.tech support.
For smart wallet issues, refer to ZeroDev documentation.
For paymaster issues, check Pimlico dashboard.
