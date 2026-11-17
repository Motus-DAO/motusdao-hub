'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { MatrixColorSelector } from '@/components/profile/MatrixColorSelector'
import { 
  User, 
  Save,
  Edit,
  Shield,
  Settings,
  Loader,
  AlertCircle,
  Users,
  Heart,
  Calendar,
  Video,
  Link2,
  Copy,
  CreditCard,
  AlertTriangle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets, getWaapAuthEmail } from '@/lib/wallet'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import { authFetch } from '@/lib/auth/client'
import { isWalletLinkModeActive } from '@/lib/auth/wallet-link-mode'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { ProfileAccessGate } from '@/components/auth/ProfileAccessGate'
import { StripeConnectCard } from '@/components/payments/StripeConnectCard'
import { StripeEarningsCard } from '@/components/payments/StripeEarningsCard'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'
import { SpeiPaymentCard } from '@/components/payments/SpeiPaymentCard'
import {
  classifyProfileLoadError,
  PROFILE_WALLET_READY_TIMEOUT_MS,
  profileLoadErrorMessage,
  resolveProfileAccessGate,
  type ProfileLoadErrorKind,
} from '@/lib/auth/hub-session'
import { buildVideochatUrl } from '@/lib/jitsi'
import { useRouter } from 'next/navigation'
import { asStringArray } from '@/lib/prisma-json'
import { ProfileLanguagesSelector } from '@/components/profile/ProfileLanguagesSelector'
import Link from 'next/link'
import { PatientSharedSummariesPanel } from '@/components/clinical-summary/PatientSharedSummariesPanel'
import { LinkedWalletsPanel } from '@/components/profile/LinkedWalletsPanel'
import { WalletBalancesCard } from '@/components/profile/WalletBalancesCard'
import { MotusNamesPanel } from '@/components/profile/MotusNamesPanel'
import {
  ProfileSettingsNav,
  readProfileSectionFromHash,
} from '@/components/profile/ProfileSettingsNav'
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader'
import { MotusAccountCard } from '@/components/profile/MotusAccountCard'
import {
  ProfileSidebarCard,
  readProfileRailCollapsed,
  writeProfileRailCollapsed,
} from '@/components/profile/ProfileSidebarCard'
import {
  PROFILE_PREFERENCE_ITEMS,
  type ProfileSectionId,
} from '@/lib/profile-settings-sections'

interface ProfileData {
  nombre: string
  apellido: string
  telefono: string
  fechaNacimiento: string
  ciudad: string
  pais: string
  bio?: string
  language: string
  languages: string[]
  avatarUrl?: string
}

const EMPTY_PROFILE: ProfileData = {
  nombre: '',
  apellido: '',
  telefono: '',
  fechaNacimiento: '',
  ciudad: '',
  pais: '',
  bio: '',
  language: 'es',
  languages: ['es'],
  avatarUrl: '',
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

interface UserEnrollmentItem {
  id: string
  userId: string
  courseId: string
  purchasedAt?: string | null
  accessExpiresAt?: string | null
  stripeSubscriptionId?: string | null
  paid?: boolean
  cancelAtPeriodEnd?: boolean
  subscriptionStatus?: string | null
  subscriptionCanceledAt?: string | null
  course?: {
    id: string
    title: string
    slug: string
    billingInterval?: 'one_time' | 'monthly' | string | null
  } | null
}

export default function PerfilPage() {
  const { role } = useUIStore()
  const router = useRouter()
  
  // WaaP authentication hooks (replaces Privy)
  const { authenticated, user, ready, login } = useWallet()
  const { wallets } = useWallets()
  const {
    sessionState,
    isSessionReady,
    signing: isSigningSession,
    refresh: refreshSession,
    signIn: signInSiwe,
  } = useSiweSession()
  
  // ZeroDev smart wallet hook
  const { smartAccountAddress } = useSmartAccount()
  
  // Get EOA address - prioritizes external wallet (MetaMask) over embedded wallet
  const eoaAddress = getEOAAddress(wallets)
  
  // WaaP email (MetaMask / external wallet users enter email during onboarding instead)
  const waapEmail = getWaapAuthEmail(user)

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [walletTimedOut, setWalletTimedOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [profileRailCollapsed, setProfileRailCollapsed] = useState(false)
  const [activeProfileSection, setActiveProfileSection] =
    useState<ProfileSectionId>('perfil-personal')
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<ProfileLoadErrorKind | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    nombre: '',
    apellido: '',
    telefono: '',
    fechaNacimiento: '',
    ciudad: '',
    pais: '',
    bio: '',
    language: 'es',
    languages: ['es'],
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
    scheduledStart: string | null
    paidAt: string | null
  } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [cancelingSession, setCancelingSession] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)

  type PsmMeetingMode = 'secure' | 'open'
  const [psmMeetingMode, setPsmMeetingMode] = useState<PsmMeetingMode>('secure')
  const [copiedOpenLink, setCopiedOpenLink] = useState(false)
  const [enrollments, setEnrollments] = useState<UserEnrollmentItem[]>([])
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false)
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null)
  const [cancelingEnrollmentId, setCancelingEnrollmentId] = useState<string | null>(null)
  const [cancelModalEnrollment, setCancelModalEnrollment] = useState<UserEnrollmentItem | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('psm-meeting-mode')
    if (saved === 'secure' || saved === 'open') {
      setPsmMeetingMode(saved)
    }
    setProfileRailCollapsed(readProfileRailCollapsed())
    const fromHash = readProfileSectionFromHash()
    if (fromHash) setActiveProfileSection(fromHash)
  }, [])

  const handleProfileSectionChange = useCallback((id: ProfileSectionId) => {
    setActiveProfileSection(id)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`)
    }
  }, [])

  const toggleProfileRail = () => {
    setProfileRailCollapsed((prev) => {
      const next = !prev
      writeProfileRailCollapsed(next)
      return next
    })
  }

  useEffect(() => {
    if (ready) {
      setWalletTimedOut(false)
      return
    }
    const timeout = window.setTimeout(
      () => setWalletTimedOut(true),
      PROFILE_WALLET_READY_TIMEOUT_MS
    )
    return () => window.clearTimeout(timeout)
  }, [ready])

  const handlePsmMeetingModeChange = (mode: PsmMeetingMode) => {
    setPsmMeetingMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('psm-meeting-mode', mode)
    }
  }
  
  if (
    !isWalletLinkModeActive() &&
    !isSessionReady &&
    (userData || profileData.nombre)
  ) {
    setUserData(null)
    setProfileData(EMPTY_PROFILE)
    setMatchData(null)
    setActiveSession(null)
    setEnrollments([])
  }

  // Fetch profile data from API — Hub session is canonical; do not look up by email/wallet.
  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      if (!ready) return

      if (!authenticated || sessionState === 'no_wallet') {
        setIsLoading(false)
        setError(null)
        setErrorKind(null)
        return
      }

      if (sessionState === 'loading' || isSigningSession) return

      if (sessionState === 'needs_signature') {
        setErrorKind('unauthorized')
        setError(profileLoadErrorMessage('unauthorized'))
        setIsLoading(false)
        return
      }

      if (!isSessionReady) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setErrorKind(null)

      try {
        const response = await authFetch('/api/profile')
        
        if (!response.ok) {
          if (cancelled) return
          const body = (await response.json().catch(() => ({}))) as { code?: string }
          const kind = classifyProfileLoadError(response.status, body.code)
          if (isWalletLinkModeActive() && userData) {
            setIsLoading(false)
            return
          }
          setErrorKind(kind)
          setError(profileLoadErrorMessage(kind))
          setIsLoading(false)
          return
        }

        const data = await response.json()
        if (cancelled) return

        if (data.profile) {
          const patientLangs = asStringArray(
            (data as { patientProfile?: { languages?: unknown } }).patientProfile?.languages,
          )
          const psmLangs = asStringArray(
            (data as { psmProfile?: { languages?: unknown } }).psmProfile?.languages,
          )
          const clinicalLanguages = patientLangs.length
            ? patientLangs
            : psmLangs.length
              ? psmLangs
              : ['es']

          setProfileData({
            nombre: data.profile.nombre || '',
            apellido: data.profile.apellido || '',
            telefono: data.profile.telefono || '',
            fechaNacimiento: data.profile.fechaNacimiento ? new Date(data.profile.fechaNacimiento).toISOString().split('T')[0] : '',
            ciudad: data.profile.ciudad || '',
            pais: data.profile.pais || '',
            bio: data.profile.bio || '',
            language: data.profile.language || 'es',
            languages: clinicalLanguages,
            avatarUrl: data.profile.avatarUrl || ''
          })
        } else if (data.profileIncomplete) {
          setErrorKind('generic')
          setError('Tu perfil básico está incompleto. Por favor completa tus datos personales.')
        }

        if (data.user) {
          setUserData(data.user)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setErrorKind('generic')
        setError(err instanceof Error ? err.message : profileLoadErrorMessage('generic'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchProfile()
    return () => {
      cancelled = true
    }
  }, [ready, authenticated, isSessionReady, sessionState, isSigningSession, eoaAddress])

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
              externalUrl: data.activeSession.externalUrl,
              scheduledStart: data.activeSession.scheduledStart,
              paidAt: data.activeSession.paidAt,
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

  useEffect(() => {
    if (!userData?.id || userData.role !== 'usuario') return
    const checkoutId = new URLSearchParams(window.location.search).get('therapy_checkout')
    if (!checkoutId) return

    let cancelled = false
    const confirmPayment = async () => {
      const res = await authFetch('/api/stripe/therapy/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutSessionId: checkoutId }),
      })
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setSessionNotice(data.error || 'No pudimos confirmar el pago.')
        return
      }
      setSessionNotice('Pago recibido. La cita quedó reservada.')
      const sessionRes = await fetch(`/api/sessions?userId=${userData.id}`)
      if (!sessionRes.ok || cancelled) return
      const sessionData = await sessionRes.json()
      if (sessionData.activeSession) {
        setActiveSession({
          id: sessionData.activeSession.id,
          status: sessionData.activeSession.status,
          externalUrl: sessionData.activeSession.externalUrl,
          scheduledStart: sessionData.activeSession.scheduledStart,
          paidAt: sessionData.activeSession.paidAt,
        })
      }
    }

    void confirmPayment()
    return () => {
      cancelled = true
    }
  }, [userData?.id, userData?.role])

  const cancelActiveSession = async () => {
    if (!activeSession) return
    const startsAt = activeSession.scheduledStart ? new Date(activeSession.scheduledStart).getTime() : null
    const refundable = Boolean(activeSession.paidAt && startsAt && startsAt - Date.now() >= 48 * 60 * 60 * 1000)
    const message = !activeSession.paidAt
      ? 'Se cancela la cita.'
      : refundable
        ? 'Se cancela la cita y Stripe devuelve el pago.'
        : 'Faltan menos de 48 horas. Se cancela la cita y el profesional conserva el pago.'
    if (!window.confirm(message)) return

    setCancelingSession(true)
    setSessionNotice(null)
    try {
      const res = await authFetch(`/api/sessions/${activeSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo cancelar')
      setActiveSession(null)
      setSessionNotice(data.refunded ? 'Cita cancelada. El pago se devolvió.' : 'Cita cancelada. El pago se conserva.')
    } catch (err) {
      setSessionNotice(err instanceof Error ? err.message : 'No se pudo cancelar')
    } finally {
      setCancelingSession(false)
    }
  }

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!userData?.id) return

      setIsLoadingEnrollments(true)
      try {
        const response = await authFetch(`/api/enrollments?userId=${encodeURIComponent(userData.id)}`)
        if (!response.ok) return
        const body = (await response.json()) as { enrollments?: UserEnrollmentItem[] }
        setEnrollments(Array.isArray(body.enrollments) ? body.enrollments : [])
      } catch (fetchError) {
        console.error('Error fetching enrollments for profile:', fetchError)
      } finally {
        setIsLoadingEnrollments(false)
      }
    }

    void fetchEnrollments()
  }, [userData?.id])

  const monthlyMemberships = enrollments.filter(
    (enrollment) =>
      enrollment.course?.billingInterval === 'monthly' &&
      Boolean(enrollment.stripeSubscriptionId || enrollment.purchasedAt)
  )

  const handleCancelMembership = async (enrollment: UserEnrollmentItem) => {
    if (!userData?.id) return
    if (!enrollment.stripeSubscriptionId) {
      setSubscriptionNotice('Esta membresía aún no tiene una suscripción de Stripe enlazada.')
      return
    }

    setSubscriptionNotice(null)
    setCancelingEnrollmentId(enrollment.id)
    try {
      const response = await authFetch('/api/stripe/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          enrollmentId: enrollment.id,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string }
      if (!response.ok) {
        throw new Error(body.error || 'No se pudo cancelar la membresía')
      }

      setSubscriptionNotice(body.message || 'Tu membresía se cancelará al final del periodo actual.')
      const refreshed = await authFetch(`/api/enrollments?userId=${encodeURIComponent(userData.id)}`)
      if (refreshed.ok) {
        const refreshedBody = (await refreshed.json()) as { enrollments?: UserEnrollmentItem[] }
        setEnrollments(Array.isArray(refreshedBody.enrollments) ? refreshedBody.enrollments : [])
      }
    } catch (cancelError) {
      setSubscriptionNotice(
        cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar la membresía'
      )
    } finally {
      setCancelingEnrollmentId(null)
      setCancelModalEnrollment(null)
    }
  }

  const handleSave = async () => {
    if (!userData?.id) {
      setError('No se puede guardar: ID de usuario no disponible')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await authFetch('/api/profile', {
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

  const handleLanguagesChange = (languages: string[]) => {
    setProfileData((prev) => ({ ...prev, languages }))
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

  const linkingWallet = isWalletLinkModeActive()
  const accessGate = linkingWallet && isSessionReady
    ? 'ready'
    : resolveProfileAccessGate({
        walletReady: ready,
        walletAuthenticated: authenticated,
        walletTimedOut,
        sessionState,
        signing: isSigningSession,
        profileLoading: isLoading,
        error: linkingWallet ? null : error,
        hasProfileName: Boolean(profileData.nombre),
      })

  if (accessGate !== 'ready') {
    return (
      <>
        <ProfileAccessGate
          kind={accessGate}
          errorMessage={error}
          errorKind={errorKind}
          onLogin={() => {
            if (authenticated) {
              void signInSiwe()
              return
            }
            void login()
          }}
          onRetry={() => {
            setError(null)
            setErrorKind(null)
            setIsLoading(true)
            void refreshSession()
          }}
        />
      </>
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
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  En móvil, desliza las pestañas de sección; en escritorio, usa el menú izquierdo
                </p>
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

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
              <div className="max-lg:max-w-sm max-lg:mx-auto max-lg:w-full">
                <ProfileSidebarCard
                  collapsed={profileRailCollapsed}
                  onToggleCollapsed={toggleProfileRail}
                  displayName={displayName}
                  roleLabel={String(userData?.role || role)}
                  avatarUrl={profileData.avatarUrl}
                  isEditing={isEditing}
                  isUploadingAvatar={isUploadingAvatar}
                  onAvatarClick={handleAvatarClick}
                />
              </div>
              <ProfileSettingsNav
                layout="sidebar"
                role={userData?.role}
                activeId={activeProfileSection}
                onSectionChange={handleProfileSectionChange}
                className="hidden lg:flex flex-1 min-h-0"
              />
            </aside>

            <div className="flex-1 min-w-0 w-full" role="region" aria-live="polite">
              <ProfileSettingsNav
                layout="scroll"
                role={userData?.role}
                activeId={activeProfileSection}
                onSectionChange={handleProfileSectionChange}
                className="lg:hidden"
              />
              <ProfileSectionHeader sectionId={activeProfileSection} />

              {activeProfileSection === 'perfil-cuenta' && authenticated && userData && (
                <div className="space-y-6">
                  <MotusAccountCard
                    userId={userData.id}
                    email={userData.email || waapEmail}
                    role={userData.role}
                    displayName={displayName !== 'Usuario MotusDAO' ? displayName : undefined}
                    onEditPersonalData={() => {
                      handleProfileSectionChange('perfil-personal')
                      setIsEditing(true)
                    }}
                  />
                  <GlassCard className="p-6 border border-white/15">
                    <MatrixColorSelector />
                  </GlassCard>
                </div>
              )}

              {activeProfileSection === 'perfil-personal' && (
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
                        value={userData?.email || waapEmail || ''}
                        disabled={true}
                        className="w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent disabled:opacity-50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {waapEmail
                          ? 'Correo verificado por tu proveedor de wallet'
                          : 'Correo registrado en MotusDAO (requerido con MetaMask u otras wallets externas)'}
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

                    <ProfileLanguagesSelector
                      value={profileData.languages}
                      onChange={handleLanguagesChange}
                      disabled={!isEditing}
                    />

                    <div>
                      <label className="block text-sm font-medium mb-2">Idioma de la interfaz</label>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Distinto de los idiomas en los que te comunicas (arriba).
                      </p>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
              )}

              {activeProfileSection === 'perfil-wallets' && <LinkedWalletsPanel />}

              {activeProfileSection === 'perfil-motus' && (
                <MotusNamesPanel
                  accountMotusName={userData?.motusName}
                  accountPrimaryEoa={userData?.eoaAddress}
                  smartWalletAddress={userData?.smartWalletAddress ?? smartAccountAddress ?? undefined}
                />
              )}

              {activeProfileSection === 'perfil-saldos' && <WalletBalancesCard />}

              {activeProfileSection === 'perfil-spei' &&
                (userData?.role === 'usuario' || userData?.role === 'psm') && <SpeiPaymentCard />}

              {activeProfileSection === 'perfil-stripe' && userData?.role === 'psm' && (
                <div className="space-y-6">
                  <StripeConnectCard />
                  <StripeEarningsCard />
                </div>
              )}

              {activeProfileSection === 'perfil-terapia' &&
                (userData?.role === 'usuario' || userData?.role === 'psm') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
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

                              <div className="pt-3 border-t border-white/5">
                                <p className="text-sm font-semibold mb-1">Resumen para tu profesional</p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Comparte un texto breve (no bitácora ni Psychat completos). Tu psicólogo/a
                                  emparejado lo lee aquí en el Hub.
                                </p>
                                <CTAButton asChild size="sm" variant="secondary">
                                  <Link href="/compartir-resumen">Compartir resumen</Link>
                                </CTAButton>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/5">
                                <div>
                                  <p className="text-sm font-semibold mb-1">Sesión de terapia</p>
                                  {isLoadingSession ? (
                                    <p className="text-xs text-muted-foreground">
                                      Cargando información de tu sesión...
                                    </p>
                                  ) : activeSession ? (
                                    <div className="space-y-2">
                                      <p className="text-xs text-green-400">
                                        Tienes una sesión {activeSession.status === 'accepted' ? 'aceptada' : 'solicitada'} programada.
                                      </p>
                                      {sessionNotice && <p className="text-xs text-muted-foreground">{sessionNotice}</p>}
                                      <button
                                        type="button"
                                        onClick={cancelActiveSession}
                                        disabled={cancelingSession}
                                        className="text-xs text-red-400 underline-offset-2 hover:underline disabled:opacity-50"
                                      >
                                        {cancelingSession ? 'Cancelando...' : 'Cancelar cita'}
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Puedes solicitar una cita desde Psychat; el consultorio sigue siendo el mismo.
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
                                <PatientSharedSummariesPanel
                                  patientUserId={match.user.id}
                                  patientName={`${match.user.nombre ?? ''} ${match.user.apellido ?? ''}`.trim()}
                                />
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

              {activeProfileSection === 'perfil-membresias' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.45 }}
              >
                <GlassCard className="p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <CreditCard className="w-6 h-6 mr-3 text-mauve-500" />
                    Membresías activas
                  </h3>

                  {subscriptionNotice && (
                    <p className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                      {subscriptionNotice}
                    </p>
                  )}

                  {isLoadingEnrollments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-mauve-500" />
                    </div>
                  ) : monthlyMemberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tienes membresías mensuales activas o históricas.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {monthlyMemberships.map((enrollment) => {
                        const active = Boolean(enrollment.paid)
                        const cancellationScheduled = enrollment.cancelAtPeriodEnd === true
                        return (
                          <div
                            key={enrollment.id}
                            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold">
                                {enrollment.course?.title || 'Curso'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Estado: {active ? 'Activa' : 'Inactiva'}
                                {enrollment.accessExpiresAt
                                  ? ` · acceso hasta ${new Date(enrollment.accessExpiresAt).toLocaleDateString('es-MX')}`
                                  : ''}
                              </p>
                              {cancellationScheduled && (
                                <p className="mt-1 text-xs text-amber-300">
                                  Cancelación programada al final del periodo
                                </p>
                              )}
                            </div>
                            {active ? (
                              <CTAButton
                                size="sm"
                                variant="secondary"
                                onClick={() => setCancelModalEnrollment(enrollment)}
                                disabled={cancelingEnrollmentId === enrollment.id || cancellationScheduled}
                              >
                                {cancellationScheduled
                                  ? 'Cancelación programada'
                                  : cancelingEnrollmentId === enrollment.id
                                  ? 'Cancelando...'
                                  : 'Cancelar membresía'}
                              </CTAButton>
                            ) : (
                              <CTAButton
                                size="sm"
                                onClick={() =>
                                  window.location.assign(
                                    enrollment.course?.slug
                                      ? `/academia/${enrollment.course.slug}`
                                      : '/academia'
                                  )
                                }
                              >
                                Renovar membresía
                              </CTAButton>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
              )}

              {activeProfileSection === 'perfil-preferencias' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <GlassCard className="p-8">
                  <h3 className="text-2xl font-bold mb-2 flex items-center">
                    <Settings className="w-6 h-6 mr-3 text-mauve-500" />
                    Preferencias
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Ajustes generales del Hub. Algunos enlaces llevan a políticas públicas; el cambio
                    de rol requiere soporte hasta que esté automatizado.
                  </p>

                  <div className="space-y-4">
                    {PROFILE_PREFERENCE_ITEMS.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 glass-card rounded-lg"
                      >
                        <div className="max-w-xl">
                          <h4 className="font-semibold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        {item.id === 'rol' ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm capitalize">{userData?.role || role}</span>
                            <CTAButton variant="secondary" size="sm" disabled title="Próximamente">
                              Cambiar
                            </CTAButton>
                          </div>
                        ) : item.id === 'privacidad' ? (
                          <CTAButton variant="secondary" size="sm" asChild className="shrink-0">
                            <Link href="/privacy">
                              <Shield className="w-4 h-4 mr-2" />
                              Ver políticas
                            </Link>
                          </CTAButton>
                        ) : (
                          <CTAButton variant="secondary" size="sm" disabled title="Próximamente" className="shrink-0">
                            Configurar
                          </CTAButton>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {cancelModalEnrollment && (
        <FeedbackDialog
          overlay
          variant="warning"
          icon={AlertTriangle}
          title="Cancelar membresía"
          description="La cancelación aplica al final del periodo actual. Mantendrás acceso hasta la fecha de expiración indicada."
          onClose={() => setCancelModalEnrollment(null)}
          secondaryAction={{
            label: 'Conservar membresía',
            onClick: () => setCancelModalEnrollment(null),
          }}
          primaryAction={{
            label:
              cancelModalEnrollment.cancelAtPeriodEnd === true
                ? 'Cancelación ya programada'
                : 'Confirmar cancelación',
            onClick: () => handleCancelMembership(cancelModalEnrollment),
            loading: cancelingEnrollmentId === cancelModalEnrollment.id,
            disabled:
              cancelingEnrollmentId === cancelModalEnrollment.id ||
              cancelModalEnrollment.cancelAtPeriodEnd === true,
          }}
        >
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <p className="font-medium">{cancelModalEnrollment.course?.title || 'Curso'}</p>
            {cancelModalEnrollment.cancelAtPeriodEnd && (
              <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Esta membresía ya tiene cancelación programada.
              </p>
            )}
          </div>
        </FeedbackDialog>
      )}
    </div>
  )
}
