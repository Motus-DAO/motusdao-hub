# Vercel Pimlico Paymaster Setup

## Problem

On Vercel deployment, transactions fail with:
```
The method "eth_estimateUserOperationGas" does not exist / is not available.
Validation error: Unrecognized key: "paymasterAndData" at "params[0].userOp"
```

This happens because:
1. **PIMLICO_API_KEY is not set in Vercel environment variables**
2. Code tries to fallback to ZeroDev paymaster
3. ZeroDev paymaster doesn't work on mainnet with free plan
4. ZeroDev bundler rejects the userOp format

## Solution

**Pimlico paymaster is REQUIRED for production (Vercel).** The code has been updated to:
- ✅ Make Pimlico mandatory (no fallback to ZeroDev)
- ✅ Provide clear error messages if Pimlico is not configured
- ✅ Fail fast with helpful instructions

## Setup Steps

### 1. Get Pimlico API Key

1. Go to https://dashboard.pimlico.io
2. Sign in or create account
3. Create a project (if needed)
4. Select **Celo Mainnet** (Chain ID: 42220)
5. Copy your **API Key**

### 2. Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `PIMLICO_API_KEY`
   - **Value**: Your Pimlico API key
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### 3. Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

### 4. Verify

After deployment, check the browser console. You should see:
```
[ZERODEV] 🔄 Using Pimlico paymaster (REQUIRED for production)
[ZERODEV] ✅ Pimlico paymaster client created
```

If you see errors about PIMLICO_API_KEY not configured, the environment variable wasn't set correctly.

## Important Notes

- **PIMLICO_API_KEY is server-side only** (no `NEXT_PUBLIC_` prefix)
- The API key is kept secure via `/api/pimlico/paymaster` proxy
- ZeroDev paymaster does NOT work on mainnet with free plan
- Pimlico is the only working option for production

## Troubleshooting

### Error: "Pimlico API key not configured"

**Solution**: Add `PIMLICO_API_KEY` to Vercel environment variables and redeploy.

### Error: "The method eth_estimateUserOperationGas does not exist"

**Cause**: ZeroDev bundler is being used without proper paymaster configuration.

**Solution**: Ensure `PIMLICO_API_KEY` is set in Vercel. The code will now fail fast with a clear error instead of trying ZeroDev.

### Transactions still fail after setting PIMLICO_API_KEY

1. **Check Vercel logs**: Go to your deployment → **Functions** tab → Check server logs
2. **Verify API key**: Make sure the API key is correct and active in Pimlico dashboard
3. **Check Pimlico balance**: Ensure your Pimlico paymaster has funds
4. **Check chain ID**: Verify Pimlico project is configured for Celo Mainnet (42220)

## Local Development

For local development, add to `.env.local`:
```bash
PIMLICO_API_KEY=your_pimlico_api_key_here
```

This is the same key you use in Vercel.

## Force ZeroDev (Not Recommended)

If you really want to use ZeroDev paymaster (it won't work on mainnet), you can set:
```bash
NEXT_PUBLIC_USE_ZERODEV_PAYMASTER=true
```

But this will fail on mainnet with the free plan. **Use Pimlico instead.**









