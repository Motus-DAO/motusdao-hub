'use client'

import { useState } from 'react'
import { useWaaPWallets, useWaaP } from '@/lib/contexts/WaaPProvider'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { getCeloExplorerUrl } from '@/lib/celo'
import { getPrimaryWallet } from '@/lib/wallet-utils'
import { sendCELOPayment } from '@/lib/payments'

type TransactionStatus = 'idle' | 'preparing' | 'sending' | 'success' | 'error'

export function TestGaslessTransaction() {
  const { wallets } = useWaaPWallets()
  const { authenticated, ready } = useWaaP()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  const primaryWallet = getPrimaryWallet(wallets || [])

  const sendTestTransaction = async () => {
    if (!ready || !authenticated) {
      setError('Please connect your wallet first.')
      return
    }

    if (!primaryWallet) {
      setError('No WaaP wallet found. Please log in with email to get a wallet.')
      return
    }

    setStatus('preparing')
    setError('')
    setTxHash('')

    try {
      setStatus('sending')

      console.log('🔄 Sending test CELO transaction using WaaP EOA...')

      const result = await sendCELOPayment(primaryWallet, {
        from: primaryWallet.address,
        to: '0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9' as `0x${string}`,
        amount: '0.001',
        currency: 'CELO',
      })

      if (!result.success || !result.transactionHash) {
        throw new Error(result.error || 'Transaction failed')
      }

      const hash = result.transactionHash

      console.log('✅ Transaction confirmed:', hash)

      setTxHash(hash)
      setStatus('success')

      // Check transaction on explorer after a delay
      setTimeout(() => {
        window.open(getCeloExplorerUrl(hash, 'tx'), '_blank')
      }, 2000)
    } catch (err) {
      console.error('Transaction error:', err)
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
          <p>Please log in to test a transaction</p>
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
            This will send a small test transaction (0.001 CELO) using your WaaP wallet.
            Depending on your WaaP configuration, gas may be sponsored or paid from your wallet.
          </p>
        </div>

        <div className="p-4 bg-mauve-500/10 rounded-lg border border-mauve-500/20">
          <div className="space-y-2 text-sm">
            {primaryWallet && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Address:</span>
                  <span className="font-mono text-xs">{primaryWallet.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Type:</span>
                  <span className="capitalize">
                    WaaP EOA
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chain:</span>
              <span>Celo Mainnet (42220)</span>
            </div>
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

