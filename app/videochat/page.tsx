'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Section } from '@/components/ui/Section'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { Video, RefreshCcw, Shield, Link2, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  buildVideochatUrl,
  getJitsiDomain,
  getJitsiProtocol,
  normalizeJitsiHost,
  parseMatchIdFromOfficeRoom,
  parsePsmIdFromOpenRoom,
} from '@/lib/jitsi'
import { fetchAppSession, authFetch } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWallet } from '@/lib/wallet'

type JitsiInitOptions = {
  roomName?: string
  room?: string
  url?: string
  parentNode: HTMLElement
  width?: string | number
  height?: string | number
  jwt?: string
  serverURL?: string
  protocol?: string
  scheme?: string
  configOverwrite?: Record<string, unknown>
  interfaceConfigOverwrite?: Record<string, unknown>
}

type JitsiExternalAPI = {
  dispose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, callback: (...args: any[]) => void) => void
  // We only use a tiny subset of the API in this page; the rest is left as unknown
  [key: string]: unknown
}

type JitsiExternalAPIConstructor = new (
  domainOrUrl: string,
  options: JitsiInitOptions,
) => JitsiExternalAPI

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiExternalAPIConstructor
  }
}

const JITSI_DEFAULT_DOMAIN = getJitsiDomain()

const getJitsiProtocolForDomain = (domain: string) => getJitsiProtocol(domain)

function getMeetingModeLabel(roomName: string): string | null {
  if (parseMatchIdFromOfficeRoom(roomName)) {
    return 'Consultorio seguro — solo paciente emparejado y profesional'
  }
  if (parsePsmIdFromOpenRoom(roomName)) {
    return 'Enlace abierto — invitados con cuenta Hub (el profesional admite desde recepción)'
  }
  return null
}

function getMeetingModeFromRoom(roomName: string): 'secure' | 'open' | null {
  if (parsePsmIdFromOpenRoom(roomName)) return 'open'
  if (parseMatchIdFromOfficeRoom(roomName)) return 'secure'
  return null
}

function getHubLoginHint(roomName: string): string {
  if (parsePsmIdFromOpenRoom(roomName)) {
    return 'Este enlace es para invitados con cuenta en MotusDAO Hub. Tras iniciar sesión entrarás a la sala de espera y el profesional te admitirá.'
  }
  if (parseMatchIdFromOfficeRoom(roomName)) {
    return 'Este consultorio es solo para el paciente emparejado y su profesional. Inicia sesión con la cuenta vinculada al emparejamiento.'
  }
  return 'Inicia sesión en MotusDAO Hub para obtener acceso seguro a esta sala.'
}

function VideochatInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, ready: waapReady } = useWallet()
  const { sessionState, signIn, signing, signError, isSessionReady } = useSiweSession()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<JitsiExternalAPI | null>(null)
  const endingRef = useRef(false)
  const [isJitsiReady, setIsJitsiReady] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [joinKey, setJoinKey] = useState(0)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [roomInfo, setRoomInfo] = useState<{ domain: string; roomName: string } | null>(null)
  const [jwtToken, setJwtToken] = useState<string | null>(null)
  const [isModerator, setIsModerator] = useState(false)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isPsm, setIsPsm] = useState(false)
  const [psmOpenUrl, setPsmOpenUrl] = useState<string | null>(null)
  const [psmDefaultOfficeUrl, setPsmDefaultOfficeUrl] = useState<string | null>(null)
  const [psmMeetingMode, setPsmMeetingMode] = useState<'secure' | 'open'>('secure')
  const [psmRoomsLoaded, setPsmRoomsLoaded] = useState(false)
  const [needsHubLogin, setNeedsHubLogin] = useState(false)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestError, setGuestError] = useState<string | null>(null)
  const [isGuestSession, setIsGuestSession] = useState(false)

  // Resolver dominio y roomName sólo en el cliente para evitar mismatches de SSR
  useEffect(() => {
    const roomFromQuery = searchParams.get('room') || undefined
    const urlFromQuery = searchParams.get('url') || undefined

    // Si llega una URL completa de Jitsi (por ejemplo desde /api/sessions.externalUrl), la usamos tal cual
    // si no, construimos un roomName contra el dominio configurado
    if (urlFromQuery) {
      try {
        const parsed = new URL(urlFromQuery)
        const roomName = parsed.pathname.replace(/^\//, '')
        if (roomName) {
          setRoomInfo({ domain: parsed.host, roomName })
        } else {
          setRoomInfo(null)
        }
        return
      } catch {
        if (roomFromQuery) {
          setRoomInfo({ domain: JITSI_DEFAULT_DOMAIN, roomName: roomFromQuery })
        } else {
          setRoomInfo(null)
        }
        return
      }
    }

    if (!psmRoomsLoaded) return
    // PSM rooms are set via redirect to ?url=...
    if (isPsm) return

    if (roomFromQuery) {
      setRoomInfo({ domain: JITSI_DEFAULT_DOMAIN, roomName: roomFromQuery })
    } else {
      setRoomInfo(null)
    }
  }, [searchParams, isPsm, psmRoomsLoaded])

  // PSM: load open + secure room URLs
  useEffect(() => {
    const loadPsmRooms = async () => {
      try {
        const appSession = await fetchAppSession()
        if (appSession.role !== 'psm' || !appSession.userId) {
          setIsPsm(false)
          setPsmRoomsLoaded(true)
          return
        }

        setIsPsm(true)
        const saved = window.localStorage.getItem('psm-meeting-mode')
        if (saved === 'secure' || saved === 'open') {
          setPsmMeetingMode(saved)
        }

        const response = await fetch(`/api/matching/psm/${appSession.userId}`)
        if (response.ok) {
          const data = await response.json()
          setPsmOpenUrl(data.openGuestUrl ?? null)
          setPsmDefaultOfficeUrl(data.activeMatches?.[0]?.officeUrl ?? null)
        }
      } catch (error) {
        console.error('Error loading PSM rooms:', error)
      } finally {
        setPsmRoomsLoaded(true)
      }
    }

    loadPsmRooms()
  }, [])

  // PSM without ?url=: redirect to saved mode room instead of random fallback
  useEffect(() => {
    if (!isPsm || !psmRoomsLoaded) return
    if (searchParams.get('url')) return

    const saved = window.localStorage.getItem('psm-meeting-mode')
    const mode: 'secure' | 'open' = saved === 'open' ? 'open' : 'secure'
    const target =
      mode === 'open' ? psmOpenUrl : psmDefaultOfficeUrl ?? psmOpenUrl

    if (target) {
      router.replace(buildVideochatUrl(target))
    }
  }, [isPsm, psmRoomsLoaded, psmOpenUrl, psmDefaultOfficeUrl, searchParams, router])

  // Sync toggle highlight with current room
  useEffect(() => {
    if (!roomInfo) return
    const mode = getMeetingModeFromRoom(roomInfo.roomName)
    if (mode) setPsmMeetingMode(mode)
  }, [roomInfo])

  const handlePsmModeChange = (mode: 'secure' | 'open') => {
    window.localStorage.setItem('psm-meeting-mode', mode)
    setPsmMeetingMode(mode)

    const target =
      mode === 'open' ? psmOpenUrl : psmDefaultOfficeUrl

    if (target) {
      router.push(buildVideochatUrl(target))
    }
  }

  // Fallback: si el script carga pero onReady no se dispara por alguna razón,
  // revisamos periódicamente si window.JitsiMeetExternalAPI existe
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkLibrary = () => {
      if (window.JitsiMeetExternalAPI && !isJitsiReady) {
        setIsJitsiReady(true)
      }
    }

    const interval = setInterval(checkLibrary, 500)
    checkLibrary()

    return () => clearInterval(interval)
  }, [isJitsiReady])

  // Fetch JWT token when Hub session is ready (skip for guest sessions)
  useEffect(() => {
    if (!roomInfo || isGuestSession) return
    if (!isSessionReady) {
      setNeedsHubLogin(true)
      setJwtToken(null)
      setIsModerator(false)
      setIsLoadingToken(false)
      setTokenError(null)
      return
    }

    const fetchJwtToken = async () => {
      setIsLoadingToken(true)
      setTokenError(null)
      setNeedsHubLogin(false)
      try {
        const appSession = await fetchAppSession()
        if (!appSession.authenticated) {
          setNeedsHubLogin(true)
          setJwtToken(null)
          setIsModerator(false)
          return
        }

        const response = await authFetch('/api/jitsi/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: roomInfo.roomName,
            userId: appSession.userId ?? undefined,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.token) {
            setJwtToken(data.token)
            setIsModerator(data.moderator === true)
            setTokenError(null)
            setNeedsHubLogin(false)
            return
          }
        }

        const errorData = await response.json().catch(() => ({}))
        const message =
          errorData.error ||
          'No se pudo obtener acceso a la sala.'
        setJwtToken(null)
        setIsModerator(false)
        setTokenError(message)
        if (response.status === 401) {
          setNeedsHubLogin(true)
        }
      } catch (error) {
        console.error('Error fetching JWT token:', error)
        setJwtToken(null)
        setIsModerator(false)
        setTokenError('Error de red al solicitar acceso a la sala.')
      } finally {
        setIsLoadingToken(false)
      }
    }

    fetchJwtToken()
  }, [roomInfo, isSessionReady, isGuestSession])

  const handleJoinAsGuest = async () => {
    if (!roomInfo) return
    const cleanName = guestName.trim()
    if (cleanName.length < 2) {
      setGuestError('Ingresa un nombre para mostrar (mínimo 2 caracteres).')
      return
    }

    setIsLoadingToken(true)
    setGuestError(null)
    try {
      const response = await fetch('/api/jitsi/guest-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomInfo.roomName,
          displayName: cleanName,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.token) {
        setGuestError(data.error || 'No se pudo entrar como invitado.')
        return
      }

      setJwtToken(data.token)
      setIsModerator(false)
      setIsGuestSession(true)
      setNeedsHubLogin(false)
      setShowGuestForm(false)
      setTokenError(null)
    } catch {
      setGuestError('Error de red al solicitar acceso de invitado.')
    } finally {
      setIsLoadingToken(false)
    }
  }

  const isOpenRoom =
    roomInfo !== null && parsePsmIdFromOpenRoom(roomInfo.roomName) !== null

  const endCall = useCallback(() => {
    if (endingRef.current) return
    endingRef.current = true
    apiRef.current?.dispose()
    apiRef.current = null
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    setCallEnded(true)
  }, [])

  const fetchGuestToken = useCallback(
    async (name: string) => {
      if (!roomInfo) return false
      const response = await fetch('/api/jitsi/guest-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomInfo.roomName,
          displayName: name,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.token) return false
      setJwtToken(data.token)
      setIsModerator(false)
      setTokenError(null)
      return true
    },
    [roomInfo],
  )

  const handleRejoin = useCallback(async () => {
    endingRef.current = false
    setCallEnded(false)
    if (isGuestSession && roomInfo && guestName.trim().length >= 2) {
      setIsLoadingToken(true)
      try {
        await fetchGuestToken(guestName.trim())
      } finally {
        setIsLoadingToken(false)
      }
    }
    setJoinKey((k) => k + 1)
  }, [isGuestSession, roomInfo, guestName, fetchGuestToken])

  useEffect(() => {
    if (callEnded) return
    if (!isJitsiReady) return
    if (!roomInfo) return
    if (!containerRef.current) return
    if (!window.JitsiMeetExternalAPI) return
    if (isLoadingToken) return

    if (roomInfo.domain.includes('ngrok')) {
      return
    }

    if (apiRef.current) {
      apiRef.current.dispose()
      apiRef.current = null
    }

    const jitsiDomain = normalizeJitsiHost(roomInfo.domain)

    const isSelfHosted = !jitsiDomain.includes('meet.jit.si')
    if (isSelfHosted && !jwtToken) {
      return
    }

    const options: JitsiInitOptions = {
      roomName: roomInfo.roomName,
      parentNode: containerRef.current,
      width: '100%',
      height: '100%',
      ...(jwtToken && { jwt: jwtToken }),
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false,
        maxDuration: 0,
        disableDeepLinking: true,
        ...(!isModerator && {
          enableLobby: true,
          lobby: { autoKnock: true },
        }),
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DISABLE_VIDEO_BACKGROUND: true,
        DEFAULT_LANGUAGE: 'es',
        APP_NAME: 'MotusDAO Consultorio',
      },
    }

    let instance: JitsiExternalAPI | null = null

    try {
      instance = new window.JitsiMeetExternalAPI(jitsiDomain, options)
      apiRef.current = instance

      instance.on('videoConferenceJoined', () => {
        setScriptError(null)
      })

      instance.on('authFailed', () => {
        setScriptError(
          'Error de autenticación. Verifica que JITSI_APP_SECRET coincida con JWT_APP_SECRET del servidor.',
        )
      })

      instance.on('readyToClose', endCall)
      instance.on('videoConferenceLeft', endCall)

      instance.on('errorOccurred', (error: { error?: string; message?: string } | string) => {
        const errorMessage =
          typeof error === 'string'
            ? error
            : error?.error || error?.message || 'Error desconocido'
        setScriptError(`Error en Jitsi: ${errorMessage}`)
      })
    } catch (error) {
      setScriptError(
        `Error al inicializar Jitsi: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      )
    }

    return () => {
      if (instance) {
        instance.dispose()
        if (apiRef.current === instance) {
          apiRef.current = null
        }
      }
    }
  }, [
    isJitsiReady,
    roomInfo,
    jwtToken,
    isLoadingToken,
    isModerator,
    callEnded,
    joinKey,
    endCall,
  ])

  return (
    <>
      <Script
        src={(() => {
          // Build script URL properly
          const protocol = getJitsiProtocolForDomain(JITSI_DEFAULT_DOMAIN)
          const domain = JITSI_DEFAULT_DOMAIN.includes('://') 
            ? new URL(JITSI_DEFAULT_DOMAIN).host 
            : JITSI_DEFAULT_DOMAIN
          const scriptUrl = `${protocol}://${domain}/external_api.js`
          console.log('📜 Loading Jitsi script from:', scriptUrl)
          return scriptUrl
        })()}
        strategy="afterInteractive"
        onReady={() => setIsJitsiReady(true)}
        onError={(e) => {
          const errorMsg = e instanceof Error ? e.message : String(e) || 'Error desconocido'
          const protocol = getJitsiProtocolForDomain(JITSI_DEFAULT_DOMAIN)
          const domain = JITSI_DEFAULT_DOMAIN.includes('://') 
            ? new URL(JITSI_DEFAULT_DOMAIN).host 
            : JITSI_DEFAULT_DOMAIN
          const scriptUrl = `${protocol}://${domain}/external_api.js`
          console.error('Error cargando Jitsi external_api.js:', {
            error: errorMsg,
            domain,
            protocol,
            url: scriptUrl,
          })
          setScriptError(`No se pudo cargar la librería de Jitsi desde ${domain}. Verifica que el servidor esté corriendo.`)
        }}
      />

      <Section className="max-w-6xl mx-auto">
        <div className="mb-8">
          <GradientText as="h1" className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Video className="w-8 h-8" />
            Sala de Videochat
          </GradientText>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Espacio seguro para sesiones entre usuarios y profesionales de la salud mental.
            Puedes compartir esta URL con tu terapeuta o paciente para entrar a la misma sala.
          </p>
        </div>

        <GlassCard className="p-4 md:p-6 h-[70vh] flex flex-col gap-4">
          {isPsm && roomInfo && (
            <div
              className={`rounded-lg px-4 py-2 text-xs border ${
                psmMeetingMode === 'open'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : 'border-green-500/30 bg-green-500/10 text-green-100'
              }`}
            >
              {psmMeetingMode === 'open' ? (
                <>
                  <span className="font-semibold">Modo enlace abierto.</span> Invitados con cuenta Hub pueden unirse; tú admites desde la recepción.
                </>
              ) : (
                <>
                  <span className="font-semibold">Modo consultorio seguro.</span> Solo tu paciente emparejado puede entrar a esta sala.
                </>
              )}
            </div>
          )}
          {roomInfo && getMeetingModeLabel(roomInfo.roomName) && !isPsm && (
            <div
              className={`rounded-lg px-4 py-2 text-xs border ${
                parsePsmIdFromOpenRoom(roomInfo.roomName)
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : 'border-green-500/30 bg-green-500/10 text-green-100'
              }`}
            >
              {getMeetingModeLabel(roomInfo.roomName)}
              {!isModerator && !isLoadingToken && jwtToken && (
                <span className="block mt-1 text-muted-foreground">
                  Estás en la sala de espera. El profesional te admitirá en breve.
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Sala actual:</span>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {roomInfo ? `${roomInfo.domain}/${roomInfo.roomName}` : 'Resolviendo sala...'}
                </code>
              </div>
              <div className="mt-1 text-xs">
                Si tu sesión viene desde el flujo de emparejamiento, esta sala puede llegar
                como `externalUrl` desde `/api/sessions`.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {isPsm && (
                <div
                  className="flex rounded-lg border border-white/10 p-0.5 bg-black/20"
                  title="Modo de videollamada"
                >
                  <button
                    type="button"
                    onClick={() => handlePsmModeChange('secure')}
                    disabled={!psmDefaultOfficeUrl}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${
                      psmMeetingMode === 'secure'
                        ? 'bg-green-500/25 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Seguro
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePsmModeChange('open')}
                    disabled={!psmOpenUrl}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${
                      psmMeetingMode === 'open'
                        ? 'bg-amber-500/25 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Abierto
                  </button>
                </div>
              )}
              <CTAButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (typeof window !== 'undefined' && roomInfo) {
                    const domain = normalizeJitsiHost(roomInfo.domain)
                    const protocol = getJitsiProtocolForDomain(domain)
                    const jitsiUrl = `${protocol}://${domain}/${roomInfo.roomName}`
                    const shareUrl = `${window.location.origin}${buildVideochatUrl(jitsiUrl)}`
                    window.navigator.clipboard?.writeText(shareUrl).catch(() => {})
                  }
                }}
              >
                Copiar link de sala
              </CTAButton>
              {!roomInfo?.domain.includes('ngrok') && roomInfo && (
                <CTAButton
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRejoin()}
                >
                  <RefreshCcw className="w-4 h-4 mr-1" />
                  Recargar
                </CTAButton>
              )}
            </div>
          </div>

          {/* Si es ngrok, mostrar pantalla especial en lugar del iframe */}
          {!roomInfo && psmRoomsLoaded && !isPsm ? (
            <div className="relative flex-1 rounded-xl overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90 border border-border/50 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <Video className="w-12 h-12 text-muted-foreground" />
              <p className="text-foreground font-medium">Sin sala activa</p>
              <p className="text-muted-foreground text-sm max-w-md">
                Abre un enlace desde tu Perfil o la invitación de tu profesional para unirte a un consultorio.
              </p>
              <CTAButton variant="secondary" onClick={() => router.push('/perfil')}>
                Ir a Perfil
              </CTAButton>
            </div>
          ) : roomInfo?.domain.includes('ngrok') ? (
            <div className="relative flex-1 rounded-xl overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90 border border-border/50 flex flex-col items-center justify-center gap-6 p-8">
              <div className="text-center space-y-4 max-w-md">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Sala de Videochat Lista</h3>
                <p className="text-muted-foreground">
                  Tu sala de video está configurada y lista para usar. Haz clic en el botón de abajo para abrir Jitsi Meet en una nueva ventana.
                </p>
                <div className="pt-4">
                  <CTAButton
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto min-w-[200px]"
                    onClick={() => {
                      if (typeof window !== 'undefined' && roomInfo) {
                        const domain = normalizeJitsiHost(roomInfo.domain)
                        const protocol = getJitsiProtocolForDomain(domain)
                        const url = `${protocol}://${domain}/${roomInfo.roomName}${jwtToken ? `?jwt=${jwtToken}` : ''}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }
                    }}
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Abrir Sala de Video
                  </CTAButton>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  La sala se abrirá en una nueva ventana para una mejor experiencia
                </p>
              </div>
            </div>
          ) : roomInfo ? (
            <div className="relative flex-1 rounded-xl overflow-hidden bg-black">
              {callEnded ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-gradient-to-br from-background via-background/95 to-background/90">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mauve-500/10">
                    <CheckCircle className="w-8 h-8 text-mauve-400" />
                  </div>
                  <GradientText as="h2" className="text-2xl font-semibold">
                    Sesión finalizada
                  </GradientText>
                  <p className="text-muted-foreground text-sm max-w-md">
                    La videollamada ha terminado. Puedes volver a entrar a la sala o ir a tu perfil.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <CTAButton onClick={() => void handleRejoin()}>
                      Volver a la sala
                    </CTAButton>
                    {!isGuestSession && (
                      <CTAButton variant="ghost" onClick={() => router.push('/perfil')}>
                        Ir a Perfil
                      </CTAButton>
                    )}
                  </div>
                </div>
              ) : (
                <>
              {(!isJitsiReady || isLoadingToken) && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
                  {tokenError || scriptError || (isLoadingToken ? 'Configurando sala segura...' : 'Cargando componente de video...')}
                </div>
              )}
              {needsHubLogin && !isLoadingToken && !jwtToken && roomInfo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-sm px-6 text-center z-10 bg-black/90">
                  {!showGuestForm ? (
                    <>
                      <p className="text-foreground font-semibold text-lg">Unirse a la sala</p>
                      <p className="text-muted-foreground max-w-md">
                        {isOpenRoom
                          ? 'Puedes iniciar sesión en MotusDAO Hub o entrar como invitado con solo tu nombre. El profesional te admitirá desde la recepción.'
                          : getHubLoginHint(roomInfo.roomName)}
                      </p>
                      {sessionState === 'no_wallet' && (
                        <CTAButton
                          size="lg"
                          disabled={!waapReady}
                          onClick={() => login()}
                        >
                          Conectar wallet
                        </CTAButton>
                      )}
                      {sessionState === 'needs_signature' && (
                        <CTAButton
                          size="lg"
                          disabled={signing}
                          onClick={() => void signIn()}
                        >
                          {signing ? 'Firmando...' : 'Firmar acceso a la sala'}
                        </CTAButton>
                      )}
                      {signError && (
                        <p className="text-xs text-red-400">{signError}</p>
                      )}
                      {isOpenRoom && (
                        <>
                          <div className="flex items-center gap-3 w-full max-w-xs text-muted-foreground text-xs">
                            <div className="flex-1 h-px bg-white/10" />
                            <span>o</span>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>
                          <CTAButton
                            variant="secondary"
                            size="lg"
                            onClick={() => {
                              setShowGuestForm(true)
                              setGuestError(null)
                            }}
                          >
                            Entrar como invitado
                          </CTAButton>
                        </>
                      )}
                      {!isOpenRoom && (
                        <p className="text-xs text-muted-foreground">
                          También puedes usar «Inicia Sesión» en la barra superior.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-foreground font-semibold text-lg">Entrar como invitado</p>
                      <p className="text-muted-foreground max-w-sm">
                        Tu nombre será visible para el profesional en la sala de espera.
                      </p>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleJoinAsGuest()
                        }}
                        placeholder="Tu nombre"
                        maxLength={48}
                        className="w-full max-w-xs px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-mauve-500/50"
                        autoFocus
                      />
                      {guestError && (
                        <p className="text-xs text-red-400">{guestError}</p>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <CTAButton
                          size="lg"
                          disabled={isLoadingToken}
                          onClick={() => void handleJoinAsGuest()}
                        >
                          {isLoadingToken ? 'Entrando...' : 'Unirse a la sala'}
                        </CTAButton>
                        <CTAButton
                          variant="ghost"
                          size="lg"
                          onClick={() => {
                            setShowGuestForm(false)
                            setGuestError(null)
                          }}
                        >
                          Volver
                        </CTAButton>
                      </div>
                    </>
                  )}
                </div>
              )}
              {tokenError && !isLoadingToken && !jwtToken && !needsHubLogin && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground px-6 text-center z-10 bg-black/80">
                  <p className="text-foreground font-medium">No se pudo acceder a la sala</p>
                  <p>{tokenError}</p>
                  {roomInfo && parsePsmIdFromOpenRoom(roomInfo.roomName) ? (
                    <p className="text-xs">
                      Verifica que el profesional esté en la sala para admitirte desde la recepción.
                    </p>
                  ) : (
                    <p className="text-xs">
                      Consultorio seguro: debes estar emparejado con el profesional de esta sala.
                    </p>
                  )}
                </div>
              )}
              <div ref={containerRef} className="w-full h-full" />
                </>
              )}
            </div>
          ) : (
            <div className="relative flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Resolviendo sala...</p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-muted-foreground">
            Nota: en producción configura tu dominio de Jitsi en{' '}
            <code>NEXT_PUBLIC_JITSI_DOMAIN</code> y un prefijo de sala en{' '}
            <code>NEXT_PUBLIC_JITSI_ROOM_PREFIX</code> para generar rooms más
            predecibles y privados.
          </p>
          )}
        </GlassCard>
      </Section>
    </>
  )
}

export default function VideochatPage() {
  return (
    <Suspense fallback={null}>
      <VideochatInner />
    </Suspense>
  )
}



