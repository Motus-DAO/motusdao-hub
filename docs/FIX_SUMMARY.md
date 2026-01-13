# AA33 Paymaster Error - Fix Summary

## Problem
You were getting this error when trying to send token payments:
```
PaymasterFunctionRevertedError: The `validatePaymasterUserOp` function on the Paymaster reverted.
Details: UserOperation reverted with reason: AA33 reverted 0x
```

## Root Cause
The paymaster gas limits were being set to **0** instead of the values returned by Pimlico:
- `paymasterVerificationGasLimit: 0`
- `paymasterPostOpGasLimit: 0`

Without these gas limits, the EntryPoint contract couldn't allocate gas for paymaster validation, causing the transaction to fail with AA33.

## What Was Fixed

### 1. Fixed `getPaymasterData` Return Format
**File**: `/lib/contexts/ZeroDevSmartWalletProvider.tsx`

Changed from returning packed format (v0.6 style) to unpacked format (v0.7 style) with gas limits:

**Before:**
```typescript
return {
  paymasterAndData: paymasterAndData as `0x${string}`,
}
// ❌ Gas limits were lost!
```

**After:**
```typescript
return {
  paymaster: result.paymaster as `0x${string}`,
  paymasterData: (result.paymasterData || '0x') as `0x${string}`,
  paymasterVerificationGasLimit: toGasLimit(result.paymasterVerificationGasLimit),
  paymasterPostOpGasLimit: toGasLimit(result.paymasterPostOpGasLimit),
}
// ✅ Gas limits preserved!
```

### 2. Improved Bundler Proxy
**File**: `/app/api/pimlico/bundler/route.ts`

Added better handling for both packed and unpacked formats:
- Strips `paymasterAndData` when unpacked v0.7 fields are present (viem adds both, Pimlico only accepts v0.7)
- Added detailed logging to track gas limits through the conversion process
- Ensures gas limits are preserved in format conversions

## Files Modified
1. `/lib/contexts/ZeroDevSmartWalletProvider.tsx` - Fixed getPaymasterData to return v0.7 unpacked format
2. `/app/api/pimlico/bundler/route.ts` - Improved format conversion with gas limit tracking
3. Created `AA33_PAYMASTER_FIX.md` - Technical documentation
4. Created `AA33_FIX_TESTING.md` - Testing guide

## Next Steps

### 1. Test the Fix
The development server is already running. Simply:
1. **Refresh your browser** (to load the updated code)
2. **Try sending a payment again**
3. **Check the console logs** for the gas limit values

### 2. What to Look For
In the browser console, you should see:
```
[ZERODEV] ✅ Using v0.7 unpacked format with gas limits
[PIMLICO BUNDLER PROXY] 📋 UserOp gas limits before conversion: {
  hasVerificationGasLimit: true,
  verificationGasLimit: 0x8a8e,  // ← Should be non-zero!
  hasPostOpGasLimit: true,
  postOpGasLimit: 0x1            // ← Should be non-zero!
}
```

### 3. Expected Result
✅ **Transaction succeeds** without AA33 error
✅ **Transaction hash** is displayed
✅ **Block explorer link** works

## If It Still Doesn't Work

Check these in order:

1. **Verify gas limits are non-zero**
   - Look for `paymasterVerificationGasLimit` and `paymasterPostOpGasLimit` in logs
   - They should be hex values like `0x8a8e`, not `0x0`

2. **Verify Pimlico API Key**
   - Check Vercel environment variable `PIMLICO_API_KEY`
   - Verify it's active in https://dashboard.pimlico.io

3. **Check Pimlico Balance**
   - Go to https://dashboard.pimlico.io
   - Ensure you have sufficient credits or deposit
   - Verify access to Celo Mainnet (chain 42220)

4. **Other AA33 Causes**
   - Paymaster signature expired (retry the transaction)
   - UserOperation was modified after paymaster approval
   - Pimlico service issue (check status page)

## Technical Details

See these files for more information:
- `AA33_PAYMASTER_FIX.md` - Detailed technical explanation
- `AA33_FIX_TESTING.md` - Complete testing guide and troubleshooting

## Questions?

If the fix doesn't work, provide these logs:
1. Full console output from attempting the payment
2. Any error messages
3. The gas limit values you see in the logs

