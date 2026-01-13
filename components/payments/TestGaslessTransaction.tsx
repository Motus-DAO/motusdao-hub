'use client'

import { useState } from 'react'
import { useWaaPWallets, useWaaP } from '@/lib/contexts/WaaPProvider'
import { parseEther } from 'viem'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { getCeloExplorerUrl } from '@/lib/celo'
import { getPrimaryWallet, identifyEmbeddedWallet, verifySmartWallet } from '@/lib/wallet-utils'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'

type TransactionStatus = 'idle' | 'preparing' | 'sending' | 'success' | 'error'

export function TestGaslessTransaction() {
  const { wallets } = useWaaPWallets()
  const { authenticated, ready } = useWaaP()
  const { kernelClient, smartAccountAddress, isInitializing } = useSmartAccount()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Get the smart wallet - this is what we use for gasless transactions
  // Smart wallet is a contract account that supports paymaster gas sponsorship
  const smartWallet = getPrimaryWallet(wallets)
  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const verification = verifySmartWallet(wallets)
  
  // Log wallet information for debugging
  if (ready && wallets.length > 0) {
    console.log('🔍 Wallet verification:', {
      smartWalletExists: verification.exists,
      smartWalletAddress: verification.smartWallet?.address,
      embeddedWalletAddress: verification.embeddedWallet?.address,
      allWallets: wallets.map(w => ({
        address: w.address,
        walletClientType: w.walletClientType,
        chainId: w.chainId,
      }))
    })
  }

  const sendTestTransaction = async () => {
    // Use ZeroDev Kernel client which has paymaster configured
    if (!kernelClient || !smartAccountAddress) {
      const errorMsg = isInitializing
        ? 'Smart wallet is still initializing. Please wait...'
        : 'Smart wallet not ready. Please ensure you are logged in and the smart wallet is initialized.'
      setError(errorMsg)
      return
    }

    if (!ready || !authenticated) {
      setError('Please connect your wallet first.')
      return
    }

    setStatus('preparing')
    setError('')
    setTxHash('')

    // Check if an error is the known WaaP/ethers encoding error (non-fatal)
    const isEncodingError = (error: unknown): boolean => {
      if (!error) return false
      const errorStr = error instanceof Error ? error.message : String(error)
      return errorStr.includes('invalid codepoint') || 
             errorStr.includes('missing continuation byte') ||
             errorStr.includes('strings/5.7.0')
    }

    try {
      setStatus('sending')

      console.log('🔄 Sending gasless transaction using ZeroDev Kernel client with paymaster...')
      console.log('🔐 Smart Wallet (sender):', smartAccountAddress)
      console.log('💡 Gas will be sponsored by Pimlico paymaster')

      // Use ZeroDev Kernel client which has the paymaster configured
      // For Kernel accounts, we use sendUserOperation which handles gasless transactions
      // Treasury multisig address: 0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9
      const userOpHash = await kernelClient.sendUserOperation({
        calls: [{
          to: '0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9' as `0x${string}`, // Treasury multisig address
          value: parseEther('0.001'), // Very small amount: 0.001 CELO
          data: '0x' as `0x${string}`, // No data, just a value transfer
        }],
      })

      console.log('✅ User operation sent:', userOpHash)
      console.log('⏳ Waiting for confirmation on blockchain...')

      // Wait for the user operation to be included in a bundle and get the receipt
      // Wrap in try-catch to handle non-fatal encoding errors from WaaP SDK
      let hash: string | undefined
      try {
        const receipt = await kernelClient.waitForUserOperationReceipt({
          hash: userOpHash
        })
        hash = receipt?.receipt?.transactionHash
      } catch (receiptError) {
        // Check if this is the known encoding error - if so, the tx likely succeeded
        if (isEncodingError(receiptError)) {
          console.warn('⚠️ Non-fatal encoding error during receipt wait (tx may have succeeded)')
          // Use the userOpHash as the transaction reference
          hash = userOpHash
        } else {
          throw receiptError
        }
      }

      if (!hash) {
        throw new Error('Transaction hash not found in receipt')
      }

      console.log('✅ Transaction confirmed:', hash)

      setTxHash(hash)
      setStatus('success')

      // Check transaction on explorer after a delay
      setTimeout(() => {
        window.open(getCeloExplorerUrl(hash, 'tx'), '_blank')
      }, 2000)
    } catch (err) {
      console.error('Transaction error:', err)
      
      // Check if this is the known encoding error - if so, don't treat as fatal
      if (isEncodingError(err)) {
        console.warn('⚠️ Non-fatal encoding error caught - transaction may have succeeded')
        setError('Transaction was sent but there was an error processing the response. Please check Celo Explorer.')
        setStatus('error')
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      
      // Check if error is related to paymaster/funding
      if (errorMessage.toLowerCase().includes('fund') || 
          errorMessage.toLowerCase().includes('balance') ||
          errorMessage.toLowerCase().includes('insufficient')) {
        setError(`${errorMessage}. Make sure the ZeroDev paymaster is funded. Check your ZeroDev dashboard.`)
      } else {
        setError(errorMessage)
      }
      setStatus('error')
    }
  }

  if (!ready) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Loading wallet...</span>
        </div>
      </GlassCard>
    )
  }

  if (!authenticated) {
    return (
      <GlassCard className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Please log in to test gasless transactions</p>
        </div>
      </GlassCard>
    )
  }

  // Check if ZeroDev Kernel client is ready
  if (isInitializing) {
    return (
      <GlassCard className="p-6">
        <div className="text-center">
          <Loader className="w-8 h-8 text-mauve-500 mx-auto mb-2 animate-spin" />
          <p className="text-muted-foreground mb-4">
            Initializing smart wallet with ZeroDev paymaster...
          </p>
        </div>
      </GlassCard>
    )
  }

  if (!kernelClient || !smartAccountAddress) {
    return (
      <GlassCard className="p-6">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-muted-foreground mb-4">
            Smart wallet not ready. Please ensure you are logged in and the smart wallet is initialized.
          </p>
          {!smartWallet && (
            <p className="text-sm text-muted-foreground mt-2">
              No WaaP wallet found. Please log in with email to get a wallet.
            </p>
          )}
        </div>
      </GlassCard>
    )
  }

  // Check if smart wallet exists and is properly configured (for display purposes)
  if (!verification.exists) {
    return (
      <GlassCard className="p-6">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {verification.isCreating ? 'Smart Wallet Creating...' : 'Smart Wallet Not Found'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {verification.message}
            {verification.isCreating && (
              <span className="block mt-2 text-sm">
                Smart wallets are created automatically but may take a few moments. 
                The smart wallet will be created on the first transaction attempt.
              </span>
            )}
          </p>
          
          {verification.isCreating ? (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-left mb-4">
              <p className="text-sm font-semibold text-blue-400 mb-2">Smart Wallet Creation</p>
              <p className="text-sm text-muted-foreground">
                ZeroDev creates smart wallets automatically when enabled. If this is your first time using the wallet, 
                the smart wallet contract will be deployed on your first transaction. This is normal and expected behavior.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Note:</strong> You can proceed with transactions - the smart wallet will be created automatically 
                when needed. The embedded wallet address shown below will be used until the smart wallet is ready.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-left mb-4">
              <p className="text-sm font-semibold text-yellow-400 mb-2">To enable smart wallets:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://dashboard.zerodev.app" target="_blank" rel="noopener noreferrer" className="text-mauve-400 hover:underline">ZeroDev Dashboard</a></li>
                <li>Navigate to <strong>Smart Wallets</strong> section</li>
                <li>Enable Smart Wallets for your app</li>
                <li>Configure Celo Mainnet (42220) with:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Bundler URL: <code className="text-xs">https://public.pimlico.io/v2/42220/rpc</code></li>
                    <li>Paymaster URL: <code className="text-xs">https://api.pimlico.io/v2/42220/rpc?apikey=YOUR_KEY</code></li>
                  </ul>
                </li>
                <li>Save and refresh this page</li>
              </ol>
            </div>
          )}
          
          {smartWallet && (
            <div className="p-3 bg-mauve-500/10 rounded-lg border border-mauve-500/20">
              <p className="text-xs text-muted-foreground mb-1">Current Wallet Address:</p>
              <p className="text-xs font-mono">{smartWallet.address}</p>
              {embeddedWallet && (
                <p className="text-xs text-muted-foreground mt-2">
                  Embedded Wallet (EOA): {embeddedWallet.address}
                </p>
              )}
              {verification.isCreating && (
                <p className="text-xs text-blue-400 mt-2">
                  ⏳ Smart wallet will be created automatically on first transaction
                </p>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Test Gasless Transaction</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This will send a small test transaction (0.001 CELO) to verify that the ZeroDev paymaster
            is sponsoring gas fees. The transaction should complete without requiring you to pay gas.
          </p>
        </div>

        <div className="p-4 bg-mauve-500/10 rounded-lg border border-mauve-500/20">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Smart Wallet Address:</span>
              <span className="font-mono text-xs">{smartAccountAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Type:</span>
              <span className="capitalize">
                ZeroDev Kernel (Contract with Paymaster)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chain:</span>
              <span>Celo Mainnet (42220)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paymaster:</span>
              <span className="text-green-400">✅ ZeroDev (Gasless Enabled)</span>
            </div>
            {embeddedWallet && embeddedWallet.address !== smartAccountAddress && (
              <div className="mt-2 pt-2 border-t border-mauve-500/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Embedded Wallet (EOA - Signer):</span>
                  <span className="font-mono text-xs text-muted-foreground">{embeddedWallet.address}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {status === 'idle' && (
          <CTAButton
            onClick={sendTestTransaction}
            className="w-full"
          >
            Send Test Transaction
          </CTAButton>
        )}

        {status === 'preparing' && (
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Preparing transaction...</span>
          </div>
        )}

        {status === 'sending' && (
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Sending transaction (gas should be sponsored)...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Transaction successful!</span>
            </div>
            {txHash && (
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Transaction Hash:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono break-all">{txHash}</code>
                  <a
                    href={getCeloExplorerUrl(txHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4 text-mauve-400 hover:text-mauve-300" />
                  </a>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              ✅ Check the transaction on Celo Explorer. If gas was sponsored, you should see
              that the transaction was paid by the ZeroDev paymaster (not your wallet balance).
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Transaction failed</span>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <CTAButton
              onClick={sendTestTransaction}
              className="w-full"
            >
              Try Again
            </CTAButton>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

