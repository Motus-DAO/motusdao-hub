'use client'

import { AnimatedAIChat } from '@/components/ui/animated-ai-chat'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets, getWalletIdentity, appendWalletIdentityParams } from '@/lib/wallet'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { buildVideochatUrl } from '@/lib/jitsi'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { sessionBelongsToWallet } from '@/lib/auth/hub-session'
import { getEOAAddress } from '@/lib/wallet-utils'
import { aiProcessingConsentCopy, chatModelLabel } from '@/lib/ai-consent-copy'

export default function PsychatPage() {
  const { role, theme } = useUIStore()
  const isLight = theme === 'light'
  const { user, authenticated, ready, providerId } = useWallet()
  const { wallets } = useWallets()
  const { isSessionReady } = useSiweSession()
  const sessionEoa = getEOAAddress(wallets)
  const router = useRouter()
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [aiConsent, setAiConsent] = useState(false)
  const [savingConsent, setSavingConsent] = useState(false)
  const [providerLabel, setProviderLabel] = useState('el proveedor configurado')
  const [aiProvider, setAiProvider] = useState<string | null>(null)
  const [modelLabel, setModelLabel] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)
  const [privacyMode, setPrivacyMode] = useState<'tee' | 'e2ee'>('tee')
  const [credit, setCredit] = useState<{
    remainingUsd: number
    allowanceUsd: number
    dailyUsd: number
    purchasedUsd: number
  } | null>(null)
  const [buyingPack, setBuyingPack] = useState<5 | 10 | null>(null)
  const [creditShopError, setCreditShopError] = useState<string | null>(null)

  const refreshCredit = useCallback(() => {
    if (!isSessionReady) {
      setCredit(null)
      return
    }
    void fetch('/api/ai/credit')
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            remainingUsd?: number
            allowanceUsd?: number
            dailyUsd?: number
            purchasedUsd?: number
          } | null
        ) => {
          if (!data || typeof data.remainingUsd !== 'number' || typeof data.allowanceUsd !== 'number') return
          setCredit({
            remainingUsd: data.remainingUsd,
            allowanceUsd: data.allowanceUsd,
            dailyUsd: data.dailyUsd ?? 0.1,
            purchasedUsd: data.purchasedUsd ?? 0,
          })
        }
      )
      .catch(() => undefined)
  }, [isSessionReady])

  useEffect(() => {
    refreshCredit()
  }, [refreshCredit])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('credit')
    const sessionId = params.get('session_id')
    if (checkout === 'cancelled') {
      setCreditShopError('El pago se canceló. El saldo no cambió.')
      window.history.replaceState(null, '', '/psychat')
      return
    }
    if (checkout !== 'success' || !sessionId || !isSessionReady) return
    let cancelled = false
    void fetch('/api/ai/credit/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        if (!cancelled && !response.ok) setCreditShopError(data.error || 'No se pudo acreditar el pago.')
      })
      .finally(() => {
        if (cancelled) return
        refreshCredit()
        window.history.replaceState(null, '', '/psychat')
      })
    return () => {
      cancelled = true
    }
  }, [isSessionReady, refreshCredit])

  const buyCredit = (amountUsd: 5 | 10) => {
    setBuyingPack(amountUsd)
    setCreditShopError(null)
    void fetch('/api/ai/credit/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUsd }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
        if (!response.ok || !data.url) {
          setCreditShopError(data.error || 'No se pudo abrir el pago.')
          setBuyingPack(null)
          return
        }
        window.location.href = data.url
      })
      .catch(() => {
        setCreditShopError('No se pudo abrir el pago.')
        setBuyingPack(null)
      })
  }

  useEffect(() => {
    let cancelled = false
    void fetch('/api/ai/disclosure')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { provider?: string; providerLabel?: string; model?: string } | null) => {
        if (cancelled || !data) return
        if (data.provider) setAiProvider(data.provider)
        if (data.providerLabel) setProviderLabel(data.providerLabel)
        if (data.model) setModelId(data.model)
        setModelLabel(chatModelLabel(data.model))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isSessionReady) {
      setAiConsent(false)
      return
    }
    let cancelled = false
    void fetch('/api/consent/ai-processing')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { consentToAIProcessing?: boolean } | null) => {
        if (cancelled) return
        setAiConsent(Boolean(data?.consentToAIProcessing))
      })
      .catch(() => {
        if (!cancelled) setAiConsent(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSessionReady])

  const acceptAiProcessing = async () => {
    setSavingConsent(true)
    setSessionError(null)
    try {
      const response = await fetch('/api/consent/ai-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'No se pudo guardar el consentimiento.')
      }
      setAiConsent(true)
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'No se pudo guardar el consentimiento.')
    } finally {
      setSavingConsent(false)
    }
  }

  const sendBlockedReason = !ready
    ? null
    : !authenticated || !isSessionReady
      ? 'Entra con tu wallet y confirma la sesión para usar Psychat.'
      : !aiConsent
        ? 'Marca el sí de procesamiento antes de enviar. Sin ese sí no se llama al modelo.'
        : null

  const handleRequestHumanSession = async () => {
    try {
      setSessionError(null)

      if (!ready || !authenticated || !isSessionReady) {
        setSessionError('Confirma la sesión de esta wallet antes de pedir una sesión humana.')
        return
      }

      const userEmail = user?.email?.address || user?.google?.email
      const walletIdentity = getWalletIdentity(user, providerId)

      if (!userEmail && !walletIdentity) {
        setSessionError('No se pudo identificar tu usuario. Intenta desde la página de perfil.')
        return
      }

      setIsCreatingSession(true)

      const params = new URLSearchParams()
      appendWalletIdentityParams(params, walletIdentity)
      if (userEmail) params.append('email', userEmail)

      const profileRes = await fetch(`/api/profile?${params.toString()}`)
      if (!profileRes.ok) {
        if (profileRes.status === 404) {
          throw new Error('No encontramos tu perfil. Completa primero tu registro en la sección Perfil.')
        }
        throw new Error('Error al obtener tu perfil de usuario.')
      }

      const profileData = await profileRes.json()
      const userId = profileData.user?.id as string | undefined
      if (
        profileData.user?.eoaAddress &&
        sessionEoa &&
        !sessionBelongsToWallet(profileData.user.eoaAddress, sessionEoa)
      ) {
        throw new Error('La sesión del Hub no corresponde a la wallet conectada. Cierra sesión y vuelve a entrar.')
      }

      if (!userId) {
        throw new Error('No se pudo obtener tu ID de usuario.')
      }

      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const sessionData = await sessionRes.json()

      if (!sessionRes.ok) {
        throw new Error(sessionData.error || 'Error al crear la sesión.')
      }

      const url = sessionData.session?.externalUrl
      if (!url) {
        throw new Error('La sesión no tiene un enlace de videollamada válido.')
      }

      router.push(buildVideochatUrl(url))
    } catch (err) {
      console.error('Error requesting human session:', err)
      setSessionError(
        err instanceof Error
          ? err.message
          : 'Hubo un problema al crear tu sesión. Intenta nuevamente más tarde.',
      )
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-background">
      <div className="flex flex-1 flex-col items-center px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex w-full max-w-2xl flex-col gap-3">
          {role === 'psm' && (
            <div
              className={`rounded-xl border px-4 py-2 text-xs ${
                isLight
                  ? 'border-amber-400/40 bg-amber-100 text-amber-900'
                  : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
              }`}
            >
              Esta IA es experimental y de apoyo a la supervisión clínica para profesionales capacitados.
              Úsala con criterio ético y profesional: no sustituye juicio clínico, diagnóstico ni intervención de
              emergencia.
            </div>
          )}

          <AnimatedAIChat
            fullScreen={false}
            role={role}
            onRequestHumanSession={role === 'usuario' ? handleRequestHumanSession : undefined}
            isCreatingSession={isCreatingSession}
            sessionError={sessionError}
            sendBlockedReason={sendBlockedReason}
            providerLabel={providerLabel}
            aiProvider={aiProvider}
            modelLabel={modelLabel}
            modelId={modelId}
            privacyMode={privacyMode}
            onPrivacyModeChange={setPrivacyMode}
            credit={credit}
            onCreditRefresh={refreshCredit}
            onBuyCredit={buyCredit}
            buyingPack={buyingPack}
            creditShopError={creditShopError}
            notice={
              <div
                className={`mx-auto max-w-xl rounded-xl border px-4 py-3 text-left text-sm ${
                  isLight
                    ? 'border-border bg-white text-slate-800'
                    : 'border-white/15 bg-white/[0.06] text-white/90'
                }`}
              >
                {!ready || !authenticated || !isSessionReady ? (
                  <p>Entra con tu wallet y confirma la sesión para usar Psychat. Sin eso no se llama al modelo.</p>
                ) : (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={aiConsent}
                      disabled={savingConsent || aiConsent}
                      onChange={(event) => {
                        if (event.target.checked) void acceptAiProcessing()
                      }}
                    />
                    <span>{aiProcessingConsentCopy(providerLabel, privacyMode)}</span>
                  </label>
                )}
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}
