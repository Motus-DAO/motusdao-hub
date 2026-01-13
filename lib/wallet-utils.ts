/**
 * Wallet utilities - Compatible with WaaP wallet types
 * 
 * Migrated from Privy's ConnectedWallet type to WaaP wallet structure
 */

/**
 * WaaP wallet structure (mirrors the WaaPWallet interface from WaaPProvider)
 */
export interface WaaPWallet {
  address: `0x${string}`
  walletClientType: 'waap' | 'external'
  chainId: string
  connected: boolean
}

/**
 * Legacy type alias for backwards compatibility with code that used ConnectedWallet
 */
export type ConnectedWallet = WaaPWallet

/**
 * Wallet type identification
 */
export type WalletType = 'smart-wallet' | 'embedded' | 'external' | 'waap'

/**
 * Identifies the smart wallet from a list of WaaP wallets.
 * 
 * Note: With WaaP + ZeroDev architecture, smart wallets are created by ZeroDev
 * using the WaaP EOA as the owner/signer. This function now identifies the
 * WaaP wallet which will be used to create the smart wallet.
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The WaaP wallet if found, null otherwise
 */
export function identifySmartWallet(wallets: WaaPWallet[]): WaaPWallet | null {
  // With WaaP, we don't have separate smart wallets in the wallet list
  // Smart wallets are created by ZeroDev using the WaaP EOA as signer
  // For backwards compatibility, return the primary WaaP wallet
  const waapWallet = wallets.find(wallet => wallet.walletClientType === 'waap')
  
  if (waapWallet) {
    console.log('✅ WaaP wallet found (smart wallet created by ZeroDev):', waapWallet.address)
    return waapWallet
  }

  console.log('❌ No WaaP wallet found')
  return null
}

/**
 * Identifies the embedded wallet (EOA) from a list of WaaP wallets.
 * 
 * With WaaP, the "embedded wallet" is the WaaP-created EOA which uses
 * Human Keys technology for enhanced security.
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The WaaP wallet if found, null otherwise
 */
export function identifyEmbeddedWallet(wallets: WaaPWallet[]): WaaPWallet | null {
  // WaaP wallet is the embedded wallet (EOA with Human Keys security)
  const waapWallet = wallets.find(wallet => wallet.walletClientType === 'waap')
  
  if (waapWallet) {
    console.log('✅ WaaP embedded wallet (EOA) found:', waapWallet.address)
    return waapWallet
  }
  
  // Check for external wallets (MetaMask, etc.)
  const externalWallet = wallets.find(wallet => wallet.walletClientType === 'external')
  
  if (externalWallet) {
    console.log('ℹ️ Using external wallet as EOA:', externalWallet.address)
    return externalWallet
  }
  
  return null
}

/**
 * Gets the primary wallet address to use for the application.
 * 
 * With WaaP + ZeroDev, we use the WaaP wallet as the EOA owner for smart wallets.
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The primary wallet address, or null if not found
 */
export function getPrimaryWalletAddress(wallets: WaaPWallet[]): string | null {
  const waapWallet = identifyEmbeddedWallet(wallets)
  if (waapWallet?.address) {
    console.log('✅ Using WaaP wallet address:', waapWallet.address)
    return waapWallet.address
  }
  
  console.warn('⚠️ No WaaP wallet found')
  return null
}

/**
 * Gets the primary wallet to use for transactions.
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The primary wallet, or null if not found
 */
export function getPrimaryWallet(wallets: WaaPWallet[]): WaaPWallet | null {
  const waapWallet = identifyEmbeddedWallet(wallets)
  if (waapWallet) {
    console.log('✅ Using WaaP wallet for transactions:', waapWallet.address)
    return waapWallet
  }
  
  console.warn('⚠️ No WaaP wallet found')
  return null
}

/**
 * Determines the wallet type for a given wallet.
 * 
 * @param wallet - The wallet to check
 * @param allWallets - All available wallets (for context)
 * @returns The wallet type
 */
export function getWalletType(wallet: WaaPWallet | null, allWallets: WaaPWallet[]): WalletType {
  if (!wallet) {
    return 'external'
  }
  
  if (wallet.walletClientType === 'waap') {
    return 'waap'
  }
  
  return 'external'
}

/**
 * Verifies that a smart wallet exists and is ready.
 * 
 * With WaaP + ZeroDev architecture, the smart wallet is created by ZeroDev
 * using the WaaP EOA as the owner. This function verifies the WaaP wallet
 * which will be used to create/access the smart wallet.
 * 
 * @param wallets - Array of WaaP wallets
 * @returns Object with verification result and details
 */
export function verifySmartWallet(wallets: WaaPWallet[]): {
  exists: boolean
  smartWallet: WaaPWallet | null
  embeddedWallet: WaaPWallet | null
  message: string
  isCreating: boolean
} {
  const waapWallet = identifyEmbeddedWallet(wallets)
  
  if (waapWallet) {
    return {
      exists: true,
      smartWallet: waapWallet, // WaaP wallet will be used to create ZeroDev smart wallet
      embeddedWallet: waapWallet,
      message: 'WaaP wallet found - smart wallet will be created by ZeroDev',
      isCreating: false
    }
  }
  
  return {
    exists: false,
    smartWallet: null,
    embeddedWallet: null,
    message: 'No WaaP wallet found. Please log in with WaaP.',
    isCreating: false
  }
}

/**
 * Gets the EOA (Externally Owned Account) address to use.
 * 
 * Priority:
 * 1. External wallet (MetaMask, WalletConnect, etc.) - if user connected with external wallet
 * 2. WaaP wallet - if user logged in with WaaP (email, phone, social)
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The EOA address to use, or null if not found
 */
export function getEOAAddress(wallets: WaaPWallet[]): string | null {
  // First, check for external wallet (MetaMask, WalletConnect, etc.)
  const externalWallet = wallets.find(wallet => wallet.walletClientType === 'external')
  
  if (externalWallet?.address) {
    console.log('✅ Using external wallet EOA address:', externalWallet.address)
    return externalWallet.address
  }
  
  // If no external wallet, use WaaP wallet (for email/phone/social login)
  const waapWallet = wallets.find(wallet => wallet.walletClientType === 'waap')
  
  if (waapWallet?.address) {
    console.log('✅ Using WaaP wallet EOA address:', waapWallet.address)
    return waapWallet.address
  }
  
  console.warn('⚠️ No EOA address found')
  return null
}

/**
 * Gets the EOA wallet to use.
 * 
 * Priority:
 * 1. External wallet (MetaMask, WalletConnect, etc.) - if user connected with external wallet
 * 2. WaaP wallet - if user logged in with WaaP (email, phone, social)
 * 
 * @param wallets - Array of WaaP wallets
 * @returns The EOA wallet to use, or null if not found
 */
export function getEOAWallet(wallets: WaaPWallet[]): WaaPWallet | null {
  // First, check for external wallet (MetaMask, WalletConnect, etc.)
  const externalWallet = wallets.find(wallet => wallet.walletClientType === 'external')
  
  if (externalWallet) {
    console.log('✅ Using external wallet EOA:', externalWallet.address)
    return externalWallet
  }
  
  // If no external wallet, use WaaP wallet (for email/phone/social login)
  const waapWallet = wallets.find(wallet => wallet.walletClientType === 'waap')
  
  if (waapWallet) {
    console.log('✅ Using WaaP wallet EOA:', waapWallet.address)
    return waapWallet
  }
  
  console.warn('⚠️ No EOA wallet found')
  return null
}
