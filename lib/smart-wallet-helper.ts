import type { WaaPWallet } from './wallet-utils'

/**
 * Helper functions for smart wallet creation and management
 * With WaaP + ZeroDev Kernel, smart wallets are created by ZeroDev using the WaaP EOA as signer
 */

/**
 * Attempts to get or create the smart wallet address.
 * With WaaP + ZeroDev Kernel, the smart wallet address can be calculated/predicted
 * even before the contract is deployed.
 * 
 * @param waapWallet - The WaaP wallet (EOA) that will sign for the smart wallet
 * @returns The predicted smart wallet address, or null if not available
 */
export async function getSmartWalletAddress(waapWallet: WaaPWallet): Promise<string | null> {
  try {
    // With WaaP + ZeroDev Kernel, the smart wallet address is deterministic
    // based on the WaaP EOA address and index (0 by default)
    // For now, return null - the smart wallet address is managed by ZeroDevSmartWalletProvider
    console.log('ℹ️ Smart wallet address is managed by ZeroDevSmartWalletProvider')
    return null
  } catch (error) {
    console.error('Error getting smart wallet address:', error)
    return null
  }
}

/**
 * Triggers smart wallet creation by attempting a dummy transaction.
 * This will cause ZeroDev Kernel to deploy the smart wallet contract.
 * 
 * WARNING: This will cost gas (or use paymaster if configured).
 * Only use if you need the smart wallet address immediately.
 * 
 * @param waapWallet - The WaaP wallet to use
 * @returns The smart wallet address after creation, or null if failed
 */
export async function triggerSmartWalletCreation(waapWallet: WaaPWallet): Promise<string | null> {
  try {
    // With WaaP + ZeroDev, smart wallet creation is handled by ZeroDevSmartWalletProvider
    // The smart wallet will be deployed automatically on first transaction
    console.log('ℹ️ Smart wallet will be created on first transaction via ZeroDev')
    return null
  } catch (error) {
    console.error('Error triggering smart wallet creation:', error)
    return null
  }
}

/**
 * Waits for smart wallet to appear in the wallets list.
 * 
 * Note: With WaaP + ZeroDev architecture, the smart wallet is managed by
 * ZeroDevSmartWalletProvider, not in the WaaP wallets list.
 * This function is kept for backwards compatibility but may not be needed.
 * 
 * @param wallets - Current wallets array
 * @param checkInterval - How often to check (ms)
 * @param maxWaitTime - Maximum time to wait (ms)
 * @returns Promise that resolves when smart wallet is found, or rejects on timeout
 */
export function waitForSmartWallet(
  wallets: WaaPWallet[],
  checkInterval: number = 1000,
  maxWaitTime: number = 30000
): Promise<WaaPWallet> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const check = () => {
      // With WaaP, the wallet list contains the WaaP EOA wallet
      // Smart wallet is managed separately by ZeroDev
      const waapWallet = wallets.find(w => w.walletClientType === 'waap')
      
      if (waapWallet && waapWallet.connected) {
        console.log('✅ WaaP wallet detected (smart wallet managed by ZeroDev):', waapWallet.address)
        resolve(waapWallet)
        return
      }
      
      const elapsed = Date.now() - startTime
      if (elapsed >= maxWaitTime) {
        reject(new Error('Timeout waiting for WaaP wallet'))
        return
      }
      
      // Check again after interval
      setTimeout(check, checkInterval)
    }
    
    // Start checking
    check()
  })
}
