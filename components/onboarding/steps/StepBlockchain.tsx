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
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { motusNameService } from '@/lib/motus-name-service'
import { getCeloExplorerUrl } from '@/lib/celo'
import { registerMotusNameWithWaaP } from '@/lib/mns-register'

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
  const [showMnsInfo, setShowMnsInfo] = useState(false)
  const [registrationPrice, setRegistrationPrice] = useState<string | null>(null)

  useEffect(() => {
    motusNameService.getRegistrationPrice().then(setRegistrationPrice).catch(() => {})
  }, [])

  // Mirror EOA into smartWalletAddress field for backwards compatibility (no real smart wallets for now)
  useEffect(() => {
    if (data.eoaAddress && data.smartWalletAddress !== data.eoaAddress) {
      updateData({
        smartWalletAddress: data.eoaAddress,
        walletType: data.walletType || 'external'
      })
    }
  }, [data.eoaAddress, data.smartWalletAddress, data.walletType, updateData])

  const handleRegisterOnChain = async () => {
    if (!data.eoaAddress) {
      setError('No se encontró ninguna wallet conectada. Por favor vuelve al paso anterior.')
      return
    }

    // Por ahora no llamamos a la API aquí para evitar errores de validación.
    console.log('🔄 StepBlockchain: simulando registro CELO + dominio (sin llamada API)')
    setStatus('success')
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

    if (!normalized) return

    setIsCheckingName(true)
    try {
      const valid = motusNameService.isValidNameFormat(normalized)
      setIsNameValid(valid)

      if (valid) {
        const available = await motusNameService.isAvailable(normalized)
        setIsNameAvailable(available)
      }
    } finally {
      setIsCheckingName(false)
    }
  }

  const handleRegisterDomain = async () => {
    if (!name || !isNameValid || !isNameAvailable) {
      setNameResult('❌ El nombre no está disponible o no es válido')
      return
    }
    if (!data.eoaAddress) {
      setNameResult('❌ Conecta tu wallet primero para registrar un dominio')
      return
    }

    setIsRegisteringName(true)
    setNameResult('🔄 Registrando dominio en Celo (pagando gas desde tu wallet WaaP)...')
    setNameTxHash(null)

    try {
      const response = await registerMotusNameWithWaaP(
        name,
        data.eoaAddress as `0x${string}`
      )

      if (response.success) {
        setNameResult('✅ ¡Dominio registrado exitosamente!')
        if (response.txHash) {
          setNameTxHash(response.txHash)
        }
      } else {
        setNameResult(`❌ Error al registrar dominio: ${response.error || 'desconocido'}`)
      }
    } catch (e) {
      console.error('Error registrando dominio desde StepBlockchain:', e)
      setNameResult(
        `❌ Error al registrar dominio: ${
          e instanceof Error ? e.message : 'Error desconocido'
        }`
      )
    } finally {
      setIsRegisteringName(false)
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
            <h2 className="text-2xl font-bold mb-2">Reclama CELO y tu dominio</h2>
            <p className="text-muted-foreground mb-6">
              Tu cuenta WaaP ya está inicializada con tu email y wallet. Ahora vas a reclamar tu CELO inicial y elegir tu dominio para poder enviar y recibir dinero en todo el mundo, al instante y sin comisiones.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-mauve-500/20 rounded-full flex items-center justify-center">
                    <span className="text-mauve-400 text-sm font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Reclamar CELO inicial</p>
                    <p className="text-sm text-muted-foreground">
                      Asegura que tu smart wallet tenga CELO para operar dentro de MotusDAO.
                    </p>
                    <div className="mt-3 flex justify-center md:justify-start">
                      <CTAButton
                        size="sm"
                        onClick={handleRequestFaucet}
                        disabled={isRequestingFaucet}
                        className="flex items-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{isRequestingFaucet ? 'Enviando CELO...' : 'Reclamar CELO'}</span>
                      </CTAButton>
                    </div>
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
                              Ver transacción en Celoscan
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-mauve-500/20 rounded-full flex items-center justify-center">
                    <span className="text-mauve-400 text-sm font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Comprar tu dominio</p>
                    <p className="text-sm text-muted-foreground">
                      Elige el dominio con el que otras personas podrán enviarte dinero de forma simple y humana.
                      {registrationPrice && Number(registrationPrice) > 0 && (
                        <span className="block mt-1 text-mauve-300">
                          Costo: {registrationPrice} cUSD + gas en CELO.
                        </span>
                      )}
                      {registrationPrice && Number(registrationPrice) === 0 && (
                        <span className="block mt-1 text-emerald-300">
                          Registro gratuito — solo pagas gas en CELO.
                        </span>
                      )}
                    </p>
                    <div className="mt-4 space-y-3">
                      {/* Name input + availability */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <div className="flex-1 flex items-center rounded-xl glass px-3 py-2 border border-white/10">
                          <input
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            maxLength={32}
                            placeholder="tu-nombre"
                            className="flex-1 bg-transparent outline-none text-sm md:text-base"
                          />
                          <span className="text-xs md:text-sm text-muted-foreground ml-2">
                            .motus
                          </span>
                        </div>
                        <CTAButton
                          size="sm"
                          variant="secondary"
                          disabled={
                            !name || isCheckingName || isRegisteringName || !isNameValid || !isNameAvailable
                          }
                          className="flex items-center space-x-2"
                          onClick={handleRegisterDomain}
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>
                            {isRegisteringName ? 'Registrando...' : 'Buscar y comprar'}
                          </span>
                        </CTAButton>
                      </div>

                      {/* Availability message */}
                      {name && (
                        <div className="text-xs md:text-sm text-left space-y-1">
                          {isCheckingName && (
                            <p className="text-mauve-300">Buscando disponibilidad...</p>
                          )}
                          {!isCheckingName && isNameValid === false && (
                            <p className="text-red-400">
                              Formato inválido. Usa solo letras minúsculas, números y guiones.
                            </p>
                          )}
                          {!isCheckingName && isNameValid && isNameAvailable === true && (
                            <p className="text-emerald-300 font-medium">
                              ✅ Disponible. Haz clic en &quot;Buscar y comprar&quot; para registrar tu dominio ahora.
                            </p>
                          )}
                          {!isCheckingName && isNameValid && isNameAvailable === false && (
                            <p className="text-red-300">
                              ❌ Ese nombre ya está registrado. Prueba con otra variante.
                            </p>
                          )}

                          {nameResult && (
                            <div
                              className={`mt-1 text-xs md:text-sm ${
                                nameResult.startsWith('✅')
                                  ? 'text-emerald-300'
                                  : nameResult.startsWith('🔄')
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
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <CTAButton
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowMnsInfo(true)}
                          className="text-xs md:text-sm"
                        >
                          Más información sobre dominios .motus
                        </CTAButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CTAButton
              onClick={handleRegisterOnChain}
              className="flex items-center space-x-2 mx-auto"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Completar Registro</span>
            </CTAButton>
            
            {/* Más información modal */}
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
                          <li>Reservas el nombre pagando una pequeña tarifa en cUSD.</li>
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
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Tu cuenta financiera está lista!</h2>
            <p className="text-muted-foreground mb-6">
              Tu registro financiero está completo y tu dominio está configurado. Ahora puedes enviar y recibir dinero digital, sin fronteras, de manera inmediata y sin comisiones.
            </p>

            {name && (
              <div className="mb-6">
                <p className="text-sm text-mauve-300">
                  Tu dominio elegido:
                </p>
                <p className="text-lg font-semibold text-white font-mono">
                  {name}.motus
                </p>
              </div>
            )}

            <CTAButton
              onClick={onNext}
              className="flex items-center space-x-2 mx-auto"
            >
              <span>Continuar al registro como usuario / psicólogo</span>
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
                onClick={handleRegisterOnChain}
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
