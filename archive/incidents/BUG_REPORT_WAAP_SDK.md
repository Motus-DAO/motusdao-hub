# Bug Report: WaaP SDK - Invalid Codepoint Error Blocking Transactions

**Date:** January 13, 2026  
**Reporter:** MotusDAO Team  
**SDK:** Human.tech WaaP (Wallet as a Protocol)  
**Severity:** Critical - Blocks all transactions  

---

## Summary

The WaaP SDK throws an `invalid codepoint` error when attempting to process transaction hashes, preventing transactions from being submitted to the blockchain. The error originates from `ethers v5`'s string encoding utilities attempting to decode raw bytes (transaction/userOperation hashes) as UTF-8 strings.

---

## Environment

| Component | Version/Details |
|-----------|-----------------|
| WaaP SDK | Latest (via `@anthropic/human-sdk` or similar) |
| ethers.js | v5.7.0 (bundled with WaaP SDK) |
| Network | Celo Mainnet (Chain ID: 42220) |
| Smart Account | ZeroDev Kernel v3 |
| Bundler | ZeroDev |
| Paymaster | Pimlico (ERC-4337 sponsorship) |
| Framework | Next.js 15.5.9 (Turbopack) |
| Node.js | v20.x |

---

## Error Details

### Error Message
```
Error: invalid codepoint at offset 2; unexpected continuation byte 
(argument="bytes", value=Uint8Array(0x0c27a87f4beb711972fda77594b82aa7579bf5a010331e76fb606172c1344252), 
code=INVALID_ARGUMENT, version=strings/5.7.0)
```

### Stack Trace
```
at p.makeError (65-7f5d5c4eb07e07ce.js:1:123102)
at p.throwError (65-7f5d5c4eb07e07ce.js:1:123216)
at p.throwArgumentError (65-7f5d5c4eb07e07ce.js:1:123271)
at error (65-7f5d5c4eb07e07ce.js:1:264816)
at h (65-7f5d5c4eb07e07ce.js:1:265255)
at Object.g (65-7f5d5c4eb07e07ce.js:1:266783)
at 6301-788c697cd9711293.js:1:26531
at Object.lt [as useMemo] (8ee7148e-28cac06b357b5a70.js:1:47159)
at t.useMemo (7976-523f271005748e7f.js:2:82500)
at k (6301-788c697cd9711293.js:1:26502)
at rE (8ee7148e-28cac06b357b5a70.js:1:40728)
at l$ (8ee7148e-28cac06b357b5a70.js:1:59703)
at iZ (8ee7148e-28cac06b357b5a70.js:1:118310)
at ia (8ee7148e-28cac06b357b5a70.js:1:95549)
```

### Problematic Value
```
Uint8Array(0x0c27a87f4beb711972fda77594b82aa7579bf5a010331e76fb606172c1344252)
```
This is a 32-byte hash (transaction hash or userOperation hash) being incorrectly processed as a UTF-8 string.

---

## What We're Trying To Do

1. User authenticates via WaaP SDK (email login)
2. WaaP creates an EOA wallet for the user
3. We use the EOA as a signer for a ZeroDev Kernel smart account
4. User initiates an ERC-20 token transfer (MOT token on Celo)
5. ZeroDev prepares a UserOperation with Pimlico paymaster sponsorship
6. **Error occurs** before/during transaction submission

---

## Transaction Flow (Where It Breaks)

```
✅ 1. User authenticated via WaaP
✅ 2. EOA created: 0xd0563BBa8E42b6ab0ECDfc1f0eA1486c5C28Ba3b
✅ 3. Smart wallet derived: 0x6cd82dA1C5Ee4C6DaCF00E7Ca084F22Db81762D9
✅ 4. Payment initiated (ERC-20 transfer)
✅ 5. Paymaster stub data received
✅ 6. Gas estimation requested
✅ 7. Sponsorship approved by Pimlico
❌ 8. ERROR: invalid codepoint (transaction never sent)
❌ 9. Transaction not visible on blockchain explorer
```

---

## Console Logs Before Error

```javascript
[PIMLICO] ✅ Stub data response: {
  paymaster: '0x777777777777AeC03fd955926DbF81597e66834C', 
  paymasterDataLength: 158
}

[PIMLICO] 📋 Returning Pimlico stub data: {
  paymaster: '0x777777777777AeC03fd955926DbF81597e66834C', 
  paymasterDataLength: 158, 
  paymasterVerificationGasLimit: '150000'
}

[ZERODEV] 🔀 Routing to ZeroDev bundler: eth_estimateUserOperationGas

[PIMLICO] 💰 getPaymasterData called - getting sponsorship from Pimlico

[PIMLICO] 💰 Calling pm_sponsorUserOperation

[PIMLICO] ✅ Sponsorship response: {
  paymaster: '0x777777777777AeC03fd955926DbF81597e66834C', 
  paymasterDataLength: 158, 
  paymasterVerificationGasLimit: '0x8a8e', 
  paymasterPostOpGasLimit: '0x1'
}

// ❌ ERROR OCCURS HERE - Transaction never submitted
Error: invalid codepoint at offset 2; unexpected continuation byte...
```

---

## Root Cause Analysis

### Hypothesis

The WaaP SDK internally uses `ethers v5` utilities. Somewhere in the SDK, there's code that attempts to convert a raw bytes value (likely a transaction hash or userOperation hash) into a UTF-8 string using `ethers.utils.toUtf8String()` or similar.

**The problem:**
- Transaction hashes are arbitrary 32-byte values
- These bytes are NOT valid UTF-8 encoded text
- `ethers v5` throws when encountering invalid UTF-8 byte sequences

### Likely Location in ethers v5

```javascript
// ethers/src/utils/strings.ts
export function toUtf8String(bytes: BytesLike): string {
  // This function throws if bytes contain invalid UTF-8 sequences
  // Transaction hashes (0x...) are NOT UTF-8 strings
}
```

### Evidence

The error value `Uint8Array(0x0c27a87f...)` is exactly 32 bytes - the size of:
- A transaction hash
- A userOperation hash
- A keccak256 hash

These should be displayed as hex strings (`0x...`), not decoded as UTF-8 text.

---

## Impact

- **All ERC-4337 transactions are blocked** when using WaaP + ZeroDev + Pimlico
- Users cannot send tokens or interact with contracts
- The error occurs in a React `useMemo` hook, causing UI crashes
- We've implemented error boundaries and console suppressors, but the underlying transaction still fails

---

## Workarounds Attempted

1. ✅ React Error Boundary - catches error but doesn't fix transaction
2. ✅ Console.error override - suppresses logs but doesn't fix transaction
3. ✅ Global error handlers - catches unhandled rejections but doesn't fix transaction
4. ❌ None of these allow the transaction to proceed

---

## Suggested Fix

The WaaP SDK should use `ethers.utils.hexlify()` or keep bytes as `Uint8Array` when handling transaction hashes, instead of attempting UTF-8 string conversion:

```javascript
// ❌ Current (broken)
const displayHash = ethers.utils.toUtf8String(hashBytes); // Throws!

// ✅ Correct
const displayHash = ethers.utils.hexlify(hashBytes); // Returns "0x0c27a87f..."
```

---

## Steps To Reproduce

1. Initialize WaaP SDK with email authentication
2. Create a ZeroDev Kernel smart account using the WaaP EOA as signer
3. Configure Pimlico paymaster for gas sponsorship
4. Attempt any UserOperation (token transfer, contract call, etc.)
5. Observe the `invalid codepoint` error before transaction submission

---

## Code Snippets

### Our ZeroDev + WaaP Integration

```typescript
// Creating kernel client with WaaP EOA as signer
const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer: waapWalletClient, // EOA from WaaP
  entryPoint: ENTRYPOINT_ADDRESS_V07,
  kernelVersion: KERNEL_V3_1,
});

const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
  entryPoint: ENTRYPOINT_ADDRESS_V07,
  kernelVersion: KERNEL_V3_1,
});

const kernelClient = createKernelAccountClient({
  account,
  chain: celo,
  bundlerTransport: http(bundlerUrl),
  paymaster: pimlicoPaymaster,
});

// This call triggers the error
const userOpHash = await kernelClient.sendUserOperation({
  calls: [{
    to: tokenAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipientAddress, amount],
    }),
  }],
});
```

---

## Additional Context

- The same setup works without WaaP (using a standard EOA signer)
- The error only appears when WaaP SDK is in the component tree
- The error occurs in a `useMemo` hook within the WaaP SDK's internal components
- We're on Celo Mainnet (Chain ID: 42220)

---

## Contact

- **Project:** MotusDAO Hub
- **Network:** Celo Mainnet
- **Smart Wallet:** `0x6cd82dA1C5Ee4C6DaCF00E7Ca084F22Db81762D9`
- **EOA (WaaP):** `0xd0563BBa8E42b6ab0ECDfc1f0eA1486c5C28Ba3b`

---

## Attachments

Full console output and additional logs available upon request.
