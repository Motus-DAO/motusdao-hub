'use client'

import { AnimatedAIChat } from '@/components/ui/animated-ai-chat'
import { useUIStore } from '@/lib/store'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { buildVideochatUrl } from '@/lib/jitsi'

export default function MotusAIPage() {
  const { role, theme } = useUIStore()
  const isLight = theme === 'light'
  const { user, authenticated, ready } = useWaaP()
  const router = useRouter()
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const handleRequestHumanSession = async () => {
    try {
      setSessionError(null)

      if (!ready || !authenticated) {
        setSessionError('Necesitas iniciar sesión para hablar con un terapeuta humano.')
        return
      }

      const userEmail = user?.email?.address || user?.google?.email
      const privyId = user?.id

      if (!userEmail && !privyId) {
        setSessionError('No se pudo identificar tu usuario. Intenta desde la página de perfil.')
        return
      }

      setIsCreatingSession(true)

      const params = new URLSearchParams()
      if (privyId) params.append('privyId', privyId)
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
          />
        </div>
      </div>
    </div>
  )
}
