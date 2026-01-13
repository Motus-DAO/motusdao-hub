'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import {
  CreditCard,
  Wallet,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  Zap,
  Info,
  User,
  Building2,
  Loader,
  QrCode,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AtSign,
  Search
} from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect, useCallback } from 'react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { sendPaymentWithKernel, type PaymentParams } from '@/lib/payments'
import { getCeloExplorerUrl } from '@/lib/celo'
import { getAllTokenBalances, type TokenBalance } from '@/lib/balances'
import { motusNameService } from '@/lib/motus-name-service'
import type { Address } from 'viem'

const paymentSteps = [
  {
    step: 1,
    title: 'Onramp',
    description: 'Convierte tu dinero fiat a criptomonedas',
    icon: DollarSign,
    status: 'coming-soon',
    details: 'Integración con Transak y MiniPay próximamente'
  },
  {
    step: 2,
    title: 'Wallet',
    description: 'Almacena tus fondos de forma segura',
    icon: Wallet,
    status: 'active',
    details: 'Conecta tu wallet con Privy'
  },
  {
    step: 3,
    title: 'Split',
    description: 'Distribución automática de pagos',
    icon: Zap,
    status: 'coming-soon',
    details: 'Sistema de división de pagos en desarrollo'
  }
]

const features = [
  {
    icon: Shield,
    title: 'Seguridad Blockchain',
    description: 'Todas las transacciones están protegidas por la tecnología blockchain'
  },
  {
    icon: Zap,
    title: 'Pagos Instantáneos',
    description: 'Transacciones rápidas y sin intermediarios'
  },
  {
    icon: DollarSign,
    title: 'Sin comisiones',
    description: 'Sin comisiones ni cargos ocultos'
  }
]

interface PaymentPreferenceData {
  id: string
  userId: string
  defaultDestination: 'own_wallet' | 'matched_psm' | 'dao_treasury'
  hasMatchedPSM: boolean
  matchedPSM: {
    id: string
    smartWalletAddress: string | null
  } | null
}

interface UserData {
  id: string
  email: string
  role: string
  smartWalletAddress?: string | null
}

type OnrampProvider = 'transak' | 'mtpelerin' | 'privy'

interface ProviderConfig {
  id: OnrampProvider
  name: string
  enabled: boolean
  description: string
}

const QRScanner = dynamic(
  () => import('@/components/payments/QRScanner'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="text-sm text-muted-foreground">
          Activando cámara...
        </div>
      </div>
    )
  }
)

export default function PagosPage() {
  const { authenticated, user, ready } = useWaaP()
  const { wallets } = useWaaPWallets()
  const { smartAccountAddress, kernelClient, isInitializing } = useSmartAccount()
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreferenceData | null>(null)
  const [isLoadingPreference, setIsLoadingPreference] = useState(false)
  const [isSavingPreference, setIsSavingPreference] = useState(false)
  const [isStartingOnramp, setIsStartingOnramp] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<OnrampProvider | null>(null)
  const [mtPelerinUrl, setMtPelerinUrl] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [transferMode, setTransferMode] = useState<'send' | 'receive'>('send')
  const [sendAddress, setSendAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<'CELO' | 'USDT' | 'USDC' | 'cUSD' | 'cREAL' | 'cCOP' | 'PSY' | 'MOT' | 'cCAD' | 'cEUR'>('CELO')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showTokenList, setShowTokenList] = useState(false)
  const [enabledTokens, setEnabledTokens] = useState<Set<string>>(new Set([
    'CELO', 'USDT', 'USDC', 'cUSD', 'cEUR', 'cREAL', 'cCOP', 'PSY', 'MOT', 'cCAD'
  ]))
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<{ hash: string; explorerUrl: string } | null>(null)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [selectedTokenForBalance, setSelectedTokenForBalance] = useState<string | null>(null)
  
  // MNS (Motus Name Service) states
  const [isResolvingName, setIsResolvingName] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<Address | null>(null)
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | null>(null)
  const [nameResolutionError, setNameResolutionError] = useState<string | null>(null)
  const [userMotusName, setUserMotusName] = useState<string | null>(null)
  const [isLoadingUserMotusName, setIsLoadingUserMotusName] = useState(false)

  const handleQRScan = (decodedText: string) => {
    try {
      let scannedAddress = decodedText
      let amountParam: string | null = null

      if (decodedText.includes('?')) {
        const [addressPart, queryPart] = decodedText.split('?')
        scannedAddress = addressPart
        const params = new URLSearchParams(queryPart)
        amountParam = params.get('amount')
        // En el futuro se podría leer también `token`
      }

      handleRecipientChange(scannedAddress)
      if (amountParam) {
        setSendAmount(amountParam)
      }
    } catch (err) {
      console.error('Error procesando QR:', err)
    } finally {
      setShowQRScanner(false)
    }
  }

  // Resolve MNS name or validate address
  const handleRecipientChange = useCallback(async (value: string) => {
    setSendAddress(value)
    setNameResolutionError(null)
    setResolvedAddress(null)
    setResolvedDisplayName(null)
    setSendError(null)
    setSendSuccess(null)
    
    if (!value || value.trim() === '') return
    
    const trimmedValue = value.trim()
    
    // Check if it looks like a .motus name (contains letters but not just hex)
    const looksLikeName = !trimmedValue.startsWith('0x') || 
      trimmedValue.toLowerCase().includes('.motus') ||
      /^[a-z0-9-]+$/i.test(trimmedValue.replace('.motus', ''))
    
    // If it's clearly an address, just validate it
    if (trimmedValue.startsWith('0x') && trimmedValue.length === 42 && !trimmedValue.toLowerCase().includes('.motus')) {
      // It's a valid address format
      setResolvedAddress(trimmedValue as Address)
      
      // Try to find display name via reverse lookup
      setIsResolvingName(true)
      try {
        const name = await motusNameService.reverseLookup(trimmedValue as Address)
        if (name) {
          setResolvedDisplayName(name + '.motus')
        }
      } catch {
        // Ignore errors in reverse lookup
        console.log('Reverse lookup failed, using address only')
      } finally {
        setIsResolvingName(false)
      }
      return
    }
    
    // If it looks like a name, try to resolve it
    if (looksLikeName || trimmedValue.includes('.motus')) {
      setIsResolvingName(true)
      
      try {
        const resolved = await motusNameService.resolveInput(trimmedValue)
        
        if (resolved.type === 'invalid') {
          setNameResolutionError('Formato inválido. Usa una dirección 0x... o un nombre .motus')
        } else if (resolved.address) {
          setResolvedAddress(resolved.address)
          setResolvedDisplayName(resolved.displayName ? resolved.displayName + '.motus' : null)
        } else if (resolved.type === 'name') {
          setNameResolutionError(`El nombre "${trimmedValue}" no está registrado en Motus Name Service`)
        }
      } catch (err) {
        console.error('Error resolving MNS name:', err)
        setNameResolutionError('Error al resolver el nombre. Verifica tu conexión.')
      } finally {
        setIsResolvingName(false)
      }
    } else {
      // Invalid format
      setNameResolutionError('Dirección inválida. Debe empezar con 0x y tener 42 caracteres.')
    }
  }, [])

  // Load user's .motus name for receive section
  useEffect(() => {
    const loadUserMotusName = async () => {
      if (!smartAccountAddress) {
        setUserMotusName(null)
        return
      }
      
      setIsLoadingUserMotusName(true)
      try {
        const name = await motusNameService.reverseLookup(smartAccountAddress as Address)
        setUserMotusName(name ? name + '.motus' : null)
      } catch (err) {
        console.error('Error loading user motus name:', err)
        setUserMotusName(null)
      } finally {
        setIsLoadingUserMotusName(false)
      }
    }
    
    loadUserMotusName()
  }, [smartAccountAddress])

  // Lista de tokens disponibles con información
  const availableTokens = [
    { symbol: 'CELO', name: 'Celo', category: 'Native', region: 'Global' },
    { symbol: 'USDT', name: 'Tether USD', category: 'Stablecoin', region: 'Global' },
    { symbol: 'USDC', name: 'USD Coin', category: 'Stablecoin', region: 'Global' },
    { symbol: 'cUSD', name: 'Celo Dollar', category: 'Mento Stablecoin', region: 'Global' },
    { symbol: 'cREAL', name: 'Celo Real', category: 'Mento Stablecoin', region: 'LATAM (Brasil)' },
    { symbol: 'cCOP', name: 'Celo Peso Colombiano', category: 'Mento Stablecoin', region: 'LATAM (Colombia)' },
    { symbol: 'PSY', name: 'Psychology Token', category: 'Utility', region: 'Global' },
    { symbol: 'MOT', name: 'Motus Token', category: 'Utility', region: 'Global' },
    { symbol: 'cCAD', name: 'Celo Canadian Dollar', category: 'Mento Stablecoin', region: 'Norteamérica' },
    { symbol: 'cEUR', name: 'Celo Euro', category: 'Mento Stablecoin', region: 'Europa' }
  ]

  const toggleToken = (tokenSymbol: string) => {
    setEnabledTokens(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tokenSymbol)) {
        newSet.delete(tokenSymbol)
        // Si el token deshabilitado era el seleccionado, cambiar a CELO
        if (selectedToken === tokenSymbol) {
          setSelectedToken('CELO')
        }
      } else {
        newSet.add(tokenSymbol)
      }
      return newSet
    })
  }

  const enabledTokensList = availableTokens.filter(token => enabledTokens.has(token.symbol))

  // Función para enviar pagos
  const handleSendPayment = async () => {
    if (!authenticated) {
      setSendError('Necesitas iniciar sesión para enviar pagos')
      return
    }

    if (!kernelClient) {
      setSendError(isInitializing 
        ? 'La smart wallet se está inicializando. Por favor espera...'
        : 'Smart wallet no disponible. Asegúrate de estar conectado.')
      return
    }

    // Use resolved address if available, otherwise use the input
    const targetAddress = resolvedAddress || sendAddress
    
    if (!targetAddress) {
      setSendError('Por favor ingresa una dirección o nombre .motus de destino')
      return
    }
    
    // Validate that we have a proper address (either direct or resolved)
    if (typeof targetAddress === 'string' && (!targetAddress.startsWith('0x') || targetAddress.length !== 42)) {
      setSendError('Dirección inválida. Resuelve el nombre .motus primero o usa una dirección válida.')
      return
    }

    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      setSendError('Por favor ingresa un monto válido mayor a 0')
      return
    }

    setIsSending(true)
    setSendError(null)
    setSendSuccess(null)

    try {
      const params: PaymentParams = {
        from: smartAccountAddress || '0x0' as `0x${string}`,
        to: targetAddress as `0x${string}`,
        amount: sendAmount,
        currency: selectedToken,
      }

      console.log('🔄 Enviando pago...', {
        to: targetAddress,
        displayName: resolvedDisplayName,
        amount: sendAmount,
        token: selectedToken
      })

      const result = await sendPaymentWithKernel(kernelClient, params)

      if (result.success && result.transactionHash) {
        setSendSuccess({
          hash: result.transactionHash,
          explorerUrl: result.explorerUrl || getCeloExplorerUrl(result.transactionHash, 'tx'),
        })
        // Limpiar formulario después de éxito
        setSendAddress('')
        setSendAmount('')
        setResolvedAddress(null)
        setResolvedDisplayName(null)
      } else {
        setSendError(result.error || 'Error al enviar el pago')
      }
    } catch (error) {
      console.error('Error enviando pago:', error)
      setSendError(error instanceof Error ? error.message : 'Error desconocido al enviar el pago')
    } finally {
      setIsSending(false)
    }
  }

  // Load token balances
  useEffect(() => {
    const loadBalances = async () => {
      if (!authenticated || !smartAccountAddress || !ready) {
        setTokenBalances([])
        return
      }

      setIsLoadingBalances(true)
      try {
        const enabledTokensArray = Array.from(enabledTokens)
        const balances = await getAllTokenBalances(
          smartAccountAddress as `0x${string}`,
          enabledTokensArray
        )
        setTokenBalances(balances)
      } catch (error) {
        console.error('Error loading balances:', error)
        setTokenBalances([])
      } finally {
        setIsLoadingBalances(false)
      }
    }

    loadBalances()
    
    // Refresh balances every 30 seconds
    const interval = setInterval(loadBalances, 30000)
    return () => clearInterval(interval)
  }, [authenticated, smartAccountAddress, ready, enabledTokens])

  // Refresh balances after successful payment
  useEffect(() => {
    if (sendSuccess) {
      // Reload balances after a short delay to allow blockchain to update
      setTimeout(async () => {
        if (smartAccountAddress) {
          const enabledTokensArray = Array.from(enabledTokens)
          const balances = await getAllTokenBalances(
            smartAccountAddress as `0x${string}`,
            enabledTokensArray
          )
          setTokenBalances(balances)
        }
      }, 3000)
    }
  }, [sendSuccess, smartAccountAddress, enabledTokens])

  // Configuración de proveedores con flags de habilitación desde env vars
  const providers: ProviderConfig[] = [
    {
      id: 'transak',
      name: 'Transak Lite',
      enabled: !!process.env.NEXT_PUBLIC_TRANSAK_ENABLED, // Flag para habilitar/deshabilitar
      description: 'Compra cripto con tarjeta de crédito/débito (Transak Lite)'
    },
    {
      id: 'mtpelerin',
      name: 'Mt Pelerin',
      enabled: !!process.env.NEXT_PUBLIC_MTPELERIN_WIDGET_URL,
      description: 'On-ramp integrado con soporte para MXN y Celo'
    },
    {
      id: 'privy',
      name: 'Privy (via Ramp/Coinbase)',
      enabled: authenticated && !!wallets?.[0] && !!process.env.NEXT_PUBLIC_PRIVY_ONRAMP_PROVIDER, // Requiere wallet + proveedor configurado
      description: 'On-ramp facilitado por Privy con proveedores externos'
    }
  ]

  const availableProviders = providers.filter(p => p.enabled)

  const userEmail = user?.email?.address || user?.google?.email
  const privyId = user?.id
  const daoTreasuryAddress = process.env.NEXT_PUBLIC_DAO_TREASURY_ADDRESS || '0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9'

  // Fetch user data and payment preference
  useEffect(() => {
    const fetchData = async () => {
      if (!ready || !authenticated || !userEmail) return

      setIsLoadingPreference(true)
      try {
        // Get user profile to get userId
        const params = new URLSearchParams()
        if (privyId) params.append('privyId', privyId)
        if (userEmail) params.append('email', userEmail)

        const profileResponse = await fetch(`/api/profile?${params.toString()}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserData(profileData.user)

          // Get payment preference
          if (profileData.user?.id) {
            const prefResponse = await fetch(`/api/payment-preferences?userId=${profileData.user.id}`)
            if (prefResponse.ok) {
              const prefData = await prefResponse.json()
              setPaymentPreference(prefData.preference)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching payment preference:', err)
      } finally {
        setIsLoadingPreference(false)
      }
    }

    fetchData()
  }, [ready, authenticated, userEmail, privyId])

  const handleDestinationChange = async (destination: 'own_wallet' | 'matched_psm' | 'dao_treasury') => {
    if (!userData?.id || isSavingPreference) return

    setIsSavingPreference(true)
    try {
      const response = await fetch('/api/payment-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          defaultDestination: destination
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPaymentPreference(data.preference)
      } else {
        const error = await response.json()
        console.error('Error updating preference:', error)
      }
    } catch (err) {
      console.error('Error updating preference:', err)
    } finally {
      setIsSavingPreference(false)
    }
  }

  const getDestinationAddress = () => {
    if (!paymentPreference) return null

    switch (paymentPreference.defaultDestination) {
      case 'own_wallet':
        return smartAccountAddress || userData?.smartWalletAddress
      case 'matched_psm':
        return paymentPreference.matchedPSM?.smartWalletAddress
      case 'dao_treasury':
        return daoTreasuryAddress
      default:
        return null
    }
  }

  const getDestinationLabel = () => {
    if (!paymentPreference) return '—'

    switch (paymentPreference.defaultDestination) {
      case 'own_wallet':
        return 'Mi wallet'
      case 'matched_psm':
        return 'Mi psicólogo/a'
      case 'dao_treasury':
        return 'Tesorería de la DAO'
      default:
        return 'Destino desconocido'
    }
  }

  const handleStartOnramp = async (provider: OnrampProvider) => {
    if (!authenticated) {
      alert('Necesitas iniciar sesión y conectar tu wallet antes de usar el on-ramp.')
      return
    }

    const destinationAddress = getDestinationAddress()

    if (!destinationAddress) {
      alert('No se encontró una dirección de destino válida. Revisa tu selección de destino de fondos.')
      return
    }

    const destinationLabel = getDestinationLabel()

    const confirmed = window.confirm(
      `Vas a comprar cripto con ${providers.find(p => p.id === provider)?.name} y enviarla a:\n\n` +
        `Destino: ${destinationLabel}\n` +
        `Dirección: ${destinationAddress}\n\n` +
        `¿Confirmas que este es el destino correcto de tus fondos?`
    )

    if (!confirmed) return

    try {
      setIsStartingOnramp(true)
      setSelectedProvider(provider)

      switch (provider) {
        case 'transak': {
          // Transak Lite integration - usa API route para generar URL firmada
          try {
            const response = await fetch('/api/transak-lite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: destinationAddress,
                email: userEmail
              })
            })

            if (!response.ok) {
              const errorData = await response.json()
              const errorMessage = errorData.error || 'Error al generar URL de Transak'
              const missingVars = errorData.missing || []
              const hint = errorData.hint || ''
              
              throw new Error(
                `${errorMessage}${missingVars.length > 0 ? `\n\nVariables faltantes: ${missingVars.join(', ')}` : ''}${hint ? `\n\n${hint}` : ''}`
              )
            }

            const data = await response.json()
            const transakUrl = data.url

            if (transakUrl) {
              // Abrir Transak en nueva pestaña
              window.open(transakUrl, '_blank', 'noopener,noreferrer')
            } else {
              alert('No se pudo generar la URL de Transak. Verifica la configuración.')
            }
          } catch (err) {
            console.error('Error obteniendo URL de Transak:', err)
            alert(
              'Error al iniciar Transak Lite.\n\n' +
              'Asegúrate de que:\n' +
              '1. Las credenciales estén configuradas en .env.local\n' +
              '2. El API route /api/transak-lite esté funcionando\n\n' +
              'Error: ' + (err instanceof Error ? err.message : 'Desconocido')
            )
          }
          break
        }

        case 'mtpelerin': {
          const baseUrl = process.env.NEXT_PUBLIC_MTPELERIN_WIDGET_URL

          if (!baseUrl) {
            alert('Mt Pelerin aún no está configurado. Contacta al equipo de MotusDAO.')
            return
          }

          // Construye la URL del widget según la documentación de Mt Pelerin.
          // IMPORTANTE: configura NEXT_PUBLIC_MTPELERIN_WIDGET_URL con MXN, red CELO y USDT
          const url = new URL(baseUrl)
          url.searchParams.set('walletAddress', destinationAddress)

          setMtPelerinUrl(url.toString())
          break
        }

        case 'privy': {
          // Privy on-ramp integration
          // Privy facilita la integración con proveedores externos (Ramp, Coinbase, MoonPay, etc.)
          // Requiere configuración en backend para generar URLs firmadas
          const primaryWallet = wallets?.[0]

          if (!primaryWallet) {
            alert('Necesitas tener una wallet conectada para usar Privy on-ramp.')
            return
          }

          // Llamar a API route del backend para obtener URL firmada del proveedor
          try {
            const response = await fetch('/api/privy-onramp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: destinationAddress,
                email: userEmail,
                provider: process.env.NEXT_PUBLIC_PRIVY_ONRAMP_PROVIDER || 'ramp' // ramp, coinbase, moonpay, etc.
              })
            })

            if (!response.ok) {
              throw new Error('Error al generar URL de on-ramp')
            }

            const data = await response.json()
            const onrampUrl = data.url

            if (onrampUrl) {
              // Abrir en nueva pestaña o iframe según preferencia
              window.open(onrampUrl, '_blank', 'noopener,noreferrer')
            } else {
              alert('No se pudo generar la URL de on-ramp. Verifica la configuración del backend.')
            }
          } catch (err) {
            console.error('Error obteniendo URL de Privy on-ramp:', err)
            alert(
              'Privy on-ramp requiere configuración en el backend.\n\n' +
              'Pasos necesarios:\n' +
              '1. Configurar un proveedor (Ramp, Coinbase, MoonPay, etc.)\n' +
              '2. Crear API route en /api/privy-onramp\n' +
              '3. Generar URL firmada con clave secreta del proveedor\n\n' +
              'Por ahora, puedes usar Mt Pelerin o Transak.'
            )
          }
          break
        }

        default:
          alert('Proveedor no reconocido.')
      }
    } catch (err) {
      console.error('Error iniciando on-ramp:', err)
      alert('Hubo un problema al iniciar el widget de pagos. Intenta nuevamente en unos momentos.')
    } finally {
      setIsStartingOnramp(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl md:text-5xl font-bold">
                  Sistema de Pagos
                </GradientText>
                <p className="text-muted-foreground">Pagos descentralizados para servicios de salud mental</p>
              </div>
            </div>
          </motion.div>

          {/* Features - Updated to focus on wallet payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <GlassCard className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Pagos Globales con Wallet</h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Envía dinero a cualquier parte del mundo de forma <span className="text-mauve-400 font-semibold">gratis</span> e <span className="text-mauve-400 font-semibold">instantánea</span> usando tu smart wallet. 
                  Sin intermediarios, sin comisiones altas, sin esperas.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Wallet Balances Section */}
          {authenticated && smartAccountAddress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="mb-12"
            >
              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 flex items-center">
                      <Wallet className="w-6 h-6 mr-3 text-mauve-500" />
                      Saldos de tu Wallet
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Balances actuales de tus tokens en la smart wallet
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        if (!smartAccountAddress) return
                        setIsLoadingBalances(true)
                        try {
                          const enabledTokensArray = Array.from(enabledTokens)
                          const balances = await getAllTokenBalances(
                            smartAccountAddress as `0x${string}`,
                            enabledTokensArray
                          )
                          setTokenBalances(balances)
                        } catch (error) {
                          console.error('Error refreshing balances:', error)
                        } finally {
                          setIsLoadingBalances(false)
                        }
                      }}
                      disabled={isLoadingBalances || !smartAccountAddress}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refrescar balances"
                    >
                      <RefreshCw className={`w-5 h-5 text-mauve-500 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                    </button>
                    {isLoadingBalances && (
                      <Loader className="w-5 h-5 animate-spin text-mauve-500" />
                    )}
                  </div>
                </div>

                {isLoadingBalances && tokenBalances.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-mauve-500" />
                    <span className="ml-3 text-sm text-muted-foreground">Cargando balances...</span>
                  </div>
                ) : tokenBalances.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No se pudieron cargar los balances. Asegúrate de que tu wallet esté conectada.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna 1: Balance Total Global */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Balance Total</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Suma de todos los tokens en tu wallet
                        </p>
                      </div>
                      <div className="p-6 rounded-xl border border-mauve-500/30 bg-gradient-to-br from-mauve-500/20 to-iris-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg bg-mauve-500/30 flex items-center justify-center">
                              <Wallet className="w-6 h-6 text-mauve-400" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total de Tokens</p>
                              <p className="text-2xl font-bold">
                                {tokenBalances.length}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs text-muted-foreground mb-2">Tokens con saldo:</p>
                          <p className="text-3xl font-bold text-mauve-400">
                            {tokenBalances.filter(t => parseFloat(t.balance) > 0).length}
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs text-muted-foreground mb-2">Suma total de balances:</p>
                          <p className="text-2xl font-bold">
                            {tokenBalances
                              .reduce((sum, token) => sum + parseFloat(token.balance), 0)
                              .toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Balance por Token Seleccionado */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Balance por Token</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Selecciona un token para ver su balance detallado
                        </p>
                      </div>
                      
                      {/* Lista de tokens con toggle */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {tokenBalances.map((token) => {
                          const balance = parseFloat(token.balance)
                          const hasBalance = balance > 0
                          const isSelected = selectedTokenForBalance === token.symbol
                          const tokenInfo = availableTokens.find(t => t.symbol === token.symbol)
                          
                          return (
                            <button
                              key={token.symbol}
                              type="button"
                              onClick={() => setSelectedTokenForBalance(
                                isSelected ? null : token.symbol
                              )}
                              className={`w-full p-3 rounded-lg border transition-all text-left ${
                                isSelected
                                  ? 'bg-mauve-500/20 border-mauve-500/40'
                                  : hasBalance
                                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                                  : 'bg-white/5 border-white/5 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    hasBalance ? 'bg-mauve-500/20' : 'bg-white/10'
                                  }`}>
                                    <span className="text-xs font-bold">{token.symbol}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-semibold">{token.symbol}</p>
                                      {hasBalance && (
                                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                      )}
                                    </div>
                                    {tokenInfo && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {tokenInfo.name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                                  <div className="text-right">
                                    <p className={`text-sm font-bold ${
                                      hasBalance ? 'text-foreground' : 'text-muted-foreground'
                                    }`}>
                                      {balance.toLocaleString('es-ES', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6,
                                      })}
                                    </p>
                                    {!hasBalance && (
                                      <p className="text-[10px] text-muted-foreground">Sin saldo</p>
                                    )}
                                  </div>
                                  {isSelected ? (
                                    <ChevronUp className="w-4 h-4 text-mauve-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Detalle del token seleccionado */}
                      {selectedTokenForBalance && (() => {
                        const selectedToken = tokenBalances.find(t => t.symbol === selectedTokenForBalance)
                        const tokenInfo = availableTokens.find(t => t.symbol === selectedTokenForBalance)
                        
                        if (!selectedToken) return null
                        
                        const balance = parseFloat(selectedToken.balance)
                        const hasBalance = balance > 0
                        
                        return (
                          <div className="mt-4 p-6 rounded-xl border border-mauve-500/30 bg-mauve-500/10">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-lg bg-mauve-500/30 flex items-center justify-center">
                                  <span className="text-sm font-bold">{selectedToken.symbol}</span>
                                </div>
                                <div>
                                  <p className="text-lg font-bold">{selectedToken.symbol}</p>
                                  {tokenInfo && (
                                    <p className="text-xs text-muted-foreground">{tokenInfo.name}</p>
                                  )}
                                </div>
                              </div>
                              {hasBalance && (
                                <CheckCircle className="w-6 h-6 text-green-400" />
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Balance:</p>
                                <p className={`text-3xl font-bold ${
                                  hasBalance ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {balance.toLocaleString('es-ES', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 8,
                                  })}
                                </p>
                              </div>
                              
                              {selectedToken.address && (
                                <div className="pt-3 border-t border-white/10">
                                  <p className="text-xs text-muted-foreground mb-1">Dirección del contrato:</p>
                                  <p className="text-xs font-mono break-all">{selectedToken.address}</p>
                                </div>
                              )}
                              
                              {!hasBalance && (
                                <div className="pt-3 border-t border-white/10">
                                  <p className="text-xs text-yellow-400">
                                    Este token no tiene saldo en tu wallet
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {smartAccountAddress && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Dirección de tu smart wallet:</p>
                        <p className="text-xs font-mono break-all">{smartAccountAddress}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(smartAccountAddress)
                            alert('Dirección copiada al portapapeles')
                          } catch (err) {
                            console.error('Error copiando:', err)
                          }
                        }}
                        className="text-xs text-mauve-400 hover:text-mauve-300 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Send / Receive Crypto - Moved to top */}
          {authenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-12"
            >
              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Enviar y Recibir Cripto</h2>
                    <p className="text-sm text-muted-foreground">
                      Usa tu smart wallet con gasless paymaster para enviar dinero a cualquier parte del mundo de forma gratuita e instantánea.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                    <span className="mr-2">Modo</span>
                    <div className="inline-flex rounded-full border border-white/15 p-1 bg-white/5">
                      <button
                        type="button"
                        onClick={() => setTransferMode('send')}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          transferMode === 'send'
                            ? 'bg-mauve-500 text-white'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferMode('receive')}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          transferMode === 'receive'
                            ? 'bg-mauve-500 text-white'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Recibir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile toggle */}
                <div className="sm:hidden mb-4">
                  <div className="inline-flex rounded-full border border-white/15 p-1 bg-white/5">
                    <button
                      type="button"
                      onClick={() => setTransferMode('send')}
                      className={`px-4 py-1 rounded-full text-sm transition-colors ${
                        transferMode === 'send'
                          ? 'bg-mauve-500 text-white'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMode('receive')}
                      className={`px-4 py-1 rounded-full text-sm transition-colors ${
                        transferMode === 'receive'
                          ? 'bg-mauve-500 text-white'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Recibir
                    </button>
                  </div>
                </div>

                {transferMode === 'send' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center">
                          <AtSign className="w-4 h-4 mr-2 text-mauve-400" />
                          Destinatario
                        </label>
                        <div className="relative">
                          <input
                            value={sendAddress}
                            onChange={(e) => handleRecipientChange(e.target.value)}
                            placeholder="nombre.motus o 0x..."
                            className={`w-full rounded-xl border bg-background/60 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mauve-500/60 ${
                              resolvedAddress 
                                ? 'border-green-500/50 text-foreground' 
                                : nameResolutionError 
                                  ? 'border-red-500/50 text-red-400'
                                  : 'border-white/15 text-muted-foreground'
                            }`}
                          />
                          {isResolvingName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Search className="w-4 h-4 text-mauve-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          💡 Usa un nombre <span className="text-mauve-400 font-medium">.motus</span> o pega una dirección 0x...
                        </p>
                        
                        {/* Name Resolution Status */}
                        {isResolvingName && (
                          <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-blue-400 flex items-center">
                              <Loader className="w-3 h-3 mr-2 animate-spin" />
                              Resolviendo nombre...
                            </p>
                          </div>
                        )}
                        
                        {resolvedAddress && !isResolvingName && (
                          <div className="mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <p className="text-xs text-green-400 font-medium mb-1 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-2" />
                              Destinatario verificado
                            </p>
                            {resolvedDisplayName && (
                              <p className="text-sm text-green-300 font-semibold mb-1">
                                📛 {resolvedDisplayName}
                              </p>
                            )}
                            <p className="text-xs font-mono text-green-500/80 break-all">
                              {resolvedAddress}
                            </p>
                          </div>
                        )}
                        
                        {nameResolutionError && !isResolvingName && (
                          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-400">
                              ❌ {nameResolutionError}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Monto
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full rounded-xl border border-white/15 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mauve-500/60"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Token
                          </label>
                          <div className="w-full rounded-xl border border-white/15 bg-background/60 px-3 py-2 text-sm">
                            {/* Tokens habilitados - selección rápida */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {enabledTokensList.map((token) => (
                                <button
                                  key={token.symbol}
                                  type="button"
                                  onClick={() => setSelectedToken(token.symbol as typeof selectedToken)}
                                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                    selectedToken === token.symbol
                                      ? 'bg-mauve-500 text-white border-mauve-400'
                                      : 'bg-transparent text-muted-foreground border-white/20 hover:border-white/40'
                                  }`}
                                >
                                  {token.symbol}
                                </button>
                              ))}
                            </div>
                            
                            {/* Toggle para mostrar/ocultar lista completa */}
                            <button
                              type="button"
                              onClick={() => setShowTokenList(!showTokenList)}
                              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                            >
                              <span>{showTokenList ? 'Ocultar' : 'Mostrar'} todos los tokens</span>
                              {showTokenList ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* Lista expandible de tokens */}
                            {showTokenList && (
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-2 max-h-64 overflow-y-auto">
                                <p className="text-[11px] text-muted-foreground mb-2">
                                  Activa o desactiva tokens para mostrarlos en la selección rápida:
                                </p>
                                {availableTokens.map((token) => {
                                  const isEnabled = enabledTokens.has(token.symbol)
                                  const isSelected = selectedToken === token.symbol
                                  return (
                                    <div
                                      key={token.symbol}
                                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                        isSelected
                                          ? 'bg-mauve-500/20 border-mauve-500/40'
                                          : 'bg-white/5 border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-3 flex-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleToken(token.symbol)}
                                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-mauve-500/60 focus:ring-offset-2 ${
                                            isEnabled ? 'bg-mauve-500' : 'bg-white/20'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                              isEnabled ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                          />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isEnabled) {
                                                  setSelectedToken(token.symbol as typeof selectedToken)
                                                }
                                              }}
                                              disabled={!isEnabled}
                                              className={`font-medium text-xs ${
                                                isEnabled
                                                  ? isSelected
                                                    ? 'text-mauve-400'
                                                    : 'text-foreground hover:text-mauve-400'
                                                  : 'text-muted-foreground cursor-not-allowed'
                                              } transition-colors`}
                                            >
                                              {token.symbol}
                                            </button>
                                            {isSelected && (
                                              <CheckCircle className="w-3 h-3 text-mauve-400" />
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">
                                              {token.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/70">
                                              •
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/70">
                                              {token.region}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <CTAButton
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowQRScanner(true)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Escanear QR
                        </CTAButton>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                        <h3 className="text-sm font-semibold mb-2">Resumen de envío</h3>
                        <p className="text-xs text-muted-foreground mb-1">
                          Desde tu smart wallet (gasless) hacia el destinatario.
                        </p>
                        
                        {/* Show resolved address info */}
                        {resolvedAddress && (
                          <div className="mt-3 space-y-2">
                            <div className="p-3 rounded-lg bg-mauve-500/10 border border-mauve-500/20">
                              <p className="text-[11px] text-muted-foreground mb-1">Destinatario:</p>
                              {resolvedDisplayName && (
                                <p className="text-sm font-semibold text-mauve-400 mb-1">
                                  {resolvedDisplayName}
                                </p>
                              )}
                              <p className="text-[11px] font-mono break-all text-foreground/80">
                                {resolvedAddress}
                              </p>
                            </div>
                            
                            {sendAmount && parseFloat(sendAmount) > 0 && (
                              <div className="p-3 rounded-lg bg-mauve-500/10 border border-mauve-500/20">
                                <p className="text-[11px] text-muted-foreground mb-1">Monto a enviar:</p>
                                <p className="text-lg font-bold text-foreground">
                                  {sendAmount} <span className="text-mauve-400">{selectedToken}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!resolvedAddress && sendAddress && (
                          <div className="mt-2">
                            <p className="text-[11px] text-muted-foreground mb-1">
                              Input actual:
                            </p>
                            <p className="text-[11px] font-mono break-all text-yellow-400">
                              {sendAddress}
                            </p>
                            <p className="text-[10px] text-yellow-500/80 mt-1">
                              ⚠️ Esperando validación del destinatario...
                            </p>
                          </div>
                        )}
                        
                        {!sendAddress && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Ingresa un nombre .motus o dirección para ver el resumen.
                          </p>
                        )}
                      </div>

                      {sendError && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40">
                          <p className="text-sm text-red-400">{sendError}</p>
                        </div>
                      )}

                      {sendSuccess && (
                        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/40">
                          <p className="text-sm text-green-400 mb-2">
                            ✅ Transacción enviada exitosamente!
                          </p>
                          <a
                            href={sendSuccess.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-300 hover:text-green-200 underline"
                          >
                            Ver en Celo Explorer: {sendSuccess.hash.slice(0, 10)}...{sendSuccess.hash.slice(-8)}
                          </a>
                        </div>
                      )}

                      <CTAButton
                        size="lg"
                        className="w-full"
                        onClick={handleSendPayment}
                        disabled={isSending || !kernelClient || isInitializing || !resolvedAddress || !sendAmount || isResolvingName}
                      >
                        {isSending ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : isResolvingName ? (
                          <>
                            <Search className="w-4 h-4 mr-2 animate-pulse" />
                            Resolviendo nombre...
                          </>
                        ) : resolvedDisplayName ? (
                          <>
                            Enviar a {resolvedDisplayName}
                          </>
                        ) : (
                          'Enviar desde mi smart wallet'
                        )}
                      </CTAButton>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Motus Name Display */}
                      {isLoadingUserMotusName ? (
                        <div className="p-4 rounded-xl border border-mauve-500/30 bg-mauve-500/10">
                          <div className="flex items-center">
                            <Loader className="w-4 h-4 mr-2 animate-spin text-mauve-400" />
                            <span className="text-sm text-muted-foreground">Buscando tu nombre .motus...</span>
                          </div>
                        </div>
                      ) : userMotusName ? (
                        <div className="p-4 rounded-xl border border-mauve-500/40 bg-gradient-to-r from-mauve-500/20 to-iris-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Tu nombre .motus:</span>
                            <span className="px-2 py-0.5 bg-mauve-500/30 text-mauve-400 text-xs rounded-full">Registrado</span>
                          </div>
                          <p className="text-2xl font-bold text-mauve-400 mb-2">
                            📛 {userMotusName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Los demás pueden enviarte cripto usando solo tu nombre. ¡Más fácil que compartir una dirección!
                          </p>
                          <CTAButton
                            size="sm"
                            variant="secondary"
                            className="mt-3"
                            onClick={async () => {
                              if (userMotusName) {
                                try {
                                  await navigator.clipboard.writeText(userMotusName)
                                  alert('Nombre .motus copiado al portapapeles.')
                                } catch (err) {
                                  console.error('Error copiando:', err)
                                }
                              }
                            }}
                          >
                            <AtSign className="w-4 h-4 mr-2" />
                            Copiar nombre
                          </CTAButton>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                          <p className="text-sm font-medium text-yellow-400 mb-2">
                            💡 ¡Aún no tienes un nombre .motus!
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Registra un nombre .motus para que los demás puedan enviarte cripto de forma más fácil. 
                            En lugar de compartir una dirección larga, solo comparte tu nombre.
                          </p>
                          <CTAButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              window.location.href = '/motus-names'
                            }}
                          >
                            <AtSign className="w-4 h-4 mr-2" />
                            Registrar nombre .motus
                          </CTAButton>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Tu dirección de smart wallet
                        </label>
                        <div className="rounded-xl border border-mauve-500/40 bg-background/60 px-3 py-2 text-sm font-mono break-all">
                          {smartAccountAddress || userData?.smartWalletAddress || 'Smart wallet no disponible aún'}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Esta es la dirección que puedes compartir para recibir pagos. Las comisiones de gas se
                          cubren mediante el paymaster (gasless).
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <CTAButton
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            const addr = smartAccountAddress || userData?.smartWalletAddress
                            if (!addr) {
                              alert('No hay una smart wallet disponible para copiar.')
                              return
                            }
                            try {
                              await navigator.clipboard.writeText(addr)
                              alert('Dirección copiada al portapapeles.')
                            } catch (err) {
                              console.error('Error copiando al portapapeles:', err)
                              alert('No se pudo copiar la dirección. Copia manualmente desde el texto.')
                            }
                          }}
                        >
                          Copiar dirección
                        </CTAButton>

                        <CTAButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            // Aquí en el futuro podrías abrir una vista ampliada del QR
                          }}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Mostrar QR
                        </CTAButton>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center min-h-[220px]">
                        {smartAccountAddress || userData?.smartWalletAddress ? (
                          <>
                            {userMotusName && (
                              <div className="mb-3 px-3 py-1 bg-mauve-500/20 rounded-full">
                                <span className="text-sm font-medium text-mauve-400">{userMotusName}</span>
                              </div>
                            )}
                            <QRCodeSVG
                              value={smartAccountAddress || userData?.smartWalletAddress || ''}
                              size={180}
                              level="H"
                              includeMargin
                            />
                            <p className="mt-3 text-xs text-muted-foreground text-center">
                              {userMotusName 
                                ? `Comparte tu nombre "${userMotusName}" o escanea este QR para recibir pagos.`
                                : 'Comparte este código QR para recibir pagos directamente en tu smart wallet.'
                              }
                            </p>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-12 h-12 text-mauve-500 mb-3" />
                            <p className="text-sm font-semibold mb-1">QR de recepción</p>
                            <p className="text-xs text-muted-foreground text-center">
                              Necesitamos tu smart wallet para generar un QR. Conéctate y vuelve a intentarlo.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {showQRScanner && (
            <QRScanner
              onScanSuccess={handleQRScan}
              onClose={() => setShowQRScanner(false)}
            />
          )}

          {/* Payment Flow - Moved down, marked as coming soon for onramp */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12"
          >
            <GlassCard className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Flujo Completo de Pagos</h2>
                <p className="text-sm text-muted-foreground">
                  El sistema completo incluirá onramp, wallet y split de pagos. Actualmente disponible: wallet.
                </p>
              </div>
              <div className="space-y-6">
                {paymentSteps.map((step, index) => {
                  const Icon = step.icon
                  const isLast = index === paymentSteps.length - 1
                  
                  return (
                    <div key={step.step} className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          step.status === 'active' 
                            ? 'bg-gradient-mauve' 
                            : step.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-white/10'
                        }`}>
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-8 h-8 text-white" />
                          ) : step.status === 'coming-soon' ? (
                            <Clock className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <Icon className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-6 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">{step.details}</p>
                          </div>
                          <div className="text-right">
                            {step.status === 'active' && (
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                                Activo
                              </span>
                            )}
                            {step.status === 'coming-soon' && (
                              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                                Próximamente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!isLast && (
                        <div className="ml-6">
                          <ArrowRight className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Payment Destination Selection - Moved down, marked as coming soon */}
          {authenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mb-12"
            >
              <GlassCard className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 flex items-center justify-center">
                    <Wallet className="w-6 h-6 mr-3 text-mauve-500" />
                    Destino de Fondos
                  </h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Configuración para cuando las rampas estén disponibles
                  </p>
                  <div className="inline-flex items-center px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full mb-4">
                    <Clock className="w-4 h-4 mr-2" />
                    Próximamente
                  </div>
                </div>
                <p className="text-muted-foreground mb-6 text-center">
                  Selecciona dónde quieres que vayan tus fondos cuando hagas on-ramp (convierte fiat a cripto)
                </p>

                {isLoadingPreference ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-mauve-500" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Own Wallet Option */}
                    <button
                      onClick={() => handleDestinationChange('own_wallet')}
                      disabled={isSavingPreference}
                      className={`w-full p-6 glass-card rounded-lg border-2 transition-all text-left ${
                        paymentPreference?.defaultDestination === 'own_wallet'
                          ? 'border-mauve-500 bg-mauve-500/10'
                          : 'border-white/10 hover:border-white/20'
                      } ${isSavingPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            paymentPreference?.defaultDestination === 'own_wallet'
                              ? 'bg-mauve-500'
                              : 'bg-white/10'
                          }`}>
                            <Wallet className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">Mi Wallet</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Los fondos irán a tu propia smart wallet
                            </p>
                            {smartAccountAddress || userData?.smartWalletAddress ? (
                              <p className="text-xs font-mono text-muted-foreground break-all">
                                {(smartAccountAddress || userData?.smartWalletAddress)?.slice(0, 10)}...{(smartAccountAddress || userData?.smartWalletAddress)?.slice(-8)}
                              </p>
                            ) : (
                              <p className="text-xs text-yellow-500">Smart wallet no disponible aún</p>
                            )}
                          </div>
                        </div>
                        {paymentPreference?.defaultDestination === 'own_wallet' && (
                          <CheckCircle className="w-6 h-6 text-mauve-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Matched PSM Option */}
                    {paymentPreference?.hasMatchedPSM && paymentPreference?.matchedPSM ? (
                      <button
                        onClick={() => handleDestinationChange('matched_psm')}
                        disabled={isSavingPreference}
                        className={`w-full p-6 glass-card rounded-lg border-2 transition-all text-left ${
                          paymentPreference?.defaultDestination === 'matched_psm'
                            ? 'border-mauve-500 bg-mauve-500/10'
                            : 'border-white/10 hover:border-white/20'
                        } ${isSavingPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              paymentPreference?.defaultDestination === 'matched_psm'
                                ? 'bg-mauve-500'
                                : 'bg-white/10'
                            }`}>
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg mb-1">Mi Psicólogo/a</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                Los fondos irán directamente a tu profesional emparejado
                              </p>
                              {paymentPreference.matchedPSM.smartWalletAddress ? (
                                <p className="text-xs font-mono text-muted-foreground break-all">
                                  {paymentPreference.matchedPSM.smartWalletAddress.slice(0, 10)}...{paymentPreference.matchedPSM.smartWalletAddress.slice(-8)}
                                </p>
                              ) : (
                                <p className="text-xs text-yellow-500">Wallet del profesional no disponible</p>
                              )}
                            </div>
                          </div>
                          {paymentPreference?.defaultDestination === 'matched_psm' && (
                            <CheckCircle className="w-6 h-6 text-mauve-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="w-full p-6 glass-card rounded-lg border border-white/10 opacity-50">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1 text-muted-foreground">Mi Psicólogo/a</h3>
                            <p className="text-sm text-muted-foreground">
                              No disponible - Necesitas estar emparejado con un profesional
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DAO Treasury Option */}
                    <button
                      onClick={() => handleDestinationChange('dao_treasury')}
                      disabled={isSavingPreference}
                      className={`w-full p-6 glass-card rounded-lg border-2 transition-all text-left ${
                        paymentPreference?.defaultDestination === 'dao_treasury'
                          ? 'border-mauve-500 bg-mauve-500/10'
                          : 'border-white/10 hover:border-white/20'
                      } ${isSavingPreference ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            paymentPreference?.defaultDestination === 'dao_treasury'
                              ? 'bg-mauve-500'
                              : 'bg-white/10'
                          }`}>
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">Tesorería DAO</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Los fondos irán a la tesorería de MotusDAO
                            </p>
                            <p className="text-xs font-mono text-muted-foreground break-all">
                              {daoTreasuryAddress.slice(0, 10)}...{daoTreasuryAddress.slice(-8)}
                            </p>
                          </div>
                        </div>
                        {paymentPreference?.defaultDestination === 'dao_treasury' && (
                          <CheckCircle className="w-6 h-6 text-mauve-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Current Selection Display */}
                    {getDestinationAddress() && (
                      <div className="mt-6 p-4 glass-card rounded-lg border border-mauve-500/30">
                        <p className="text-xs text-muted-foreground mb-2">
                          Dirección de destino actual:
                        </p>
                        <p className="text-sm font-mono break-all">
                          {getDestinationAddress()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Provider Selection inside Destino de Fondos */}
                <div className="mt-10 border-t border-white/10 pt-6">
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    Selecciona tu Proveedor de On-Ramp
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    Elige el proveedor que prefieras para comprar cripto con tarjeta y enviarlo al destino seleccionado.
                  </p>

                  {availableProviders.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">
                        No hay proveedores de on-ramp configurados actualmente.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contacta al equipo de MotusDAO para habilitar los proveedores.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {providers.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => handleStartOnramp(provider.id)}
                          disabled={!provider.enabled || isStartingOnramp || !getDestinationAddress()}
                          className={`p-4 glass-card rounded-lg border-2 transition-all text-left ${
                            provider.enabled
                              ? selectedProvider === provider.id
                                ? 'border-mauve-500 bg-mauve-500/10'
                                : 'border-white/10 hover:border-white/20 cursor-pointer'
                              : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">{provider.name}</h4>
                            {provider.enabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {provider.description}
                          </p>
                          {!provider.enabled && (
                            <p className="text-[11px] text-yellow-500 mt-1">
                              Próximamente disponible
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {isStartingOnramp && (
                    <div className="mt-4 text-center">
                      <Loader className="w-5 h-5 animate-spin text-mauve-500 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Iniciando {providers.find(p => p.id === selectedProvider)?.name}...
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-12"
          >
            <GlassCard className="p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Estado Actual del Sistema</h3>
                  <p className="text-muted-foreground mb-4">
                    El sistema de pagos está configurado con Pimlico paymaster para gasless transactions.
                    La integración con wallets a través de Privy está activa. Las funcionalidades de onramp 
                    y split de pagos estarán disponibles en futuras actualizaciones.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Conexión de wallet (Privy)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Pimlico Paymaster configurado (gasless transactions)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Onramp con múltiples proveedores (Transak, Mt Pelerin, Privy)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Sistema de split de pagos</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Mt Pelerin On/Off-Ramp iFrame */}
          {mtPelerinUrl && selectedProvider === 'mtpelerin' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8"
            >
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Completa tu compra de cripto sin salir de MotusDAO
                  </h3>
                  <button
                    onClick={() => {
                      setMtPelerinUrl(null)
                      setSelectedProvider(null)
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cerrar
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Este widget es proporcionado por Mt Pelerin. Asegúrate de que la dirección mostrada en el flujo
                  coincida con el destino que seleccionaste aquí.
                </p>
                <div className="w-full">
                  <iframe
                    src={mtPelerinUrl}
                    title="Mt Pelerin exchange widget"
                    loading="lazy"
                    allow="usb; ethereum; clipboard-write; payment; microphone; camera"
                    className="w-full h-[700px] rounded-xl border border-white/10"
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </Section>
    </div>
  )
}
