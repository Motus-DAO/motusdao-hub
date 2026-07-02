'use client'

import Image from 'next/image'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { MatrixColorSelector } from '@/components/profile/MatrixColorSelector'
import { 
  User, 
  Save,
  Edit,
  Camera,
  Shield,
  Wallet,
  Settings,
  Loader,
  AlertCircle,
  Users,
  Heart,
  Calendar,
  AtSign,
  Video,
  Link2,
  Copy
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets, getWalletIdentity, appendWalletIdentityParams } from '@/lib/wallet'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import { motusNameService } from '@/lib/motus-name-service'
import { buildVideochatUrl } from '@/lib/jitsi'
import { useRouter } from 'next/navigation'
import { asStringArray } from '@/lib/prisma-json'

interface ProfileData {
  nombre: string
  apellido: string
  telefono: string
  fechaNacimiento: string
  ciudad: string
  pais: string
  bio?: string
  language: string
  avatarUrl?: string
}

interface UserData {
  id: string
  email: string
  role: string
  eoaAddress: string
  smartWalletAddress?: string
  registrationCompleted: boolean
  motusName?: string | null
  mnsTxHash?: string | null
}

export default function PerfilPage() {
  const { role, setMatrixColor } = useUIStore()
  const router = useRouter()
  
  // WaaP authentication hooks (replaces Privy)
  const { authenticated, user, ready, providerId } = useWallet()
  const { wallets } = useWallets()
  
  // ZeroDev smart wallet hook
  const { smartAccountAddress } = useSmartAccount()
  
  // Get EOA address - prioritizes external wallet (MetaMask) over embedded wallet
  const eoaAddress = getEOAAddress(wallets)
  
  // Get email from user
  const userEmail = user?.email?.address || user?.google?.email || 'No disponible'
  const walletIdentity = getWalletIdentity(user, providerId)

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    nombre: '',
    apellido: '',
    telefono: '',
    fechaNacimiento: '',
    ciudad: '',
    pais: '',
    bio: '',
    language: 'es',
    avatarUrl: ''
  })
  const [userData, setUserData] = useState<UserData | null>(null)
  
  interface UserMatchHistoryItem {
    id: string
    psmId: string
    status: string
    matchedAt: string
    endedAt?: string | null
    reason?: string | null
    psm: {
      nombre?: string
      apellido?: string
    }
  }

  interface PSMMatchHistoryItem {
    id: string
    userId: string
    status: string
    matchedAt: string
    endedAt?: string | null
    reason?: string | null
    user: {
      nombre?: string
      apellido?: string
    }
  }

  interface ActiveMatch {
    id: string
    psmId: string
    status: string
    matchedAt: string
    officeUrl?: string
    psm: {
      id: string
      email: string
      nombre?: string
      apellido?: string
      telefono?: string
      ciudad?: string
      pais?: string
      avatarUrl?: string
      biografia?: string
      especialidades?: string
      experienciaAnios?: number
      smartWalletAddress?: string | null
      eoaAddress?: string
    }
  }

  interface PSMActiveMatch {
    id: string
    userId: string
    status: string
    matchedAt: string
    officeUrl?: string
    user: {
      id: string
      email: string
      nombre?: string
      apellido?: string
      telefono?: string
      ciudad?: string
      pais?: string
      avatarUrl?: string
      problematica?: string
      tipoAtencion?: string
      smartWalletAddress?: string | null
      eoaAddress?: string
    }
  }

  interface MatchData {
    activeMatch?: ActiveMatch | null
    activeMatches?: PSMActiveMatch[]
    openGuestUrl?: string
    matchHistory?: UserMatchHistoryItem[] | PSMMatchHistoryItem[]
    capacity?: {
      current: number
      max: number
      available: number
    }
  }

  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [isLoadingMatch, setIsLoadingMatch] = useState(false)
  const [activeSession, setActiveSession] = useState<{
    id: string
    status: string
    externalUrl: string
  } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  type PsmMeetingMode = 'secure' | 'open'
  const [psmMeetingMode, setPsmMeetingMode] = useState<PsmMeetingMode>('secure')
  const [copiedOpenLink, setCopiedOpenLink] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('psm-meeting-mode')
    if (saved === 'secure' || saved === 'open') {
      setPsmMeetingMode(saved)
    }
  }, [])

  const handlePsmMeetingModeChange = (mode: PsmMeetingMode) => {
    setPsmMeetingMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('psm-meeting-mode', mode)
    }
  }
  
  // Motus Name state
  const [motusName, setMotusName] = useState<string | null>(null)
  const [isLoadingMotusName, setIsLoadingMotusName] = useState(false)

  // Fetch profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      if (!ready || !authenticated || !userEmail) return

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        appendWalletIdentityParams(params, walletIdentity)
        if (userEmail) params.append('email', userEmail)

        const response = await fetch(`/api/profile?${params.toString()}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Perfil no encontrado. Por favor completa el registro primero.')
            setIsLoading(false)
            return
          }
          throw new Error('Error al cargar el perfil')
        }

        const data = await response.json()
        
        if (data.profile) {
          setProfileData({
            nombre: data.profile.nombre || '',
            apellido: data.profile.apellido || '',
            telefono: data.profile.telefono || '',
            fechaNacimiento: data.profile.fechaNacimiento ? new Date(data.profile.fechaNacimiento).toISOString().split('T')[0] : '',
            ciudad: data.profile.ciudad || '',
            pais: data.profile.pais || '',
            bio: data.profile.bio || '',
            language: data.profile.language || 'es',
            avatarUrl: data.profile.avatarUrl || ''
          })
        } else if (data.profileIncomplete) {
          setError('Tu perfil básico está incompleto. Por favor completa tus datos personales.')
        }

        if (data.user) {
          setUserData(data.user)
          if (data.user.motusName) {
            setMotusName(data.user.motusName.replace(/\.motus$/i, ''))
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar el perfil')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [ready, authenticated, userEmail, walletIdentity?.authProviderId])

  // Fetch match data
  useEffect(() => {
    const fetchMatchData = async () => {
      if (!userData?.id) return

      setIsLoadingMatch(true)
      try {
        const endpoint = userData.role === 'usuario' 
          ? `/api/matching/user/${userData.id}`
          : `/api/matching/psm/${userData.id}`
        
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setMatchData(data)
        }
      } catch (err) {
        console.error('Error fetching match data:', err)
      } finally {
        setIsLoadingMatch(false)
      }
    }

    if (userData?.id) {
      fetchMatchData()
    }
  }, [userData?.id, userData?.role])

  // Fetch Motus Name — DB first, then on-chain fallback
  useEffect(() => {
    const fetchMotusName = async () => {
      if (userData?.motusName) {
        setMotusName(userData.motusName.replace(/\.motus$/i, ''))
        return
      }

      const walletAddresses = [
        userData?.smartWalletAddress,
        userData?.eoaAddress,
        smartAccountAddress,
        eoaAddress
      ].filter((addr): addr is string => Boolean(addr))

      const seen = new Set<string>()
      const uniqueAddresses = walletAddresses.filter((addr) => {
        const key = addr.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      if (uniqueAddresses.length === 0) return
      
      setIsLoadingMotusName(true)
      try {
        for (const address of uniqueAddresses) {
          const name = await motusNameService.reverseLookup(address as `0x${string}`)
          if (name) {
            setMotusName(name)
            break
          }
        }
      } catch (err) {
        console.error('Error fetching motus name:', err)
      } finally {
        setIsLoadingMotusName(false)
      }
    }
    
    fetchMotusName()
  }, [userData?.motusName, userData?.smartWalletAddress, userData?.eoaAddress, smartAccountAddress, eoaAddress])

  // Fetch active therapy session
  useEffect(() => {
    const fetchSession = async () => {
      if (!userData?.id || userData.role !== 'usuario') return

      setIsLoadingSession(true)
      try {
        const res = await fetch(`/api/sessions?userId=${userData.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.activeSession) {
            setActiveSession({
              id: data.activeSession.id,
              status: data.activeSession.status,
              externalUrl: data.activeSession.externalUrl
            })
          } else {
            setActiveSession(null)
          }
        }
      } catch (err) {
        console.error('Error fetching active session:', err)
      } finally {
        setIsLoadingSession(false)
      }
    }

    if (userData?.id && userData.role === 'usuario') {
      fetchSession()
    }
  }, [userData?.id, userData?.role])

  const handleSave = async () => {
    if (!userData?.id) {
      setError('No se puede guardar: ID de usuario no disponible')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userData.id,
          ...profileData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el perfil')
      }

      await response.json()
      setIsEditing(false)
      // Optionally show success message
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handleMatrixColorChange = (color: 'green' | 'red' | 'orange' | 'blue' | 'pink') => {
    // Solo actualiza el store (localStorage), no el estado del perfil
    setMatrixColor(color)
  }

  const handleAvatarClick = () => {
    if (isEditing && userData?.id) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file && userData?.id) {
          await handleAvatarUpload(file)
        }
      }
      input.click()
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!userData?.id) {
      setError('No se puede subir: ID de usuario no disponible')
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo inválido. Solo se permiten JPEG, PNG, WebP y GIF.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. El tamaño máximo es 5MB.')
      return
    }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userData.id)

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir la imagen')
      }

      const result = await response.json()
      
      // Update local state with new avatar URL
      setProfileData(prev => ({
        ...prev,
        avatarUrl: result.avatarUrl
      }))
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(err instanceof Error ? err.message : 'Error al subir la imagen')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const displayName = profileData.nombre && profileData.apellido 
    ? `${profileData.nombre} ${profileData.apellido}` 
    : 'Usuario MotusDAO'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-mauve-500" />
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (error && !profileData.nombre) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <CTAButton onClick={() => window.location.href = '/registro'}>
              Completar Registro
            </CTAButton>
          </div>
        </GlassCard>
      </div>
    )
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
              <div className="w-16 h-16 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-xl flex items-center justify-center mr-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl md:text-5xl font-bold">
                  Mi Perfil
                </GradientText>
                <p className="text-muted-foreground">Gestiona tu información personal</p>
              </div>
            </div>
          </motion.div>

          {error && (
            <div className="mb-6 p-4 glass-card rounded-xl border border-red-500/20 bg-red-500/10">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <GlassCard className="p-6 text-center">
                  {/* Avatar */}
                  <div className="relative mb-6">
                    <div 
                      className={`w-32 h-32 bg-gradient-mauve rounded-full flex items-center justify-center mx-auto overflow-hidden ${
                        isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                      } ${isUploadingAvatar ? 'opacity-50' : ''}`}
                      onClick={handleAvatarClick}
                    >
                      {isUploadingAvatar ? (
                        <Loader className="w-8 h-8 text-white animate-spin" />
                      ) : profileData.avatarUrl ? (
                        <Image 
                          src={profileData.avatarUrl} 
                          alt={displayName} 
                          width={128}
                          height={128}
                          className="w-32 h-32 rounded-full object-cover" 
                        />
                      ) : (
                        <User className="w-16 h-16 text-white" />
                      )}
                    </div>
                    {isEditing && !isUploadingAvatar && (
                      <button 
                        onClick={handleAvatarClick}
                        className="absolute bottom-2 right-2 w-10 h-10 bg-mauve-500 rounded-full flex items-center justify-center hover:bg-mauve-600 transition-colors shadow-lg"
                        title="Cambiar foto de perfil"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader className="w-8 h-8 text-white animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Basic Info */}
                  <h2 className="text-2xl font-bold mb-2">{displayName}</h2>
                  <p className="text-muted-foreground mb-4 capitalize">{userData?.role || role}</p>
                  
                  {/* Account Info */}
                  {authenticated && (
                    <div className="mb-4 space-y-3">
                      {/* Email */}
                      <div className="p-3 glass-card rounded-lg">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-mauve-500" />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                        <p className="text-sm font-mono text-center break-all">
                          {userData?.email || userEmail}
                        </p>
                      </div>
                      
                      {/* EOA Address */}
                      {(userData?.eoaAddress || eoaAddress) && (
                        <div className="p-3 glass-card rounded-lg">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <Wallet className="w-4 h-4 text-mauve-500" />
                            <span className="text-xs text-muted-foreground">Wallet Conectada (EOA)</span>
                          </div>
                          <p className="text-sm font-mono text-center">
                            {(userData?.eoaAddress || eoaAddress)?.slice(0, 6)}...{(userData?.eoaAddress || eoaAddress)?.slice(-4)}
                          </p>
                          <p className="text-xs font-mono text-center text-muted-foreground mt-1 break-all">
                            {userData?.eoaAddress || eoaAddress}
                          </p>
                        </div>
                      )}
                      
                      {/* Smart Wallet Address */}
                      {(userData?.smartWalletAddress || smartAccountAddress) ? (
                        <div className="p-3 glass-card rounded-lg border border-green-500/30">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-muted-foreground">Smart Wallet (ZeroDev)</span>
                          </div>
                          <p className="text-sm font-mono text-center">
                            {(userData?.smartWalletAddress || smartAccountAddress)?.slice(0, 6)}...{(userData?.smartWalletAddress || smartAccountAddress)?.slice(-4)}
                          </p>
                          <p className="text-xs font-mono text-center text-muted-foreground mt-1 break-all">
                            {userData?.smartWalletAddress || smartAccountAddress}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 glass-card rounded-lg border border-yellow-500/30">
                          <p className="text-xs text-yellow-500 text-center">
                            Smart wallet no disponible
                          </p>
                        </div>
                      )}
                      
                      {/* Motus Names - Identidad Descentralizada */}
                      <div className="p-3 glass-card rounded-lg border border-iris-500/30 bg-gradient-to-br from-iris-500/10 to-mauve-500/10">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <AtSign className="w-4 h-4 text-iris-500" />
                          <span className="text-xs text-muted-foreground">Identidad Descentralizada</span>
                        </div>
                        
                        {isLoadingMotusName ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader className="w-4 h-4 animate-spin text-iris-500" />
                          </div>
                        ) : motusName ? (
                          <>
                            <p className="text-lg font-bold text-center text-iris-400 mb-2">
                              {motusName}.motus
                            </p>
                            <p className="text-xs text-muted-foreground text-center mb-3">
                              Tu nombre registrado en la blockchain
                            </p>
                            <CTAButton 
                              size="sm" 
                              variant="secondary"
                              className="w-full"
                              onClick={() => window.location.href = '/motus-names'}
                            >
                              <AtSign className="w-4 h-4 mr-2" />
                              Gestionar Nombres
                            </CTAButton>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-center mb-3">
                              Registra tu nombre <span className="font-bold text-iris-400">.motus</span>
                            </p>
                            <CTAButton 
                              size="sm" 
                              className="w-full"
                              onClick={() => window.location.href = '/motus-names'}
                            >
                              <AtSign className="w-4 h-4 mr-2" />
                              Registrar Nombre
                            </CTAButton>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-mauve-500">-</div>
                      <div className="text-sm text-muted-foreground">Sesiones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-mauve-500">-</div>
                      <div className="text-sm text-muted-foreground">Cursos</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <GlassCard className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Información Personal</h3>
                    <CTAButton
                      variant={isEditing ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : isEditing ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </>
                      )}
                    </CTAButton>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Nombre</label>
                        <input
                          type="text"
                          value={profileData.nombre}
                          onChange={(e) => handleInputChange('nombre', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Apellido</label>
                        <input
                          type="text"
                          value={profileData.apellido}
                          onChange={(e) => handleInputChange('apellido', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Teléfono</label>
                        <input
                          type="tel"
                          value={profileData.telefono}
                          onChange={(e) => handleInputChange('telefono', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Fecha de Nacimiento</label>
                        <input
                          type="date"
                          value={profileData.fechaNacimiento}
                          onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Ciudad</label>
                        <input
                          type="text"
                          value={profileData.ciudad}
                          onChange={(e) => handleInputChange('ciudad', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">País</label>
                        <input
                          type="text"
                          value={profileData.pais}
                          onChange={(e) => handleInputChange('pais', e.target.value)}
                          disabled={!isEditing}
                          className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={userData?.email || userEmail}
                        disabled={true}
                        className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email gestionado por Privy
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Biografía</label>
                      <textarea
                        value={profileData.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                        className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Idioma Preferido</label>
                      <select
                        value={profileData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        disabled={!isEditing}
                        className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>

                    {/* Matrix Color Customization */}
                    <div className="pt-4 border-t border-white/10">
                      <MatrixColorSelector 
                        onColorChange={handleMatrixColorChange}
                      />
                    </div>
                  </form>
                </GlassCard>
              </motion.div>

              {/* Match Information */}
              {(userData?.role === 'usuario' || userData?.role === 'psm') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-8"
                >
                  <GlassCard className="p-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center">
                      <Heart className="w-6 h-6 mr-3 text-mauve-500" />
                      {userData.role === 'usuario' ? 'Mi Profesional' : 'Mis Usuarios'}
                    </h3>

                    {isLoadingMatch ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="w-6 h-6 animate-spin text-mauve-500" />
                      </div>
                    ) : userData.role === 'usuario' ? (
                      // User view: Show matched PSM
                      matchData?.activeMatch ? (
                        <div className="space-y-4">
                          <div className="p-6 glass-card rounded-lg border border-green-500/30">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">
                                    {matchData.activeMatch.psm.nombre} {matchData.activeMatch.psm.apellido}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">Profesional de Salud Mental</p>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                                Activo
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Especialidades</p>
                                <p className="text-sm">
                                  {matchData.activeMatch.psm.especialidades
                                    ? asStringArray(matchData.activeMatch.psm.especialidades).join(', ') || 'No especificadas'
                                    : 'No especificadas'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Experiencia</p>
                                <p className="text-sm">{matchData.activeMatch.psm.experienciaAnios} años</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Ubicación</p>
                                <p className="text-sm">{matchData.activeMatch.psm.ciudad}, {matchData.activeMatch.psm.pais}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Emparejado desde</p>
                                <p className="text-sm">
                                  {new Date(matchData.activeMatch.matchedAt).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>

                            {matchData.activeMatch.psm.biografia && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-muted-foreground mb-2">Biografía</p>
                                <p className="text-sm">{matchData.activeMatch.psm.biografia}</p>
                              </div>
                            )}

                            {matchData.activeMatch.psm.smartWalletAddress && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-muted-foreground mb-2">Wallet del Profesional</p>
                                <p className="text-sm font-mono break-all">
                                  {matchData.activeMatch.psm.smartWalletAddress}
                                </p>
                              </div>
                            )}

                            {/* Consultorio + sesión */}
                            <div className="mt-6 pt-4 border-t border-white/10 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold mb-1">
                                    Mi consultorio virtual
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Tu espacio privado con {matchData.activeMatch.psm.nombre}. Siempre la misma sala; tu terapeuta te admite desde la recepción.
                                  </p>
                                </div>
                                {matchData.activeMatch.officeUrl && (
                                  <CTAButton
                                    size="sm"
                                    onClick={() => {
                                      router.push(buildVideochatUrl(matchData.activeMatch!.officeUrl!))
                                    }}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Ir a mi consultorio
                                  </CTAButton>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/5">
                                <div>
                                  <p className="text-sm font-semibold mb-1">
                                    Sesión de terapia
                                  </p>
                                  {isLoadingSession ? (
                                    <p className="text-xs text-muted-foreground">
                                      Cargando información de tu sesión...
                                    </p>
                                  ) : activeSession ? (
                                    <p className="text-xs text-green-400">
                                      Tienes una sesión {activeSession.status === 'accepted' ? 'aceptada' : 'solicitada'} programada.
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Puedes solicitar una cita desde MotusAI; el consultorio sigue siendo el mismo.
                                    </p>
                                  )}
                                </div>
                                {activeSession && matchData.activeMatch.officeUrl && (
                                  <CTAButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      router.push(buildVideochatUrl(matchData.activeMatch!.officeUrl!))
                                    }}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Entrar a sesión programada
                                  </CTAButton>
                                )}
                              </div>
                            </div>
                          </div>

                          {matchData.matchHistory && matchData.matchHistory.length > 0 && (
                            <div className="mt-6">
                              <h4 className="font-semibold mb-3 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                Historial de Emparejamientos
                              </h4>
                              <div className="space-y-2">
                                {matchData.matchHistory.map((match) => {
                                  const userMatch = match as UserMatchHistoryItem
                                  return (
                                    <div key={userMatch.id} className="p-4 glass-card rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">
                                            {userMatch.psm.nombre} {userMatch.psm.apellido}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(userMatch.matchedAt).toLocaleDateString('es-ES')} - 
                                            {userMatch.endedAt ? new Date(userMatch.endedAt).toLocaleDateString('es-ES') : 'Activo'}
                                          </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          userMatch.status === 'ended' ? 'bg-red-500/20 text-red-400' :
                                          userMatch.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}>
                                          {userMatch.status === 'ended' ? 'Finalizado' :
                                           userMatch.status === 'paused' ? 'Pausado' : 'Activo'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">No tienes un profesional emparejado</p>
                          <CTAButton onClick={async () => {
                            if (userData?.id) {
                              try {
                                const response = await fetch('/api/matching/match', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: userData.id })
                                })
                                if (response.ok) {
                                  const data = await response.json()
                                  setMatchData({ activeMatch: data.match, matchHistory: [] })
                                } else {
                                  const error = await response.json()
                                  setError(error.error || 'Error al crear emparejamiento')
                                }
                              } catch {
                                setError('Error al crear emparejamiento')
                              }
                            }
                          }}>
                            Buscar Profesional
                          </CTAButton>
                        </div>
                      )
                    ) : (
                      // PSM view: meeting mode + patients or open guest link
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">Modo de videollamada</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Elige si atiendes a un paciente emparejado o compartes un enlace para invitados.
                              </p>
                            </div>
                            <div className="flex rounded-lg border border-white/10 p-1 bg-black/20">
                              <button
                                type="button"
                                onClick={() => handlePsmMeetingModeChange('secure')}
                                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                                  psmMeetingMode === 'secure'
                                    ? 'bg-mauve-500/30 text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Consultorio seguro
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePsmMeetingModeChange('open')}
                                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                                  psmMeetingMode === 'open'
                                    ? 'bg-amber-500/25 text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                Enlace abierto
                              </button>
                            </div>
                          </div>

                          <div
                            className={`rounded-lg px-4 py-3 text-sm border ${
                              psmMeetingMode === 'secure'
                                ? 'border-green-500/30 bg-green-500/10 text-green-100'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                            }`}
                          >
                            {psmMeetingMode === 'secure' ? (
                              <>
                                <span className="font-semibold">Modo consultorio seguro.</span>{' '}
                                Solo tú y tu paciente emparejado pueden entrar. El paciente espera en la sala de recepción hasta que lo admitas.
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">Modo enlace abierto.</span>{' '}
                                Cualquier persona con cuenta Hub puede unirse, o como invitado solo con su nombre. Tú admites desde la recepción.
                              </>
                            )}
                          </div>
                        </div>

                        {psmMeetingMode === 'open' ? (
                          <div className="p-6 glass-card rounded-lg border border-amber-500/20 space-y-4">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-amber-400" />
                                Tu enlace para invitados
                              </h4>
                              <p className="text-sm text-muted-foreground mt-2">
                                Comparte este enlace con colegas, supervisión o personas que no son tus pacientes en la plataforma. Deben iniciar sesión en MotusDAO Hub.
                              </p>
                            </div>
                            {matchData?.openGuestUrl ? (
                              <>
                                <code className="block text-xs bg-muted px-3 py-2 rounded break-all">
                                  {typeof window !== 'undefined'
                                    ? `${window.location.origin}${buildVideochatUrl(matchData.openGuestUrl)}`
                                    : buildVideochatUrl(matchData.openGuestUrl)}
                                </code>
                                <div className="flex flex-wrap gap-2">
                                  <CTAButton
                                    size="sm"
                                    onClick={() => {
                                      router.push(buildVideochatUrl(matchData.openGuestUrl!))
                                    }}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Abrir sala de invitados
                                  </CTAButton>
                                  <CTAButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      const hubUrl = `${window.location.origin}${buildVideochatUrl(matchData.openGuestUrl!)}`
                                      window.navigator.clipboard?.writeText(hubUrl).then(() => {
                                        setCopiedOpenLink(true)
                                        setTimeout(() => setCopiedOpenLink(false), 2000)
                                      })
                                    }}
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {copiedOpenLink ? 'Copiado' : 'Copiar enlace Hub'}
                                  </CTAButton>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Cargando enlace...</p>
                            )}
                          </div>
                        ) : matchData?.activeMatches && matchData.activeMatches.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-muted-foreground">
                              {matchData.activeMatches.length} de {(matchData.capacity?.max ?? 10)} usuarios activos
                            </p>
                            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-mauve transition-all"
                                style={{ width: `${(matchData.activeMatches.length / (matchData.capacity?.max ?? 10)) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {matchData.activeMatches.map((match) => (
                              <div key={match.id} className="p-4 glass-card rounded-lg border border-white/10">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-mauve-500 to-iris-500 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">
                                        {match.user.nombre} {match.user.apellido}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">{match.user.email}</p>
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                    Activo
                                  </span>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Problema: </span>
                                    <span>{match.user.problematica}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Tipo de atención: </span>
                                    <span>{match.user.tipoAtencion}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Ubicación: </span>
                                    <span>{match.user.ciudad}, {match.user.pais}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Desde: </span>
                                    <span>{new Date(match.matchedAt).toLocaleDateString('es-ES')}</span>
                                  </div>
                                </div>

                                {match.officeUrl && (
                                  <CTAButton
                                    size="sm"
                                    className="w-full mt-4"
                                    onClick={() => {
                                      router.push(buildVideochatUrl(match.officeUrl!))
                                    }}
                                  >
                                    <Video className="w-4 h-4 mr-2" />
                                    Abrir consultorio
                                  </CTAButton>
                                )}
                              </div>
                            ))}
                          </div>

                          {matchData.matchHistory && matchData.matchHistory.length > 0 && (
                            <div className="mt-6">
                              <h4 className="font-semibold mb-3 flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                Historial de Emparejamientos
                              </h4>
                              <div className="space-y-2">
                                {matchData.matchHistory.map((match) => {
                                  const psmmatch = match as PSMMatchHistoryItem
                                  return (
                                    <div key={match.id} className="p-4 glass-card rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">
                                            {psmmatch.user.nombre} {psmmatch.user.apellido}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(match.matchedAt).toLocaleDateString('es-ES')} - 
                                            {match.endedAt ? new Date(match.endedAt).toLocaleDateString('es-ES') : 'Activo'}
                                          </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          match.status === 'ended' ? 'bg-red-500/20 text-red-400' :
                                          match.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}>
                                          {match.status === 'ended' ? 'Finalizado' :
                                           match.status === 'paused' ? 'Pausado' : 'Activo'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        ) : (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No tienes usuarios emparejados</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Puedes usar el modo enlace abierto para reuniones con invitados.
                          </p>
                        </div>
                        )}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-8"
              >
                <GlassCard className="p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <Settings className="w-6 h-6 mr-3 text-mauve-500" />
                    Configuración
                  </h3>

                  <div className="space-y-6">
                    {/* Role Preference */}
                    <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                      <div>
                        <h4 className="font-semibold">Rol Preferido</h4>
                        <p className="text-sm text-muted-foreground">Cambia entre Usuario y PSM</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm capitalize">{userData?.role || role}</span>
                        <CTAButton variant="secondary" size="sm">
                          Cambiar
                        </CTAButton>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                      <div>
                        <h4 className="font-semibold">Privacidad</h4>
                        <p className="text-sm text-muted-foreground">Controla la visibilidad de tu perfil</p>
                      </div>
                      <CTAButton variant="secondary" size="sm">
                        <Shield className="w-4 h-4 mr-2" />
                        Configurar
                      </CTAButton>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                      <div>
                        <h4 className="font-semibold">Notificaciones</h4>
                        <p className="text-sm text-muted-foreground">Gestiona tus preferencias de notificación</p>
                      </div>
                      <CTAButton variant="secondary" size="sm">
                        Configurar
                      </CTAButton>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
