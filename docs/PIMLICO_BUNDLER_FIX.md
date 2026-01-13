# Pimlico Bundler Authentication Fix

## Problem

The application was getting a `401 Unauthorized` error when trying to use Pimlico bundler:

```
Status: 401
URL: https://api.pimlico.io/v2/42220/rpc
Request body: {"method":"eth_chainId"}
Details: "Unauthorized"
```

## Root Cause

The code was calling Pimlico's bundler API directly from the client without authentication:

```typescript
bundlerUrl = `https://api.pimlico.io/v2/${FORCED_CHAIN.id}/rpc`
```

**Pimlico's bundler requires API key authentication**, just like the paymaster. The API key must be included as a query parameter: `?apikey=YOUR_API_KEY`

However, we cannot expose the API key in client-side code for security reasons.

## Solution

Created a secure server-side proxy for the bundler (similar to the existing paymaster proxy):

### 1. Created Bundler Proxy API Route

**File**: `app/api/pimlico/bundler/route.ts`

- Accepts JSON-RPC requests from viem (the format ZeroDev SDK uses)
- Adds the Pimlico API key server-side (from `PIMLICO_API_KEY` environment variable)
- Forwards requests to Pimlico's bundler API
- Returns JSON-RPC responses to the client

### 2. Updated ZeroDevSmartWalletProvider

**File**: `lib/contexts/ZeroDevSmartWalletProvider.tsx`

- Changed bundler transport to use our proxy endpoint: `/api/pimlico/bundler`
- Uses viem's `http` transport with custom fetch function
- All bundler requests now route through the secure proxy
- API key stays on the server, never exposed to the client

## Architecture

```
┌─────────────────────────────────────────┐
│         Client (Browser)                 │
│  ZeroDev SDK → viem http transport      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    /api/pimlico/bundler (Proxy)          │
│  - Receives JSON-RPC requests            │
│  - Adds PIMLICO_API_KEY server-side     │
│  - Forwards to Pimlico                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Pimlico Bundler API                  │
│  https://api.pimlico.io/v2/42220/rpc    │
│  ?apikey=*** (added by proxy)           │
└─────────────────────────────────────────┘
```

## Configuration

### Environment Variable

Make sure `PIMLICO_API_KEY` is set in your environment:

**Local Development** (`.env.local`):
```bash
PIMLICO_API_KEY=your_pimlico_api_key_here
```

**Vercel** (Environment Variables):
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `PIMLICO_API_KEY` with your Pimlico API key
4. Select all environments (Production, Preview, Development)
5. Redeploy

## Verification

After deploying, check the browser console. You should see:

```
[ZERODEV] 📤 Calling Pimlico bundler via secure proxy... { method: 'eth_chainId' }
[ZERODEV] 📦 Using Pimlico bundler (required for Pimlico paymaster)
[ZERODEV] 🔒 Bundler API key is secure on server, not exposed to client
[ZERODEV] ✅ Paymaster configured - gasless transactions enabled
```

If you see errors about `PIMLICO_API_KEY not configured`, make sure:
1. The environment variable is set in Vercel
2. You've redeployed after adding the variable
3. The API key is correct and active in Pimlico dashboard

## Important Notes

- **Both bundler and paymaster now use secure proxies** - API keys never exposed to client
- **Pimlico bundler is REQUIRED** when using Pimlico paymaster (they work together)
- **ZeroDev bundler doesn't support custom paymasters** during gas estimation, which is why we use Pimlico bundler
- The same `PIMLICO_API_KEY` is used for both bundler and paymaster

## Related Files

- `app/api/pimlico/bundler/route.ts` - Bundler proxy endpoint
- `app/api/pimlico/paymaster/route.ts` - Paymaster proxy endpoint (existing)
- `lib/contexts/ZeroDevSmartWalletProvider.tsx` - Smart wallet provider with bundler/paymaster configuration








