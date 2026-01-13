# Smart Wallet Analysis Report

## Executive Summary

This analysis examines how smart wallets are handled in the MotusDAO Hub codebase, specifically checking whether a smart wallet is created per wallet when creating an account.

**Key Finding**: Smart wallets are **enabled** in the Privy configuration, but the codebase does **NOT explicitly verify or handle smart wallet creation**. The system relies on Privy's automatic smart wallet creation, but there's no code to:
1. Verify that a smart wallet was actually created
2. Distinguish between embedded wallet (EOA) and smart wallet (contract) addresses
3. Store or use the smart wallet address specifically
4. Ensure one smart wallet per user account

---

## 1. Privy Configuration

### Location: `components/PrivyProviderWrapper.tsx`

```31:33:components/PrivyProviderWrapper.tsx
        smartWallets: {
          enabled: true,
        },
```

**Status**: ✅ Smart wallets are **enabled** in the Privy configuration.

### Embedded Wallet Configuration

```22:27:components/PrivyProviderWrapper.tsx
        embeddedWallets: { 
          createOnLogin: 'users-without-wallets',
          // Gas sponsorship is configured in Privy dashboard (Pimlico paymaster)
          // Privy will automatically use the paymaster for smart wallet transactions
          noPromptOnSignature: false,
        },
```

**Behavior**: 
- Embedded wallets (EOA) are created when users log in without a wallet
- When smart wallets are enabled, Privy **should** automatically create a smart wallet contract account for each embedded wallet
- However, this is **implicit** - there's no explicit verification in the code

---

## 2. Wallet Address Retrieval During Onboarding

### Location: `components/onboarding/steps/StepConnect.tsx`

```54:55:components/onboarding/steps/StepConnect.tsx
  // Get the primary wallet address - simplified
  const walletAddress = user?.wallet?.address || wallets[0]?.address
```

**Problem**: This code:
- Gets the first wallet from the `wallets` array
- Does **NOT** distinguish between embedded wallet and smart wallet
- Does **NOT** verify which type of wallet it is
- Does **NOT** prefer the smart wallet address over the embedded wallet

### Wallet Address Storage

```77:84:components/onboarding/steps/StepConnect.tsx
      if (userEmail !== data.email || userWalletAddress !== data.walletAddress) {
        updateData({ 
          email: userEmail,
          walletAddress: userWalletAddress,
          privyId: user.id,
          celoChainId: celoChain.id,
          walletType: wallets[0]?.walletClientType === 'privy' ? 'embedded' : 'external'
        })
```

**Issue**: 
- Stores `walletType` as 'embedded' or 'external', but **NOT** 'smart-wallet'
- The `walletAddress` stored could be either the embedded wallet OR smart wallet address
- No logic to identify or prefer the smart wallet address

---

## 3. Database Schema

### Location: `prisma/schema.prisma`

```18:36:prisma/schema.prisma
model User {
  id             String   @id @default(cuid())
  role           Role     @default(usuario)
  email          String   @unique
  walletAddress  String   @unique
  privyId        String?  @unique
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  profile        Profile?
  patient        PatientProfile?
  psm            PSMProfile?
  journalEntries JournalEntry[]
  enrollments    Enrollment[]
  contactMessages ContactMessage[]

  @@map("users")
}
```

**Limitation**: 
- Only **ONE** `walletAddress` field exists
- No separate field for smart wallet address
- No field to store wallet type (embedded vs smart wallet)
- Cannot distinguish between embedded wallet and smart wallet addresses

---

## 4. Account Creation API Endpoints

### User Onboarding: `app/api/onboarding/user/route.ts`

```50:58:app/api/onboarding/user/route.ts
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: 'usuario',
          email: validatedData.email,
          walletAddress: validatedData.walletAddress,
          privyId: validatedData.privyId
        }
      })
```

### PSM Onboarding: `app/api/onboarding/psm/route.ts`

```59:68:app/api/onboarding/psm/route.ts
    // Create user and related records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          role: 'psm',
          email: validatedData.email,
          walletAddress: validatedData.walletAddress,
          privyId: validatedData.privyId
        }
      })
```

**Issue**: 
- Both endpoints simply store the `walletAddress` provided
- No verification that this is a smart wallet address
- No logic to create or verify smart wallet creation
- No distinction between wallet types

---

## 5. Payment/Transaction Code

### Location: `components/payments/TestGaslessTransaction.tsx`

```21:34:components/payments/TestGaslessTransaction.tsx
  // Get all Privy wallets
  // When smart wallets are enabled, Privy creates:
  // 1. Embedded wallet (EOA) - the signer (address like 0x1F93...)
  // 2. Smart wallet (contract) - supports gasless transactions via paymaster (different address)
  const privyWallets = wallets.filter(wallet => wallet.walletClientType === 'privy')
  
  // IMPORTANT: Smart wallets must be enabled in Privy Dashboard
  // Go to: Privy Dashboard > Smart Wallets > Enable and configure for Celo Mainnet
  // The smart wallet address will be DIFFERENT from the embedded wallet address
  // If you only see one wallet with address 0x1F93..., smart wallets are NOT enabled
  
  // For now, we'll use the first wallet, but it should be the smart wallet if enabled
  const smartWallet = privyWallets[0]
  const embeddedWallet = privyWallets[0] // Same for now until smart wallet is created
```

**Critical Issue**: 
- The code **acknowledges** that smart wallets should exist
- But it just uses `privyWallets[0]` without checking if it's actually a smart wallet
- There's a workaround check for EOA addresses (starting with `0x1f93`), but this is a heuristic, not a proper check

### EOA Detection Heuristic

```168:171:components/payments/TestGaslessTransaction.tsx
  // Check if this is actually a smart wallet or just an embedded wallet (EOA)
  // Smart wallets have different addresses from embedded wallets
  // If address starts with 0x1F93... it's likely the embedded EOA, not smart wallet
  const isLikelyEOA = smartWallet.address?.toLowerCase().startsWith('0x1f93')
```

**Problem**: This is a **heuristic**, not a reliable method to identify wallet types.

---

## 6. How Privy Smart Wallets Work

Based on Privy's architecture:

1. **Embedded Wallet (EOA)**: Created when user logs in without a wallet
   - Address typically starts with `0x1F93...` (Privy's deterministic address prefix)
   - This is an Externally Owned Account (EOA)
   - Acts as the **signer** for the smart wallet

2. **Smart Wallet (Contract)**: Created automatically when:
   - Smart wallets are enabled in config ✅
   - User has an embedded wallet
   - Smart wallet is a **contract account** with a different address
   - Uses the embedded wallet as the signer
   - Supports gasless transactions via paymaster

3. **Automatic Creation**: Privy creates smart wallets **automatically** - no explicit API call needed

---

## 7. Current Flow Analysis

### Account Creation Flow

1. **User logs in** (`StepConnect.tsx`)
   - Calls `login()` from Privy
   - Privy creates embedded wallet (if user doesn't have one)
   - Privy **should** automatically create smart wallet (if enabled)

2. **Wallet address retrieved** (`StepConnect.tsx:55`)
   - Gets `user?.wallet?.address || wallets[0]?.address`
   - **Problem**: Could be embedded wallet OR smart wallet - no way to know

3. **Address stored in onboarding store**
   - Stored as `walletAddress` in local state
   - No distinction between wallet types

4. **Account created via API**
   - `walletAddress` sent to `/api/onboarding/user` or `/api/onboarding/psm`
   - Stored in database as `User.walletAddress`
   - **Problem**: We don't know if this is the embedded wallet or smart wallet address

5. **No verification**
   - No code verifies that a smart wallet was actually created
   - No code checks if the stored address is a smart wallet or embedded wallet

---

## 8. Issues Identified

### Critical Issues

1. **No Smart Wallet Verification**
   - Code assumes Privy creates smart wallets automatically
   - No verification that smart wallet was actually created
   - No error handling if smart wallet creation fails

2. **Ambiguous Wallet Address**
   - Cannot determine if stored `walletAddress` is embedded wallet or smart wallet
   - Could be storing the wrong address type

3. **No Smart Wallet Identification**
   - No code to identify which wallet in the `wallets` array is the smart wallet
   - No proper way to distinguish between EOA and contract accounts

4. **Database Limitation**
   - Only one `walletAddress` field
   - Cannot store both embedded wallet and smart wallet addresses
   - Cannot track wallet type

5. **Payment Code Issues**
   - Uses heuristic to detect EOA (checking for `0x1f93` prefix)
   - Doesn't properly identify smart wallet
   - May use wrong wallet for gasless transactions

### Medium Priority Issues

6. **No Explicit Smart Wallet Creation**
   - Relies entirely on Privy's automatic creation
   - No fallback if automatic creation doesn't work

7. **No Wallet Type Tracking**
   - `walletType` field in onboarding store only tracks 'embedded' vs 'external'
   - Doesn't track 'smart-wallet' type

---

## 9. Recommendations

### Immediate Actions

1. **Add Smart Wallet Verification**
   - After user login, verify that a smart wallet exists
   - Check `wallets` array for contract accounts
   - Log warning if smart wallet not found

2. **Identify Smart Wallet Properly**
   - Use Privy's wallet properties to identify smart wallet
   - Check if wallet is a contract account (not EOA)
   - Prefer smart wallet address over embedded wallet

3. **Update Database Schema** (Optional but Recommended)
   - Add `smartWalletAddress` field to User model
   - Add `walletType` enum field
   - Store both addresses if needed

4. **Fix Wallet Address Retrieval**
   - In `StepConnect.tsx`, properly identify smart wallet
   - Prefer smart wallet address for storage
   - Store wallet type information

5. **Update Payment Code**
   - Properly identify smart wallet instead of using heuristic
   - Verify smart wallet exists before attempting gasless transactions
   - Add proper error handling

### Code Changes Needed

#### 1. Smart Wallet Identification Utility

Create a utility function to identify smart wallets:

```typescript
// lib/wallet-utils.ts
import type { Wallet } from '@privy-io/react-auth'

export function identifySmartWallet(wallets: Wallet[]): Wallet | null {
  // Smart wallets are contract accounts, not EOAs
  // They typically have different addresses from embedded wallets
  // Check Privy wallet properties to identify smart wallet
  
  // Option 1: Check if wallet has smart wallet properties
  const smartWallet = wallets.find(wallet => {
    // Privy smart wallets may have specific properties
    // Check wallet type or contract account status
    return wallet.walletClientType === 'privy' && 
           !wallet.address?.toLowerCase().startsWith('0x1f93')
  })
  
  return smartWallet || null
}

export function identifyEmbeddedWallet(wallets: Wallet[]): Wallet | null {
  return wallets.find(wallet => 
    wallet.walletClientType === 'privy' && 
    wallet.address?.toLowerCase().startsWith('0x1f93')
  ) || null
}
```

#### 2. Update StepConnect.tsx

```typescript
// In StepConnect.tsx
import { identifySmartWallet, identifyEmbeddedWallet } from '@/lib/wallet-utils'

// Replace line 55:
const smartWallet = identifySmartWallet(wallets)
const embeddedWallet = identifyEmbeddedWallet(wallets)
const walletAddress = smartWallet?.address || embeddedWallet?.address || wallets[0]?.address

// Update wallet type tracking:
walletType: smartWallet ? 'smart-wallet' : (embeddedWallet ? 'embedded' : 'external')
```

#### 3. Add Smart Wallet Verification

```typescript
// After login, verify smart wallet exists
useEffect(() => {
  if (authenticated && wallets.length > 0) {
    const smartWallet = identifySmartWallet(wallets)
    if (!smartWallet) {
      console.warn('⚠️ Smart wallet not found. Smart wallets may not be enabled in Privy Dashboard.')
    } else {
      console.log('✅ Smart wallet found:', smartWallet.address)
    }
  }
}, [authenticated, wallets])
```

#### 4. Update Database Schema (Optional)

```prisma
model User {
  id                String   @id @default(cuid())
  role              Role     @default(usuario)
  email             String   @unique
  walletAddress     String   @unique  // Embedded wallet address
  smartWalletAddress String? @unique  // Smart wallet address (optional)
  walletType        String?           // 'embedded', 'smart-wallet', 'external'
  privyId           String?  @unique
  // ... rest of fields
}
```

---

## 10. Testing Recommendations

1. **Verify Smart Wallet Creation**
   - Test with new user account creation
   - Check that smart wallet is created automatically
   - Verify smart wallet address is different from embedded wallet

2. **Test Wallet Address Storage**
   - Verify which address is stored in database
   - Check if it's the smart wallet or embedded wallet address
   - Ensure consistency across onboarding flows

3. **Test Payment Functionality**
   - Verify gasless transactions use smart wallet
   - Test that paymaster sponsorship works
   - Check error handling if smart wallet not available

4. **Test Edge Cases**
   - User with external wallet (MetaMask, etc.)
   - User with existing Privy account
   - Smart wallet creation failure scenarios

---

## 11. Conclusion

**Answer to the Question**: 

> "Are we creating one smart wallet per wallet created when creating an account?"

**Answer**: 
- **Intended**: Yes - Privy is configured to automatically create one smart wallet per embedded wallet
- **Actual**: **Uncertain** - The codebase does not verify or explicitly handle smart wallet creation
- **Stored Address**: Unknown - The code cannot determine if the stored `walletAddress` is the embedded wallet or smart wallet address

**Status**: ⚠️ **Needs Verification and Fixes**

The system relies on Privy's automatic smart wallet creation but has no verification mechanism. The code should be updated to:
1. Explicitly identify and verify smart wallet creation
2. Store the correct wallet address (preferably smart wallet)
3. Add proper error handling and verification

---

## 12. Next Steps

1. ✅ **Immediate**: Add smart wallet identification logic
2. ✅ **Immediate**: Verify smart wallet creation during onboarding
3. ⚠️ **High Priority**: Update wallet address retrieval to prefer smart wallet
4. ⚠️ **High Priority**: Add smart wallet verification and error handling
5. 📋 **Medium Priority**: Consider database schema updates
6. 📋 **Low Priority**: Add comprehensive testing

---

*Report Generated: $(date)*
*Codebase Version: Current main branch*
















