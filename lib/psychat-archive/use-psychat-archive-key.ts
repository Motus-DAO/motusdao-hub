'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { derivePsychatArchiveKeyFromSignature } from '@/lib/psychat-archive/crypto'
import { buildPsychatArchiveUnlockMessage } from '@/lib/psychat-archive/unlock-message'
import {
  isUserRejectedSignError,
  signSiweMessage,
  withSignTimeout,
} from '@/lib/auth/signing'

export function usePsychatArchiveKey() {
  const { wallets } = useWallets()
  const { provider } = useWalletProvider()
  const eoaAddress = getEOAAddress(wallets)

  const keyRef = useRef<CryptoKey | null>(null)
  const keyForEoaRef = useRef<string | null>(null)
  const [state, setState] = useState<'idle' | 'unlocking' | 'ready' | 'needs_wallet'>(
    eoaAddress ? 'idle' : 'needs_wallet'
  )
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const wipeKey = useCallback(() => {
    keyRef.current = null
    keyForEoaRef.current = null
    setState(eoaAddress ? 'idle' : 'needs_wallet')
  }, [eoaAddress])

  useEffect(() => {
    wipeKey()
  }, [eoaAddress, wipeKey])

  useEffect(() => {
    const onPageHide = () => wipeKey()
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [wipeKey])

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!eoaAddress || !provider) {
      setState('needs_wallet')
      return false
    }
    setUnlockError(null)
    setState('unlocking')
    try {
      const message = buildPsychatArchiveUnlockMessage(eoaAddress)
      const signature = await withSignTimeout(
        signSiweMessage(provider, message, eoaAddress)
      )
      const key = await derivePsychatArchiveKeyFromSignature(signature)
      keyRef.current = key
      keyForEoaRef.current = eoaAddress.toLowerCase()
      setState('ready')
      return true
    } catch (error) {
      keyRef.current = null
      keyForEoaRef.current = null
      if (isUserRejectedSignError(error)) {
        setUnlockError(null)
        setState('idle')
        return false
      }
      setUnlockError(
        error instanceof Error ? error.message : 'No se pudo desbloquear el archivo'
      )
      setState('idle')
      return false
    }
  }, [eoaAddress, provider])

  const getKey = useCallback((): CryptoKey | null => {
    if (!eoaAddress || !keyRef.current) return null
    if (keyForEoaRef.current !== eoaAddress.toLowerCase()) return null
    return keyRef.current
  }, [eoaAddress])

  return {
    eoaAddress,
    state,
    unlockError,
    unlock,
    wipeKey,
    getKey,
    isUnlocked: state === 'ready' && getKey() !== null,
  }
}
