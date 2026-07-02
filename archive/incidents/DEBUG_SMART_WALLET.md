# Debugging Smart Wallet Creation Issues

## Current Issue
Smart wallets are not being generated for new accounts after deployment.

## Console Logs to Check

Look for these logs in the browser console:

### Expected ZeroDev Logs:
- `[ZERODEV] Effect triggered:` - Shows if the effect is running
- `[ZERODEV] Initializing smart wallet with wallets: X` - Shows wallet count
- `[ZERODEV] Found wallet:` - Shows which wallet is being used
- `[ZERODEV] Creating ECDSA validator...` - Validator creation
- `[ZERODEV] Creating Kernel account...` - Account creation
- `[ZERODEV] Smart account address:` - The created smart wallet address
- `[ZERODEV] ✅ Smart account client created:` - Success message

### Error Logs to Look For:
- `[ZERODEV] ❌ Error initializing smart wallet:` - Any errors
- `[ZERODEV] Not authenticated` - Auth issue
- `[ZERODEV] No wallets available yet` - Wallets not ready

## Common Issues & Solutions

### 1. "No Privy wallets found"
**Cause**: Wallets array is empty when code runs
**Solution**: 
- Check if user is authenticated
- Verify Privy is properly configured
- Check if `embeddedWallets.createOnLogin` is set correctly

### 2. ZeroDev Project ID Not Set
**Check**: Look for `[ZERODEV] Project ID:` in console
**Solution**: 
- Verify `NEXT_PUBLIC_ZERODEV_PROJECT_ID` is set in environment variables
- Check production environment variables (Vercel, etc.)

### 3. Paymaster URL Issues
**Check**: Look for `[ZERODEV] Paymaster URL:` in console
**Solution**:
- Verify the URL format is correct
- Check if `?selfFunded=true` parameter is needed
- Verify paymaster is funded on Celo Mainnet

### 4. Network/Chain Issues
**Check**: Look for `[ZERODEV] Chain ID:` in console (should be 42220)
**Solution**:
- Ensure wallet is on Celo Mainnet
- Check if RPC endpoints are accessible

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[ZERODEV]` logs
4. Check for any red error messages

### Step 2: Verify Environment Variables
```bash
# Check if project ID is set
echo $NEXT_PUBLIC_ZERODEV_PROJECT_ID

# In production (Vercel), check:
# Settings → Environment Variables
```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "zerodev"
3. Check if requests to ZeroDev API are:
   - Being made
   - Returning 200 OK
   - Or showing errors (4xx, 5xx)

### Step 4: Verify Paymaster Funding
1. Check ZeroDev dashboard
2. Verify paymaster has balance on Celo Mainnet
3. Contract: `0x7d5BC773220165457536fCBb907722ef7487c840`
4. Should show 1.1 CELO balance

### Step 5: Test Authentication
1. Verify user can log in
2. Check if `authenticated` is `true`
3. Verify `wallets` array has items after login

## Quick Fixes to Try

### Fix 1: Remove selfFunded Parameter (If Not Needed)
```typescript
// Try without the parameter first
const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
```

### Fix 2: Add Retry Logic
If wallets aren't ready immediately, the code now waits, but you might need to add a retry mechanism.

### Fix 3: Check Project ID Format
Ensure the project ID is a valid UUID format (e.g., `e46f4ac3-404e-42fc-a3d3-1c75846538a8`)

## What to Share for Debugging

If the issue persists, share:
1. **Browser console logs** (all `[ZERODEV]` logs)
2. **Network tab** (filtered by "zerodev")
3. **Environment variables** (project ID - redact if sensitive)
4. **Error messages** (any red errors)
5. **User flow** (what steps user took before issue)

## Expected Behavior

1. User logs in (email or wallet)
2. Privy creates embedded wallet
3. ZeroDev provider detects wallet
4. ZeroDev creates Kernel smart wallet
5. Smart wallet address is logged
6. Smart wallet is ready for gasless transactions

If any step fails, check the logs for that step.
















