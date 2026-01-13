# How to Fund ZeroDev Paymaster

## Which Paymaster to Fund?

### ✅ **Start with: Verifying Paymaster** (Recommended)

**Fund this one first!** It covers:
- ✅ Native CELO transactions (gasless)
- ✅ Smart wallet creation (gasless)
- ✅ Most common use cases
- ✅ Simpler setup

### 🔄 **Optional: ERC20 Paymaster** (If Needed Later)

Only fund this if you need:
- Users to pay gas with ERC20 tokens (cUSD, cEUR)
- More complex token payment flows
- Multi-token support

**For now, just fund the Verifying Paymaster!**

---

## How to Fund Verifying Paymaster

### Important Context:
- Your project is created on **Alfajores (testnet)** - Free plan
- But you need to fund on **Celo Mainnet** (where your app runs)
- The dashboard may show testnet, but you'll deposit to mainnet

### Step-by-Step Guide:

#### Option 1: Fund via ZeroDev Dashboard (If Available)

1. **Go to ZeroDev Dashboard**
   - Select your Alfajores project
   - Navigate to "Paymasters" section
   - Look for "Verifying Paymaster"

2. **Check if Mainnet Option Available**
   - Some dashboards let you switch to mainnet view
   - Look for chain selector (Alfajores → Celo Mainnet)
   - If available, switch to Celo Mainnet (42220)

3. **Click "Deposit"**
   - Connect your wallet (MetaMask, etc.)
   - **Make sure wallet is on Celo Mainnet!**
   - Enter amount (start with 1-5 CELO for testing)
   - Confirm transaction

#### Option 2: Fund Directly via Contract (If Dashboard Doesn't Support Mainnet)

If the dashboard only shows testnet, you can fund directly:

1. **Get Paymaster Contract Address**
   - Check ZeroDev documentation for Celo Mainnet paymaster address
   - Or contact ZeroDev support for the contract address
   - The address should be a contract on Celo Mainnet (chain 42220)

2. **Connect Wallet to Celo Mainnet**
   - Open MetaMask (or your wallet)
   - Switch to Celo Mainnet (Chain ID: 42220)
   - Make sure you have CELO in your wallet

3. **Send CELO to Paymaster Contract**
   - Send CELO directly to the paymaster contract address
   - Amount: Start with 1-5 CELO for testing
   - This funds the paymaster for gas sponsorship

4. **Verify Deposit**
   - Check the contract on Celo Explorer
   - Or check ZeroDev dashboard (may show balance after sync)

#### Option 3: Use ZeroDev API/SDK (Advanced)

If you have the paymaster contract address, you can also fund it programmatically, but the dashboard method is simpler.

---

## How Much to Fund?

### Starting Amount:
- **1-5 CELO** for initial testing
- This should cover many test transactions

### Ongoing:
- Monitor balance in dashboard
- Set up low balance webhook (if available)
- Top up as needed (typically every few weeks/months depending on usage)

### Cost Estimate:
- Each gasless transaction costs ~0.0001-0.001 CELO in gas
- 1 CELO = ~1,000-10,000 transactions (rough estimate)
- Actual cost depends on transaction complexity

---

## Verification Steps

After funding:

1. **Check Balance**
   - In ZeroDev dashboard (if it shows mainnet balance)
   - Or check contract on Celo Explorer

2. **Test Transaction**
   - Use your app to send a test transaction
   - Verify it's gasless (user doesn't pay gas)
   - Check transaction on Celo Explorer

3. **Monitor**
   - Watch for successful gasless transactions
   - Set up alerts if balance gets low

---

## Troubleshooting

### "Paymaster balance too low"
- Fund more CELO to the paymaster contract
- Check you funded on Celo Mainnet (not Alfajores)

### "Can't find mainnet option in dashboard"
- Your project is on testnet (Free plan limitation)
- Fund directly via contract address (Option 2 above)
- Or contact ZeroDev support for mainnet contract address

### "Transactions still require gas"
- Verify paymaster is funded on Celo Mainnet
- Check your code uses the correct paymaster URL
- Ensure `selfFunded=true` parameter if using self-funded

---

## Next Steps After Funding

1. ✅ Fund Verifying Paymaster with 1-5 CELO
2. ✅ Update code to use ZeroDev paymaster (we'll do this)
3. ✅ Test with a small transaction
4. ✅ Verify gasless transactions work
5. ✅ Set up monitoring/alerts for low balance

---

## Summary

**Fund: Verifying Paymaster** (on Celo Mainnet)
**Amount: 1-5 CELO** to start
**Method: Dashboard or direct contract deposit**

You only need to fund ONE paymaster (Verifying) unless you specifically need ERC20 token gas payments later.
















