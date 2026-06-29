'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Shield,
  Star,
  Video,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { VideoEmbed } from '@/components/ui/VideoEmbed'
import { LATAM_CRISIS_RESOURCES } from '@/lib/crisis-resources'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import type { PublicPsmProfile } from '@/lib/psm/public-profile'
import { TherapistBookingCard } from './TherapistBookingCard'
import { TherapistReviews } from './TherapistReviews'

type Props = {
  slug: string
}

export function TherapistProfileView({ slug }: Props) {
  const [profile, setProfile] = useState<PublicPsmProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllSpecialties, setShowAllSpecialties] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/psm/${slug}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Perfil no encontrado')
        setProfile(data.profile)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar el perfil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mauve-400" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Section>
        <GlassCard className="mx-auto max-w-lg p-8 text-center">
          <p className="text-muted-foreground">{error || 'Perfil no encontrado'}</p>
          <Link href="/psicoterapia" className="mt-4 inline-block text-mauve-400 hover:underline">
            Volver al directorio
          </Link>
        </GlassCard>
      </Section>
    )
  }

  const visibleSpecialties = showAllSpecialties
    ? profile.specialtyLabels
    : profile.specialtyLabels.slice(0, 6)

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6 pb-16">
          <Link
            href="/psicoterapia"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a terapeutas
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {profile.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt={profile.fullName}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-mauve-500 to-iris-500 text-2xl font-bold text-white">
                        {profile.nombre[0]}
                        {profile.apellido[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <GradientText as="h1" className="text-3xl font-bold">
                        {profile.fullName}
                      </GradientText>
                      {profile.tagline && (
                        <p className="mt-2 text-muted-foreground">{profile.tagline}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Terapeuta verificado
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-xs">
                          <Video className="mr-1 h-3 w-3" />
                          Teleterapia
                        </span>
                        {profile.licenseCountryLabel && (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">
                            Licencia: {profile.licenseCountryLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        {profile.reputation.showStars ? (
                          <>
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-medium">{profile.reputation.label}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">{profile.reputation.label}</span>
                        )}
                        <span className="text-muted-foreground">
                          · {profile.reputation.patientCount}{' '}
                          {profile.reputation.patientCount === 1 ? 'paciente' : 'pacientes'}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-mauve-300">
                        ${PLATFORM_SESSION_PRICE_USD} USD / sesión
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {profile.introVideoUrl && (
                <GlassCard className="p-6">
                  <h2 className="mb-4 text-xl font-semibold">Video de presentación</h2>
                  <VideoEmbed url={profile.introVideoUrl} title={`Video de ${profile.fullName}`} />
                </GlassCard>
              )}

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Con qué trabajo</h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {profile.narratives.conQueTrabajo}
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.topSpecialtyLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-mauve-400/40 bg-mauve-500/15 px-3 py-1 text-xs font-medium"
                    >
                      ★ {label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleSpecialties.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {profile.specialtyLabels.length > 6 && (
                  <button
                    type="button"
                    className="mt-3 text-sm text-mauve-400 hover:underline"
                    onClick={() => setShowAllSpecialties((v) => !v)}
                  >
                    {showAllSpecialties ? 'Mostrar menos' : 'Mostrar más'}
                  </button>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Mi enfoque terapéutico</h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {profile.narratives.miEnfoque}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.therapyStyleLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Sobre mí</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.narratives.sobreMi || profile.narratives.conQueTrabajo}
                </p>
                {profile.styleTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.styleTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Qué esperar en tu primera sesión</h2>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>Duración flexible según el horario que elijas</li>
                  <li>Formato: videollamada segura (solo online)</li>
                  <li>Conocernos, entender tu situación y definir objetivos juntos</li>
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {profile.narratives.primeraSesion}
                </p>
              </GlassCard>

              {profile.exclusionCriteriaLabels.length > 0 && (
                <GlassCard className="p-6">
                  <h2 className="mb-3 text-xl font-semibold">No trabajo con</h2>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {profile.exclusionCriteriaLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                  {profile.doesNotWorkWithNote && (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {profile.doesNotWorkWithNote}
                    </p>
                  )}
                </GlassCard>
              )}

              <TherapistReviews slug={slug} initialReputation={profile.reputation} />

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Formación y verificación</h2>
                <p className="text-sm text-muted-foreground">{profile.formacionAcademica}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experiencia</span>
                    <span>
                      {profile.experienciaAnios}{' '}
                      {profile.experienciaAnios === 1 ? 'año' : 'años'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cédula</span>
                    <span>{profile.cedulaProfesionalMasked}</span>
                  </div>
                  {profile.licenseCountryLabel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">País de licencia</span>
                      <span>{profile.licenseCountryLabel}</span>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Shield className="h-5 w-5" />
                  Confianza y emergencias
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Sesiones cifradas. MotusDAO no sustituye servicios de emergencia. Si estás en
                  crisis, contacta una línea de ayuda en tu país:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {LATAM_CRISIS_RESOURCES.map((r) => (
                    <li key={r.country}>
                      <strong className="text-foreground">{r.country}:</strong> {r.line}
                    </li>
                  ))}
                </ul>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 text-lg font-semibold">Preguntas frecuentes</h2>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="font-medium">¿Cuánto cuesta?</dt>
                    <dd className="text-muted-foreground">
                      ${PLATFORM_SESSION_PRICE_USD} USD por sesión de teleterapia.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">¿Es solo online?</dt>
                    <dd className="text-muted-foreground">
                      Sí, todas las sesiones son por videollamada.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">¿Cómo es la primera sesión?</dt>
                    <dd className="text-muted-foreground">
                      Es un espacio para conocernos, entender tu situación y acordar próximos pasos
                      a tu ritmo.
                    </dd>
                  </div>
                </dl>
              </GlassCard>
            </div>

            <div className="lg:col-span-1">
              <TherapistBookingCard slug={slug} profile={profile} />
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
