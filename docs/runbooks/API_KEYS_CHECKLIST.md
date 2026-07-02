# API Keys Checklist for Paymaster Setup

## Required API Keys

### 1. **PIMLICO_API_KEY** (CRITICAL - Server-side only)
- **Purpose**: Used for both Pimlico bundler and paymaster
- **Location**: 
  - Local: `.env.local` file
  - Vercel: Environment Variables (Settings → Environment Variables)
- **Format**: `PIMLICO_API_KEY=your_key_here` (NO `NEXT_PUBLIC_` prefix)
- **Where to get it**: https://dashboard.pimlico.io
- **Setup steps**:
  1. Go to https://dashboard.pimlico.io
  2. Sign in or create account
  3. Create a project
  4. **IMPORTANT**: Select **Celo Mainnet** (Chain ID: 42220)
  5. Copy your API Key
  6. Add to `.env.local` for local development
  7. Add to Vercel environment variables for production
- **Verification**:
  - Check console logs: `[PIMLICO PAYMASTER PROXY] ✅ API key found, length: XX`
  - If missing: `[PIMLICO PAYMASTER PROXY] ❌ PIMLICO_API_KEY not configured`
- **Common mistakes**:
  - ❌ Using `NEXT_PUBLIC_PIMLICO_API_KEY` (wrong - should be `PIMLICO_API_KEY`)
  - ❌ Not selecting Celo Mainnet in Pimlico dashboard
  - ❌ Not redeploying after adding to Vercel

### 2. **NEXT_PUBLIC_ZERODEV_PROJECT_ID** (Required)
- **Purpose**: Used for ZeroDev smart wallet creation
- **Location**: 
  - Local: `.env.local` file
  - Vercel: Environment Variables
- **Format**: `NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_project_id_here`
- **Where to get it**: ZeroDev dashboard (create project on Alfajores testnet)
- **Note**: Same Project ID works for both Alfajores and Celo Mainnet
- **Verification**: Check console logs for ZeroDev initialization

### 3. **NEXT_PUBLIC_PRIVY_APP_ID** (Required)
- **Purpose**: Used for Privy wallet/EOA creation
- **Location**: 
  - Local: `.env.local` file
  - Vercel: Environment Variables
- **Format**: `NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here`
- **Where to get it**: Privy dashboard

## Optional API Keys

### 4. **NEXT_PUBLIC_ZERODEV_SELF_FUNDED** (Optional)
- **Purpose**: Controls ZeroDev paymaster mode (not used with Pimlico)
- **Format**: `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true` or `false`
- **Note**: Not needed if using Pimlico paymaster

## Important Notes

### Server-side vs Client-side Variables

**Server-side (NO `NEXT_PUBLIC_` prefix)**:
- `PIMLICO_API_KEY` - Used in API routes (`/api/pimlico/paymaster`, `/api/pimlico/bundler`)
- These are secure and never exposed to the browser

**Client-side (WITH `NEXT_PUBLIC_` prefix)**:
- `NEXT_PUBLIC_ZERODEV_PROJECT_ID` - Used in client-side code
- `NEXT_PUBLIC_PRIVY_APP_ID` - Used in client-side code
- These are exposed to the browser (safe to expose)

### Verification Checklist

#### Local Development
- [ ] `PIMLICO_API_KEY` is set in `.env.local`
- [ ] `NEXT_PUBLIC_ZERODEV_PROJECT_ID` is set in `.env.local`
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID` is set in `.env.local`
- [ ] Restart dev server after adding variables: `npm run dev`

#### Vercel Production
- [ ] `PIMLICO_API_KEY` is set in Vercel Environment Variables
- [ ] `NEXT_PUBLIC_ZERODEV_PROJECT_ID` is set in Vercel Environment Variables
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID` is set in Vercel Environment Variables
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed after adding variables

### Debugging API Key Issues

#### Check Console Logs

**If PIMLICO_API_KEY is missing**:
```
[PIMLICO PAYMASTER PROXY] ❌ PIMLICO_API_KEY not configured in environment variables
[PIMLICO BUNDLER PROXY] ❌ PIMLICO_API_KEY not configured in environment variables
```

**If PIMLICO_API_KEY is present but invalid**:
```
[PIMLICO PAYMASTER PROXY] ❌ 401 Unauthorized - API key may be invalid or expired
[PIMLICO BUNDLER PROXY] ❌ 401 Unauthorized - API key may be invalid or expired
```

**If PIMLICO_API_KEY is correct**:
```
[PIMLICO PAYMASTER PROXY] ✅ API key found, length: XX
[PIMLICO BUNDLER PROXY] ✅ API key found, length: XX
```

#### Common Issues

1. **Wrong variable name**: Using `NEXT_PUBLIC_PIMLICO_API_KEY` instead of `PIMLICO_API_KEY`
   - **Fix**: Remove `NEXT_PUBLIC_` prefix

2. **Not redeployed**: Added to Vercel but didn't redeploy
   - **Fix**: Go to Deployments → Redeploy

3. **Wrong chain**: Pimlico project not configured for Celo Mainnet
   - **Fix**: Go to Pimlico dashboard → Select Celo Mainnet (42220)

4. **Insufficient funds**: Pimlico paymaster account has no funds
   - **Fix**: Deposit CELO to your Pimlico paymaster account

5. **API key inactive**: API key was revoked or expired
   - **Fix**: Generate new API key in Pimlico dashboard

## Quick Setup Commands

### Local Development
```bash
# Create .env.local if it doesn't exist
touch .env.local

# Add required variables
echo "PIMLICO_API_KEY=your_pimlico_api_key_here" >> .env.local
echo "NEXT_PUBLIC_ZERODEV_PROJECT_ID=your_zerodev_project_id" >> .env.local
echo "NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id" >> .env.local

# Restart dev server
npm run dev
```

### Vercel Production
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `PIMLICO_API_KEY` = your_pimlico_api_key
   - `NEXT_PUBLIC_ZERODEV_PROJECT_ID` = your_zerodev_project_id
   - `NEXT_PUBLIC_PRIVY_APP_ID` = your_privy_app_id
3. Select all environments (Production, Preview, Development)
4. Click Save
5. Go to Deployments → Redeploy latest deployment

## Testing

After setting up API keys, test by:

1. **Check initialization logs**:
   - Open browser console
   - Look for: `[ZERODEV] ✅ Paymaster configured - gasless transactions enabled`
   - Look for: `[PIMLICO PAYMASTER PROXY] ✅ API key found`

2. **Try a test transaction**:
   - Send a small test payment
   - Check console for paymaster logs
   - Verify transaction succeeds without requiring gas

3. **Check for errors**:
   - If you see `paymasterAndData: 0x` (empty), API key might be wrong
   - If you see 401 errors, API key is invalid
   - If you see "not configured", variable is missing








