'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Loader, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Shield,
  ArrowRight,
  X,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { motusNameService } from '@/lib/motus-name-service'
import { getCeloExplorerUrl } from '@/lib/celo'
import { ensureFaucetCeloForMns, registerMotusName } from '@/lib/mns-register'

interface StepBlockchainProps {
  onNext: () => void
  onBack: () => void
}

type BlockchainStatus = 'idle' | 'waiting-wallet' | 'submitting' | 'success' | 'error'

export function StepBlockchain({ onNext, onBack }: StepBlockchainProps) {
  const { data, updateData } = useOnboardingStore()
  const [status, setStatus] = useState<BlockchainStatus>('idle')
  const [error, setError] = useState<string>('')
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null)
  const [faucetTxHash, setFaucetTxHash] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isNameAvailable, setIsNameAvailable] = useState<boolean | null>(null)
  const [isNameValid, setIsNameValid] = useState<boolean | null>(null)
  const [isRegisteringName, setIsRegisteringName] = useState(false)
  const [nameResult, setNameResult] = useState<string | null>(null)
  const [nameTxHash, setNameTxHash] = useState<string | null>(null)
  const [ownsName, setOwnsName] = useState(false)
  const [showMnsInfo, setShowMnsInfo] = useState(false)
  const [showSkipMnsModal, setShowSkipMnsModal] = useState(false)
  const [showMnsSuccessModal, setShowMnsSuccessModal] = useState(false)
  const [skippedMns, setSkippedMns] = useState(false)
  const [registrationJustCompleted, setRegistrationJustCompleted] = useState(false)
  const [registrationPrice, setRegistrationPrice] = useState<string | null>(null)
  const [oneClickProgress, setOneClickProgress] = useState<string | null>(null)

  useEffect(() => {
    motusNameService.getRegistrationPrice().then(setRegistrationPrice).catch(() => {})
  }, [])

  // Restore domain from store or on-chain when user returns to this step
  useEffect(() => {
    let cancelled = false

    const loadExistingDomain = async () => {
      if (!data.eoaAddress) return

      const address = data.eoaAddress as `0x${string}`
      const storedName = data.motusName?.replace('.motus', '')

      try {
        const onChainName = await motusNameService.reverseLookup(address)
        const resolvedName = storedName || onChainName

        if (!resolvedName || cancelled) return

        setName(resolvedName)
        setIsNameValid(true)
        setOwnsName(true)
        setIsNameAvailable(false)
        setNameResult(`✅ Ya tienes registrado ${resolvedName}.motus en Celo.`)

        if (!data.motusName) {
          updateData({ motusName: resolvedName })
        }
      } catch (e) {
        console.error('Error loading existing MNS domain:', e)
      }
    }

    void loadExistingDomain()

    return () => {
      cancelled = true
    }
  }, [data.eoaAddress, data.motusName, updateData])

  useEffect(() => {
    if (data.eoaAddress && data.smartWalletAddress !== data.eoaAddress) {
      updateData({
        smartWalletAddress: data.eoaAddress,
        walletType: data.walletType || 'external',
      })
    }
  }, [data.eoaAddress, data.smartWalletAddress, data.walletType, updateData])

  const hasRegisteredMns = ownsName || Boolean(data.mnsTxHash)
  const displayName = name || data.motusName?.replace(/\.motus$/i, '') || ''

  const showRegistrationSuccess = () => {
    setRegistrationJustCompleted(true)
    setShowMnsSuccessModal(true)
  }

  const proceedToSuccess = (options?: { skipped?: boolean }) => {
    if (options?.skipped) {
      setSkippedMns(true)
    }
    setStatus('success')
  }

  const handleCompleteStep = () => {
    if (hasRegisteredMns) {
      proceedToSuccess()
      return
    }
    setShowSkipMnsModal(true)
  }

  const handleConfirmSkipMns = () => {
    setShowSkipMnsModal(false)
    proceedToSuccess({ skipped: true })
  }

  const handleOneClickRegister = async () => {
    if (!name || !isNameValid) {
      setNameResult('❌ Elige un nombre válido para tu dominio')
      return
    }
    if (!data.eoaAddress) {
      setNameResult('❌ Conecta tu wallet primero para registrar un dominio')
      return
    }

    if (ownsName) {
      updateData({ motusName: name })
      showRegistrationSuccess()
      return
    }

    if (!isNameAvailable) {
      setNameResult('❌ El nombre no está disponible')
      return
    }

    const targetAddress = data.eoaAddress as `0x${string}`

    setIsRegisteringName(true)
    setNameResult(null)
    setNameTxHash(null)
    setOneClickProgress('Preparando tu dominio...')

    try {
      setOneClickProgress('Verificando CELO para gas en Celo...')
      const faucetResult = await ensureFaucetCeloForMns(targetAddress)

      if (!faucetResult.success && !faucetResult.skipped) {
        if (faucetResult.retryInMinutes) {
          setNameResult(
            `⏱ ${faucetResult.error} Si ya tienes CELO, intenta registrar de nuevo.`
          )
        } else {
          setNameResult(`❌ ${faucetResult.error || 'No se pudo obtener CELO del faucet'}`)
        }
        return
      }

      if (faucetResult.amount) {
        setFaucetMessage(`✅ Recibiste ${faucetResult.amount} CELO para gas.`)
        setFaucetTxHash(faucetResult.txHash || null)
      }

      setOneClickProgress('Registrando tu dominio en Celo (confirma en WaaP si te lo pide)...')
      setNameResult('🔄 Registrando dominio en Celo Mainnet...')

      const response = await registerMotusName(name, targetAddress)

      if (response.success) {
        setOwnsName(true)
        setIsNameAvailable(false)
        setSkippedMns(false)
        updateData({
          motusName: name,
          ...(response.txHash ? { mnsTxHash: response.txHash } : {}),
        })
        setNameResult(
          response.alreadyRegistered
            ? `✅ Ya tenías registrado ${name}.motus`
            : '✅ ¡Dominio registrado exitosamente!'
        )
        if (response.txHash) {
          setNameTxHash(response.txHash)
        }
        showRegistrationSuccess()
      } else {
        setNameResult(`❌ ${response.error || 'Error al registrar dominio'}`)
      }
    } catch (e) {
      console.error('Error en registro one-click:', e)
      setNameResult(
        `❌ ${e instanceof Error ? e.message : 'Error desconocido al registrar dominio'}`
      )
    } finally {
      setIsRegisteringName(false)
      setOneClickProgress(null)
    }
  }

  const handleRequestFaucet = async () => {
    if (!data.eoaAddress) {
      setFaucetMessage('❌ Conecta tu wallet primero para reclamar CELO')
      return
    }

    setIsRequestingFaucet(true)
    setFaucetMessage('🔄 Enviando CELO a tu wallet...')

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: data.eoaAddress })
      })

      const body = await res.json()

      if (!res.ok || !body.success) {
        if (res.status === 429 && body.retryInMinutes) {
          setFaucetMessage(`⏱ Ya reclamaste recientemente. Intenta de nuevo en ~${body.retryInMinutes} minutos.`)
        } else {
          setFaucetMessage(`❌ Error al recibir CELO: ${body.error || body.message || 'desconocido'}`)
        }
        return
      }

      setFaucetMessage(`✅ Recibiste ${body.amount} CELO en tu wallet.`)
      setFaucetTxHash(body.txHash || null)
    } catch (e) {
      console.error('Error solicitando faucet desde StepBlockchain:', e)
      setFaucetMessage('❌ Error al solicitar CELO del faucet')
    } finally {
      setIsRequestingFaucet(false)
    }
  }

  const handleNameChange = async (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setName(normalized)
    setIsNameAvailable(null)
    setIsNameValid(null)
    setNameResult(null)
    setNameTxHash(null)
    setOwnsName(false)

    if (!normalized) return

    setIsCheckingName(true)
    try {
      const valid = motusNameService.isValidNameFormat(normalized)
      setIsNameValid(valid)

      if (!valid || !data.eoaAddress) return

      const ownedByUser = await motusNameService.isOwnedBy(
        normalized,
        data.eoaAddress as `0x${string}`
      )

      if (ownedByUser) {
        setOwnsName(true)
        setIsNameAvailable(false)
        setNameResult(`✅ Ya tienes registrado ${normalized}.motus`)
        updateData({ motusName: normalized })
        return
      }

      const available = await motusNameService.isAvailable(normalized)
      setIsNameAvailable(available)
    } finally {
      setIsCheckingName(false)
    }
  }


  const getStatusContent = () => {
    switch (status) {
      case 'waiting-wallet':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Creando Smart Wallet...</h2>
            <p className="text-muted-foreground mb-6">
              Estamos creando tu smart wallet. Esto solo toma unos segundos...
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <div className="w-2 h-2 bg-mauve-500 rounded-full animate-pulse"></div>
                <span>Inicializando smart wallet...</span>
              </div>
            </div>
          </div>
        )

      case 'idle':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tu dominio .motus</h2>
            <p className="text-muted-foreground mb-6">
              Elige tu nombre humano para recibir pagos. Un solo clic reclama CELO (si hace falta) y registra tu dominio on-chain.
            </p>

            {hasRegisteredMns && displayName && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-left"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-300">
                      {registrationJustCompleted
                        ? '¡Dominio adquirido con éxito!'
                        : 'Dominio .motus activo'}
                    </p>
                    <p className="text-lg font-mono font-bold text-white">{displayName}.motus</p>
                    <p className="text-sm text-muted-foreground">
                      {registrationJustCompleted
                        ? 'Tu nombre quedó registrado on-chain en Celo Mainnet. Ya puedes continuar con tu registro como PSM.'
                        : 'Este dominio ya está vinculado a tu wallet. Puedes continuar con el registro.'}
                    </p>
                    {nameTxHash && (
                      <a
                        href={getCeloExplorerUrl(nameTxHash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-mauve-200 underline inline-flex items-center gap-1 mt-1"
                      >
                        Ver transacción en Celo Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="p-4 glass rounded-xl mb-6 text-left">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="flex-1 flex items-center rounded-xl glass px-3 py-2 border border-white/10">
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={32}
                    placeholder="tu-nombre"
                    disabled={isRegisteringName}
                    className="flex-1 bg-transparent outline-none text-sm md:text-base"
                  />
                  <span className="text-xs md:text-sm text-muted-foreground ml-2">.motus</span>
                </div>
              </div>

              {registrationPrice && Number(registrationPrice) > 0 && (
                <p className="text-xs text-mauve-300 mt-3">
                  Costo: {registrationPrice} USDm + gas en CELO (Celo Mainnet).
                </p>
              )}
              {registrationPrice && Number(registrationPrice) === 0 && (
                <p className="text-xs text-emerald-300 mt-3">
                  Registro gratuito — solo pagas gas en CELO (se reclama automáticamente).
                </p>
              )}

              {name && (
                <div className="text-xs md:text-sm mt-3 space-y-1">
                  {isCheckingName && (
                    <p className="text-mauve-300">Buscando disponibilidad...</p>
                  )}
                  {!isCheckingName && isNameValid === false && (
                    <p className="text-red-400">
                      Formato inválido. Usa solo letras minúsculas, números y guiones.
                    </p>
                  )}
                  {!isCheckingName && isNameValid && ownsName && (
                    <p className="text-emerald-300 font-medium">
                      ✅ {name}.motus ya está registrado a tu wallet.
                    </p>
                  )}
                  {!isCheckingName && isNameValid && !ownsName && isNameAvailable === true && (
                    <p className="text-emerald-300 font-medium">
                      ✅ {name}.motus está disponible.
                    </p>
                  )}
                  {!isCheckingName && isNameValid && !ownsName && isNameAvailable === false && (
                    <p className="text-red-300">
                      ❌ Ese nombre ya está en uso. Prueba otra variante.
                    </p>
                  )}
                </div>
              )}

              {oneClickProgress && (
                <p className="text-xs text-mauve-200 mt-3 flex items-center gap-2">
                  <Loader className="w-3 h-3 animate-spin shrink-0" />
                  {oneClickProgress}
                </p>
              )}

              {nameResult && (
                <div
                  className={`mt-3 text-xs md:text-sm ${
                    nameResult.startsWith('✅')
                      ? 'text-emerald-300'
                      : nameResult.startsWith('🔄') || nameResult.startsWith('⏱')
                      ? 'text-mauve-200'
                      : 'text-red-300'
                  }`}
                >
                  <p>{nameResult}</p>
                  {nameTxHash && nameResult.startsWith('✅') && (
                    <a
                      href={getCeloExplorerUrl(nameTxHash, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-mauve-200 mt-1 inline-block"
                    >
                      Ver transacción en Celo Explorer →
                    </a>
                  )}
                </div>
              )}

              {faucetMessage && (
                <div className="mt-2 text-xs text-mauve-300 space-y-1">
                  <p>{faucetMessage}</p>
                  {faucetTxHash && (
                    <p>
                      <a
                        href={`https://celoscan.io/tx/${faucetTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-1"
                      >
                        Ver CELO en Celoscan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <CTAButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMnsInfo(true)}
                  className="text-xs md:text-sm"
                >
                  ¿Qué es un dominio .motus?
                </CTAButton>
                <CTAButton
                  size="sm"
                  variant="ghost"
                  onClick={handleRequestFaucet}
                  disabled={isRequestingFaucet || isRegisteringName}
                  className="text-xs md:text-sm"
                >
                  {isRequestingFaucet ? 'Enviando CELO...' : 'Reclamar CELO manualmente'}
                </CTAButton>
              </div>
            </div>

            <div className="space-y-3">
              <CTAButton
                onClick={hasRegisteredMns ? handleCompleteStep : handleOneClickRegister}
                disabled={
                  isRegisteringName ||
                  isRequestingFaucet ||
                  (!hasRegisteredMns &&
                    (!name || !isNameValid || !isNameAvailable || isCheckingName))
                }
                className="flex items-center space-x-2 mx-auto w-full max-w-sm justify-center"
              >
                {isRegisteringName ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Registrando dominio...</span>
                  </>
                ) : hasRegisteredMns ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Continuar con {displayName}.motus</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Registrar dominio y continuar</span>
                  </>
                )}
              </CTAButton>

              {!hasRegisteredMns && (
                <button
                  type="button"
                  onClick={() => setShowSkipMnsModal(true)}
                  disabled={isRegisteringName}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Continuar sin dominio por ahora
                </button>
              )}
            </div>

            {showMnsSuccessModal && displayName && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative w-full max-w-md"
                >
                  <GlassCard className="p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">¡Dominio adquirido!</h3>
                      <p className="text-3xl font-mono font-bold text-emerald-300 mb-3">
                        {displayName}.motus
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        Tu nombre quedó registrado on-chain en Celo Mainnet. A partir de ahora
                        puedes recibir pagos con este dominio humano.
                      </p>
                      {nameTxHash && (
                        <a
                          href={getCeloExplorerUrl(nameTxHash, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-mauve-200 underline inline-flex items-center gap-1 mb-6"
                        >
                          Ver transacción en Celo Explorer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <CTAButton
                        onClick={() => setShowMnsSuccessModal(false)}
                        className="w-full justify-center"
                        glow
                      >
                        Entendido
                      </CTAButton>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            )}

            {showSkipMnsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowSkipMnsModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative w-full max-w-lg"
                >
                  <GlassCard className="p-6 md:p-8 relative text-left">
                    <button
                      type="button"
                      onClick={() => setShowSkipMnsModal(false)}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-xl font-bold mb-2">Continuar sin dominio .motus</h3>
                        <p className="text-sm text-muted-foreground">
                          {name && isNameAvailable
                            ? `Elegiste ${name}.motus pero aún no lo has registrado on-chain.`
                            : 'Aún no has registrado un dominio .motus on-chain.'}
                          {' '}Si continúas ahora:
                        </p>
                      </div>
                    </div>

                    <ul className="text-sm text-muted-foreground space-y-2 mb-6 list-disc list-inside">
                      <li>No tendrás un nombre humano para recibir pagos (solo tu dirección 0x…).</li>
                      <li>Tu registro como PSM sí avanzará, pero el dominio queda pendiente.</li>
                      <li>Podrás comprarlo después en Motus Names dentro del Hub.</li>
                    </ul>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                      <CTAButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSkipMnsModal(false)}
                      >
                        Volver y registrar
                      </CTAButton>
                      <CTAButton size="sm" variant="secondary" onClick={handleConfirmSkipMns}>
                        Entiendo, continuar sin dominio
                      </CTAButton>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            )}

            {showMnsInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowMnsInfo(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative w-full max-w-3xl"
                >
                  <GlassCard className="p-6 md:p-8 relative">
                    <button
                      type="button"
                      onClick={() => setShowMnsInfo(false)}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Cerrar información de dominios"
                    >
                      <ExternalLink className="hidden" />
                    </button>

                    <h3 className="text-2xl font-bold mb-4">¿Qué es un dominio .motus?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tu dominio .motus es tu identidad legible dentro de MotusDAO. En lugar de
                      compartir una dirección larga y complicada, puedes usar un nombre humano
                      como <span className="font-mono text-mauve-300">tunombre.motus</span>.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="space-y-2">
                        <p className="font-semibold">Beneficios principales</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Recibir y enviar dinero usando un nombre humano.</li>
                          <li>Funciona como tu usuario dentro del ecosistema MotusDAO.</li>
                          <li>Se almacena on-chain como un NFT transferible.</li>
                          <li>Puedes personalizarlo con avatar y bio más adelante.</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold">Cómo funciona la compra</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Verificamos que el nombre esté disponible.</li>
                          <li>Reservas el nombre pagando una pequeña tarifa en USDm (si aplica).</li>
                          <li>Tu dominio queda asociado a tu wallet para siempre (o hasta que lo transfieras).</li>
                          <li>Más adelante podrás gestionar tus dominios desde el panel de MotusDAO.</li>
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Puedes explorar más detalles y registrar dominios adicionales en la sección
                      dedicada de Motus Names dentro del Hub una vez que termines tu registro.
                    </p>

                    <div className="mt-6 flex justify-end">
                      <CTAButton size="sm" onClick={() => setShowMnsInfo(false)}>
                        Entendido
                      </CTAButton>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            )}
          </div>
        )

      case 'submitting':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Registrando en blockchain...</h2>
            <p className="text-muted-foreground mb-6">
              Guardando tu información en la base de datos vinculada a tu wallet.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <div className="w-2 h-2 bg-mauve-500 rounded-full animate-pulse"></div>
                <span>Registrando información...</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <div className="w-2 h-2 bg-mauve-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Actualizando base de datos...</span>
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                skippedMns
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600'
              }`}
            >
              {skippedMns ? (
                <AlertCircle className="w-8 h-8 text-white" />
              ) : (
                <CheckCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {skippedMns ? 'Registro financiero pendiente de dominio' : '¡Dominio adquirido con éxito!'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {skippedMns ? (
                <>
                  Avanzaste sin registrar un dominio .motus on-chain. Tu wallet funciona, pero
                  aún no tienes un nombre humano para recibir pagos. Puedes registrarlo después en{' '}
                  <span className="text-mauve-300">Motus Names</span>.
                </>
              ) : (
                <>
                  <span className="font-mono text-emerald-300 font-semibold">{displayName}.motus</span>
                  {' '}es tuyo. Tu dominio quedó registrado on-chain y ya puedes usarlo para enviar
                  y recibir pagos.
                </>
              )}
            </p>

            {!skippedMns && displayName && (
              <div className="mb-6 p-5 glass rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-300">Registro confirmado on-chain</p>
                </div>
                <p className="text-2xl font-semibold text-white font-mono">{displayName}.motus</p>
                {nameTxHash && (
                  <a
                    href={getCeloExplorerUrl(nameTxHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-mauve-200 underline mt-3 inline-block"
                  >
                    Ver registro en Celo Explorer →
                  </a>
                )}
              </div>
            )}

            {skippedMns && displayName && isNameAvailable && (
              <div className="mb-6 p-4 glass rounded-xl border border-amber-500/20 text-left">
                <p className="text-sm text-amber-300 font-medium mb-1">Dominio no registrado</p>
                <p className="text-sm text-muted-foreground">
                  Tenías elegido <span className="font-mono text-white">{displayName}.motus</span> pero no
                  se completó la compra on-chain.
                </p>
              </div>
            )}

            <CTAButton
              onClick={onNext}
              className="flex items-center space-x-2 mx-auto"
            >
              <span>Continuar al registro como PSM</span>
              <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Error en el registro</h2>
            <p className="text-muted-foreground mb-6">
              Hubo un problema al registrar en la blockchain. Por favor, inténtalo de nuevo.
            </p>
            
            {error && (
              <div className="p-4 glass rounded-xl mb-6 bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={onBack}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Atrás
              </button>
              <CTAButton
                onClick={handleCompleteStep}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Intentar de nuevo</span>
              </CTAButton>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <GlassCard className="p-8">
        {getStatusContent()}
      </GlassCard>
    </motion.div>
  )
}
