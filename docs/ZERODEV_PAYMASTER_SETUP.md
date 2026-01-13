# ZeroDev Paymaster Setup Guide for Celo Mainnet

## Understanding ZeroDev Paymaster Options

### Option 1: Credit Card Billing (Default)
- **How it works**: ZeroDev fronts gas for your users and charges your credit card
- **Pros**: 
  - No upfront crypto deposit needed
  - Automatic billing
  - Easy to get started
- **Cons**: 
  - Requires credit card on file
  - Billing happens after usage

### Option 2: Self-Funded Paymaster
- **How it works**: You deposit crypto (CELO) directly to the paymaster contract
- **Pros**: 
  - Full control over funds
  - No credit card required
  - Pay only for what you deposit
- **Cons**: 
  - Need to monitor balance
  - Must manually top up when low
  - Requires crypto wallet with CELO

## Recommendation Based on Your Needs

### For Production (Celo Mainnet) - **Use Credit Card Billing**

**Why?**
1. **Simpler**: No need to manage crypto deposits
2. **Reliable**: Automatic billing, no risk of running out of funds mid-transaction
3. **Scalable**: No need to constantly monitor and top up
4. **Matches working app**: If your other app uses credit card billing, consistency is better

**The answer you received recommends using ZeroDev's built-in paymaster**, which works with **both** billing methods. The code implementation is the same - the difference is just how you fund it in the dashboard.

## Important: Free Plan + Mainnet Usage

✅ **Good News**: You can use a **testnet project ID on mainnet**!

### How It Works:
1. **Create project on Alfajores (testnet)** - This works on the Free plan
2. **Use the same project ID in your code** - It will work on Celo Mainnet!
3. **Your code already has this documented** (see `PrivyProviderWrapper.tsx` line 12)

### Why This Works:
- ZeroDev allows the same project ID to work across networks
- The project is created on testnet (Free plan limitation)
- But the project ID works on mainnet when you specify the chain in code
- Your code already forces Celo Mainnet (Chain ID: 42220)

### What You Need to Do:
1. **Create/Use Alfajores project** in ZeroDev dashboard (Free plan)
2. **Copy the project ID** to your `.env` file
3. **For self-funded paymaster**: You'll deposit CELO on **mainnet** (not testnet)
4. **The code handles the rest** - it will use mainnet automatically

## Paymaster Types

### Verifying Paymaster (Recommended for Native CELO)
- **Use case**: Users pay with native CELO (gasless transactions)
- **What you need**: Deposit CELO to the paymaster contract
- **Best for**: Simple gasless transactions

### ERC20 Paymaster
- **Use case**: Users pay with ERC20 tokens (like cUSD, cEUR)
- **What you need**: Deposit CELO + configure token exchange rates
- **Best for**: Multi-token payment options

**For your use case (smart wallets with gasless transactions on Celo Mainnet), use the Verifying Paymaster.**

## Setup Steps

### If Using Credit Card Billing (Recommended):

1. **In ZeroDev Dashboard**:
   - Create/select your **Alfajores project** (Free plan allows this)
   - Go to your project settings
   - Add credit card (if not already added)
   - The paymaster will work automatically on mainnet (even though project is testnet)

2. **In Code** (already correct):
   ```typescript
   const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
   const paymasterClient = createZeroDevPaymasterClient({
     chain: FORCED_CHAIN, // Celo Mainnet (42220)
     transport: http(paymasterUrl),
   })
   ```

### If Using Self-Funded (Alternative):

1. **In ZeroDev Dashboard**:
   - Use your **Alfajores project** (created on Free plan)
   - Go to "Verifying Paymaster" section
   - **Important**: You'll need to manually interact with the paymaster contract on **Celo Mainnet**
   - The dashboard shows testnet, but you'll deposit to mainnet contract
   
2. **To Deposit CELO on Mainnet**:
   - Get the paymaster contract address from ZeroDev docs/dashboard
   - Connect your wallet to **Celo Mainnet** (not Alfajores)
   - Send CELO directly to the paymaster contract address
   - Or use the deposit function if available in the dashboard when viewing mainnet
   - Start with 1-5 CELO for testing
   - Monitor balance and set up low balance webhook

2. **In Code** (same as above):
   ```typescript
   // Same code - no changes needed!
   const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}`
   const paymasterClient = createZeroDevPaymasterClient({
     chain: FORCED_CHAIN,
     transport: http(paymasterUrl),
   })
   ```

3. **Important**: Add `?selfFunded=true` parameter if using self-funded:
   ```typescript
   const paymasterUrl = `https://rpc.zerodev.app/api/v2/paymaster/${zeroDevProjectId}?selfFunded=true`
   ```

## Which Should You Choose?

### Choose Credit Card Billing If:
- ✅ You want simplicity
- ✅ You have a credit card available
- ✅ You want automatic billing
- ✅ You don't want to manage crypto deposits
- ✅ Your other working app uses credit card billing

### Choose Self-Funded If:
- ✅ You prefer to pay with crypto
- ✅ You want full control over deposits
- ✅ You don't have/want to use a credit card
- ✅ You want to limit spending to deposited amount

## Current Status Check

Based on your code:
- ✅ You're using Celo Mainnet (Chain ID: 42220) - **Correct**
- ✅ You have ZeroDev Project ID configured
- ✅ Your code comment confirms: "can use Alfajores project ID with Celo Mainnet"
- ⚠️ You're currently trying to use Pimlico (should switch to ZeroDev paymaster)
- ✅ **Free plan is fine** - testnet project ID works on mainnet!

## Next Steps

1. **Create/Use Alfajores project** in ZeroDev dashboard (Free plan works!)
2. **Copy the project ID** to your `.env` file as `NEXT_PUBLIC_ZERODEV_PROJECT_ID`
3. **Choose billing method**:
   - **Recommended**: Credit card billing (simpler, more reliable)
   - **Alternative**: Self-funded (deposit CELO on mainnet to paymaster contract)
4. **Update code** to use ZeroDev paymaster (we'll do this next)
5. **Test** with a small transaction on Celo Mainnet to verify sponsorship works

**Note**: Even though the project is created on Alfajores (testnet), it will work on Celo Mainnet because your code specifies the chain ID (42220)!

## Code Implementation

The code implementation is **the same** regardless of billing method. The only difference is:
- **Credit card**: Use URL without `?selfFunded=true`
- **Self-funded**: Use URL with `?selfFunded=true` parameter

Both work with the same `createZeroDevPaymasterClient` code!

