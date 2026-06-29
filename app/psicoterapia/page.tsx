'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import {
  Heart,
  Users,
  Star,
  MessageCircle,
  Video,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PLATFORM_SESSION_CURRENCY, PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import type { ReputationSummary } from '@/lib/psm/reputation'

interface PSMListItem {
  id: string
  slug: string
  nombre: string
  apellido: string
  avatarUrl: string | null
  bio: string
  experienciaAnios: number
  topSpecialties: string[]
  topSpecialtyLabels: string[]
  languages: string[]
  price: { amount: number; currency: string }
  reputation: ReputationSummary
  isAvailable: boolean
}

interface TherapistDisplay {
  id: string
  slug: string
  name: string
  specialization: string
  experience: string
  reputation: ReputationSummary
  languages: string[]
  availability: string
  price: string
  image: string | null
  bio: string
  isAvailable: boolean
}

const features = [
  {
    icon: Shield,
    title: 'Confidencialidad Total',
    description: 'Tus sesiones están protegidas con encriptación de extremo a extremo',
  },
  {
    icon: Video,
    title: 'Sesiones Virtuales',
    description: 'Conecta con tu terapeuta desde la comodidad de tu hogar',
  },
  {
    icon: Calendar,
    title: 'Horarios Flexibles',
    description: 'Agenda sesiones que se adapten a tu rutina diaria',
  },
  {
    icon: CheckCircle,
    title: 'Terapeutas Certificados',
    description: 'Todos nuestros profesionales están licenciados y verificados',
  },
]

const languageMap: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  pt: 'Portugués',
}

export default function PsicoterapiaPage() {
  const [therapists, setTherapists] = useState<TherapistDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPSMs() {
      try {
        setLoading(true)
        const response = await fetch('/api/psm')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar los terapeutas')
        }

        const therapistsData: TherapistDisplay[] = data.psms.map((psm: PSMListItem) => {
          const fullName = `${psm.nombre} ${psm.apellido}`.trim()
          const specialization =
            psm.topSpecialtyLabels.length > 0
              ? psm.topSpecialtyLabels.join(', ')
              : 'Psicoterapia General'

          const languages = psm.languages.map((l) => languageMap[l] || l)

          return {
            id: psm.id,
            slug: psm.slug,
            name: fullName,
            specialization,
            experience: `${psm.experienciaAnios} ${psm.experienciaAnios === 1 ? 'año' : 'años'}`,
            reputation: psm.reputation,
            languages,
            availability: psm.isAvailable ? 'Disponible' : 'Ocupada',
            price: `$${psm.price.amount} ${psm.price.currency}`,
            image: psm.avatarUrl,
            bio:
              psm.bio ||
              `${fullName} es un profesional de la salud mental con ${psm.experienciaAnios} ${psm.experienciaAnios === 1 ? 'año' : 'años'} de experiencia.`,
            isAvailable: psm.isAvailable,
          }
        })

        setTherapists(therapistsData)
        setError(null)
      } catch (err) {
        console.error('Error fetching PSMs:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar los terapeutas')
      } finally {
        setLoading(false)
      }
    }

    fetchPSMs()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 text-center"
          >
            <div className="mb-6 flex items-center justify-center">
              <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-600">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl font-bold md:text-5xl">
                  Psicoterapia
                </GradientText>
                <p className="text-muted-foreground">
                  Conecta con profesionales de la salud mental
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <GlassCard key={index} className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-mauve-500 to-iris-500">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </GlassCard>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="mb-8 text-center text-2xl font-bold">Nuestros Terapeutas</h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-mauve-400" />
                <span className="ml-3 text-muted-foreground">Cargando terapeutas...</span>
              </div>
            ) : error ? (
              <GlassCard className="p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                <p className="mb-4 text-muted-foreground">{error}</p>
                <CTAButton onClick={() => window.location.reload()} variant="secondary" size="sm">
                  Reintentar
                </CTAButton>
              </GlassCard>
            ) : therapists.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay terapeutas disponibles en este momento.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {therapists.map((therapist) => (
                  <GlassCard key={therapist.id} className="p-6">
                    <div className="mb-4 flex items-start space-x-4">
                      {therapist.image ? (
                        <Image
                          src={therapist.image}
                          alt={therapist.name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-mauve-500 to-iris-500">
                          <span className="text-lg font-bold text-white">
                            {therapist.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{therapist.name}</h3>
                        <p className="text-sm text-muted-foreground">{therapist.specialization}</p>
                        <div className="mt-1 flex items-center">
                          {therapist.reputation.showStars ? (
                            <>
                              <Star className="mr-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
                              <span className="text-sm font-medium">
                                {therapist.reputation.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {therapist.reputation.label}
                            </span>
                          )}
                          <span className="ml-1 text-sm text-muted-foreground">
                            ({therapist.reputation.patientCount}{' '}
                            {therapist.reputation.patientCount === 1 ? 'paciente' : 'pacientes'})
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-muted-foreground">{therapist.bio}</p>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Experiencia:</span>
                        <span className="font-medium">{therapist.experience}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Idiomas:</span>
                        <span className="font-medium">{therapist.languages.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Precio:</span>
                        <span className="font-medium text-mauve-400">{therapist.price}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estado:</span>
                        <div className="flex items-center">
                          {therapist.isAvailable ? (
                            <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="mr-1 h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{therapist.availability}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Link href={`/psicoterapia/${therapist.slug}#agendar`}>
                        <CTAButton
                          size="sm"
                          className="w-full"
                          disabled={!therapist.isAvailable}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          {therapist.isAvailable ? 'Agendar Sesión' : 'Lista de Espera'}
                        </CTAButton>
                      </Link>
                      <Link href={`/psicoterapia/${therapist.slug}`}>
                        <CTAButton variant="secondary" size="sm" className="w-full">
                          Ver Perfil Completo
                        </CTAButton>
                      </Link>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </Section>
    </div>
  )
}
