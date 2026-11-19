'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  deriveAccountDataAesKey,
  deriveSafeNotesAesKeyFromSignature,
} from '@/lib/safe-notes/crypto'
import { buildSafeNotesUnlockMessage } from '@/lib/safe-notes/unlock-message'
import { buildPsychatArchiveUnlockMessage } from '@/lib/psychat-archive/unlock-message'
import { buildAccountDataUnlockMessage } from '@/lib/account-data-key/unlock-message'
import {
  dataKeyAadInput,
  resolveEffectiveDataKeyMode,
  type DataKeyAadInput,
} from '@/lib/account-data-key/mode'
import type { DataKeyMode } from '@/lib/account-data-key/constants'
import {
  fetchDataKeyPrefs,
  patchDataKeyMode,
  type DataKeyPrefsResponse,
} from '@/lib/account-data-key/profile-client'
import { fetchAppSession } from '@/lib/auth/client'
import {
  isUserRejectedSignError,
  signSiweMessage,
  withSignTimeout,
} from '@/lib/auth/signing'

export type DataKeyUnlockScope = 'safe-notes' | 'psychat-archive'

export type DataKeyUnlockState = 'idle' | 'unlocking' | 'ready' | 'needs_wallet'

function walletUnlockMessage(scope: DataKeyUnlockScope, eoaAddress: string): string {
  if (scope === 'psychat-archive') {
    return buildPsychatArchiveUnlockMessage(eoaAddress)
  }
  return buildSafeNotesUnlockMessage(eoaAddress)
}

export function useDataKeyUnlock(scope: DataKeyUnlockScope) {
  const { wallets } = useWallets()
  const { provider } = useWalletProvider()
  const eoaAddress = getEOAAddress(wallets)

  const keyRef = useRef<CryptoKey | null>(null)
  const unlockBindingRef = useRef<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<DataKeyPrefsResponse | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [state, setState] = useState<DataKeyUnlockState>(eoaAddress ? 'idle' : 'needs_wallet')
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const effectiveMode: DataKeyMode = prefs
    ? resolveEffectiveDataKeyMode({
        dataKeyMode: prefs.dataKeyMode,
        dataKeyVersion: prefs.dataKeyVersion,
        dataKeyWalletEoa: prefs.dataKeyWalletEoa,
      })
    : 'wallet'

  const needsModeChoice =
    Boolean(prefs?.isLegacy) && !prefs?.hasEncryptedData && prefs !== null && !prefsLoading

  const refreshPrefs = useCallback(async () => {
    const [session, keyPrefs] = await Promise.all([fetchAppSession(), fetchDataKeyPrefs()])
    setUserId(session.userId)
    setPrefs(keyPrefs)
    setPrefsLoading(false)
    return keyPrefs
  }, [])

  useEffect(() => {
    void refreshPrefs()
  }, [refreshPrefs])

  const wipeKey = useCallback(() => {
    keyRef.current = null
    unlockBindingRef.current = null
    setState(eoaAddress ? 'idle' : 'needs_wallet')
  }, [eoaAddress])

  useEffect(() => {
    wipeKey()
  }, [eoaAddress, effectiveMode, wipeKey])

  useEffect(() => {
    const onPageHide = () => wipeKey()
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [wipeKey])

  const getAadInput = useCallback((): DataKeyAadInput | null => {
    if (effectiveMode === 'account') {
      if (!userId) return null
      return dataKeyAadInput('account', userId, eoaAddress ?? '')
    }
    if (!eoaAddress) return null
    return dataKeyAadInput('wallet', userId ?? '', eoaAddress)
  }, [effectiveMode, userId, eoaAddress])

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!eoaAddress || !provider) {
      setState('needs_wallet')
      return false
    }
    if (effectiveMode === 'account' && !userId) {
      setUnlockError('Inicia sesión en el Hub para desbloquear con tu cuenta.')
      return false
    }

    setUnlockError(null)
    setState('unlocking')
    try {
      const message =
        effectiveMode === 'account' && userId
          ? buildAccountDataUnlockMessage(userId)
          : walletUnlockMessage(scope, eoaAddress)
      const signature = await withSignTimeout(
        signSiweMessage(provider, message, eoaAddress)
      )
      const key =
        effectiveMode === 'account' && userId
          ? await deriveAccountDataAesKey(userId)
          : await deriveSafeNotesAesKeyFromSignature(signature)
      keyRef.current = key
      unlockBindingRef.current =
        effectiveMode === 'account' ? `account:${userId}` : `wallet:${eoaAddress.toLowerCase()}`
      setState('ready')
      return true
    } catch (error) {
      keyRef.current = null
      unlockBindingRef.current = null
      if (isUserRejectedSignError(error)) {
        setUnlockError(null)
        setState('idle')
        return false
      }
      setUnlockError(
        error instanceof Error ? error.message : 'No se pudo desbloquear los datos cifrados'
      )
      setState('idle')
      return false
    }
  }, [eoaAddress, provider, effectiveMode, userId, scope])

  const getKey = useCallback((): CryptoKey | null => {
    if (!keyRef.current || !unlockBindingRef.current) return null
    if (effectiveMode === 'account') {
      if (!userId || unlockBindingRef.current !== `account:${userId}`) return null
      return keyRef.current
    }
    if (!eoaAddress || unlockBindingRef.current !== `wallet:${eoaAddress.toLowerCase()}`) {
      return null
    }
    return keyRef.current
  }, [effectiveMode, userId, eoaAddress])

  const chooseDataKeyMode = useCallback(
    async (mode: DataKeyMode): Promise<boolean> => {
      const result = await patchDataKeyMode({ mode })
      if (!result.ok) {
        if (result.status === 409) {
          setUnlockError('Hay datos cifrados: usa la migración en Perfil antes de cambiar el modo.')
        }
        return false
      }
      setPrefs(result.prefs)
      wipeKey()
      return true
    },
    [wipeKey]
  )

  /** Wallet-derived AES key (v1). Used when migrating to/from wallet mode. */
  const getWalletSignatureKey = useCallback(async (): Promise<CryptoKey | null> => {
    if (!eoaAddress || !provider) return null
    try {
      const message = walletUnlockMessage(scope, eoaAddress)
      const signature = await withSignTimeout(signSiweMessage(provider, message, eoaAddress))
      return await deriveSafeNotesAesKeyFromSignature(signature)
    } catch (error) {
      if (isUserRejectedSignError(error)) return null
      throw error
    }
  }, [eoaAddress, provider, scope])

  return {
    eoaAddress,
    userId,
    prefs,
    prefsLoading,
    effectiveMode,
    effectiveKeyVersion: prefs?.effectiveKeyVersion ?? 1,
    needsModeChoice,
    state,
    unlockError,
    unlock,
    wipeKey,
    getKey,
    getAadInput,
    refreshPrefs,
    chooseDataKeyMode,
    getWalletSignatureKey,
    isUnlocked: state === 'ready' && getKey() !== null,
  }
}