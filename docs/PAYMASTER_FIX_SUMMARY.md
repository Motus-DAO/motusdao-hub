# Paymaster Fix Summary

## Problem Analysis

The application was experiencing errors when trying to send gasless transactions:

1. **Error 1**: `MethodNotFoundRpcError: The method "eth_estimateUserOperationGas" does not exist / is not available.`
2. **Error 2**: `Validation error: Unrecognized key: "paymasterAndData" at "params[0].userOp"`

### Root Cause

The bundler routing logic had two issues:
1. **Pimlico bundler doesn't support `eth_estimateUserOperationGas` on Celo Mainnet** - The method is not available in Pimlico's API for chain 42220
2. **ZeroDev bundler rejects `paymasterAndData` during gas estimation** - When routing to ZeroDev bundler, we must strip `paymasterAndData` before sending the request

## Solution Implemented

### 1. Fixed Bundler Routing Logic

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

**Changes**:
- Route `eth_estimateUserOperationGas` to ZeroDev bundler (Pimlico doesn't support it on Celo Mainnet)
- **CRITICAL**: Strip `paymasterAndData` from userOp before sending to ZeroDev bundler for gas estimation
- Route other standard ERC-4337 methods to Pimlico bundler
- Only ZeroDev-specific methods (starting with `zd_` or containing `zerodev`) are routed to ZeroDev bundler

**Before**:
```typescript
if (method.startsWith('zd_') || method.includes('zerodev')) {
  shouldUseZeroDevBundler = true
}
// All other methods go to Pimlico bundler (but Pimlico doesn't support gas estimation on Celo)
```

**After**:
```typescript
if (method.startsWith('zd_') || 
    method.includes('zerodev') ||
    method === 'eth_estimateUserOperationGas') {
  shouldUseZeroDevBundler = true
  
  // Strip paymasterAndData before sending to ZeroDev bundler
  if (method === 'eth_estimateUserOperationGas') {
    // Remove paymasterAndData from userOp
    const { paymasterAndData, ...userOpWithoutPaymaster } = userOp
    // ... update request body
  }
}
// Other methods go to Pimlico bundler
```

### 2. Strip paymasterAndData Before Sending to ZeroDev Bundler

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

The bundler routing logic now strips `paymasterAndData` from userOps before sending to ZeroDev bundler:
- Detects `eth_estimateUserOperationGas` method
- Removes `paymasterAndData` from the userOp before forwarding to ZeroDev bundler
- This prevents validation errors from ZeroDev bundler

## Architecture After Fix

```
┌─────────────────────────────────────────┐
│         ZeroDev SDK (Client)            │
│  - Smart wallet creation                │
│  - User operation preparation            │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Smart Bundler Router               │
│  - ZeroDev-specific (zd_*) → ZeroDev    │
│  - Gas estimation → ZeroDev             │
│    (paymasterAndData stripped)           │
│  - Other ERC-4337 → Pimlico              │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│  ZeroDev Bundler │  │ Pimlico Bundler   │
│  (Direct)        │  │ Proxy             │
│  - Gas est. only │  │ - Adds API key    │
│  - No paymaster  │  │ - Sends userOps   │
│    data          │  │                   │
└──────────────────┘  └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Pimlico API     │
                    │  (with API key)  │
                    └──────────────────┘
```

## Benefits

1. ✅ **Gas estimation works**: `eth_estimateUserOperationGas` goes to ZeroDev bundler (which supports it on Celo)
2. ✅ **No validation errors**: `paymasterAndData` is stripped before sending to ZeroDev bundler
3. ✅ **Optimal routing**: Gas estimation uses ZeroDev, actual user operations use Pimlico bundler
4. ✅ **ZeroDev compatibility**: ZeroDev-specific methods still work via ZeroDev bundler

## Testing

After this fix, gasless transactions should work correctly:

1. Gas estimation will succeed (no more "method does not exist" errors)
2. No validation errors about `paymasterAndData`
3. Transactions can be sent without gas (sponsored by Pimlico paymaster)

## Configuration Requirements

Ensure these environment variables are set:

- `PIMLICO_API_KEY`: Required for Pimlico bundler and paymaster (server-side only)
- `NEXT_PUBLIC_ZERODEV_PROJECT_ID`: Required for ZeroDev smart wallet creation

## Notes

- Pimlico bundler **does support** `eth_estimateUserOperationGas` (contrary to previous assumption)
- The Pimlico bundler proxy automatically handles `paymasterAndData` stripping
- ZeroDev bundler is only used for ZeroDev-specific methods (zd_*)
- All standard ERC-4337 operations use Pimlico bundler for consistency

