'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Mail, 
  Wallet, 
  User, 
  Phone, 
  Calendar, 
  MapPin,
  Heart,
  Award,
  Edit
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { deriveConcernFields } from '@/lib/intake-concerns'
import { buildPsmApiPayload } from '@/lib/intake/psm-intake-v1'
import { getEspecialidadLabel, getTherapyStyleLabel } from '@/lib/intake/psm-intake-options'

interface StepRevisionProps {
  onNext: () => void
  onBack: () => void
}

export function StepRevision({ onNext, onBack }: StepRevisionProps) {
  const { data, role, updateData } = useOnboardingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [tokenURI, setTokenURI] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAddress = (address: string) => {
    if (!address) return 'No conectada'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleContinue = async () => {
    if (!data.eoaAddress || !role) {
      setSubmitError('No se encontró una wallet conectada o el rol no está definido.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setTxHash(null)
    setTokenURI(null)

    try {
      const concernFields = deriveConcernFields({
        tipoAtencion: data.tipoAtencion,
        clinicalConcern: data.clinicalConcern,
        problematica: data.problematica,
      })
      const onboardingEndpoint =
        role === 'usuario' ? '/api/onboarding/user' : '/api/onboarding/psm'

      const basePayload = {
        email: data.email,
        eoaAddress: data.eoaAddress,
        smartWalletAddress: data.smartWalletAddress || data.eoaAddress,
        privyId: data.privyId,
        intakeSource: data.intakeSource || 'manual',
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento,
        ciudad: data.ciudad,
        pais: data.pais,
        avatarUrl: data.avatarUrl,
        avatarStoragePath: data.avatarStoragePath,
        motusName: data.motusName,
        mnsTxHash: data.mnsTxHash,
        consentToTerms: true,
        consentToPrivacy: true,
        consentToAIProcessing: false
      }

      const rolePayload =
        role === 'usuario'
          ? {
              tipoAtencion: concernFields.tipoAtencion,
              problematica: data.problematica,
              preferenciaAsignacion: data.preferenciaAsignacion,
              clinicalConcern: concernFields.clinicalConcern,
              urgencyLevel: data.urgencyLevel || 'medium',
              preferredModality: data.preferredModality || 'video',
              preferredTherapyStyle: data.preferredTherapyStyle || [],
              languages: data.languages || ['es'],
              timezone: data.timezone,
              availability: data.availability || (data.availabilityNotes ? { notes: data.availabilityNotes } : {}),
              budgetMin: data.budgetMin,
              budgetMax: data.budgetMax,
              paymentPreference: data.paymentPreference,
              therapistGenderPreference: data.therapistGenderPreference,
              priorTherapyExperience: data.priorTherapyExperience,
              medicationOrDiagnosisContext: data.medicationOrDiagnosisContext,
              riskFlags: data.riskFlags || [],
              consentToAIProcessing: data.consentToAIProcessing ?? false,
              consentToShareWithPSM: data.consentToShareWithPSM ?? true,
              consentToClinicalMatching: data.consentToClinicalMatching ?? true
            }
          : buildPsmApiPayload(data)

      const onboardingRes = await fetch(onboardingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...basePayload,
          ...rolePayload
        })
      })

      const onboardingText = await onboardingRes.text()
      let onboardingBody: {
        success?: boolean
        error?: string
        details?: unknown
        user?: { id?: string }
      }

      try {
        onboardingBody = onboardingText ? JSON.parse(onboardingText) : {}
      } catch {
        console.error('Respuesta no JSON al guardar onboarding:', onboardingText.slice(0, 200))
        throw new Error(
          `El servidor respondió ${onboardingRes.status} sin JSON (${onboardingText.slice(0, 120) || 'vacío'}). ` +
            'Si estás en local, reinicia el dev server (puerto duplicado o caché .next corrupta).'
        )
      }

      if (!onboardingRes.ok || !onboardingBody.success) {
        const detail =
          typeof onboardingBody.details === 'string'
            ? onboardingBody.details
            : onboardingBody.details
              ? JSON.stringify(onboardingBody.details)
              : undefined
        throw new Error(
          [onboardingBody.error || 'Error al guardar tu registro', detail]
            .filter(Boolean)
            .join(' — ')
        )
      }

      try {
        const registrationDate = new Date().toISOString().slice(0, 10)

        const res = await fetch('/api/profile/nft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wallet: data.eoaAddress,
            role,
            registrationDate
          })
        })

        const text = await res.text()
        let body: { success?: boolean; error?: string; txHash?: string; tokenURI?: unknown }

        try {
          body = text ? (JSON.parse(text) as typeof body) : {}
        } catch {
          console.warn('Respuesta no JSON al registrar NFT de perfil:', text.slice(0, 200))
          body = { success: false, error: 'Respuesta inválida del servidor al registrar NFT de perfil.' }
        }

        if (!res.ok || !body.success) {
          throw new Error(body.error || 'Error al registrar NFT de perfil')
        }

        if (body.txHash) {
          setTxHash(body.txHash as string)
        }
        if (body.tokenURI && typeof body.tokenURI === 'string') {
          setTokenURI(body.tokenURI as string)
        }

        updateData({
          profileNftTxHash: body.txHash as string | undefined,
          profileNftTokenURI: body.tokenURI as string | undefined
        })
      } catch (nftError) {
        console.warn('NFT de perfil no completado; el registro DB ya quedó guardado.', nftError)
      }

      onNext()
    } catch (error) {
      console.error('Error completando onboarding:', error)
      const message =
        error instanceof Error ? error.message : 'Error desconocido al completar onboarding'

      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Revisa tu información</h2>
          <p className="text-muted-foreground">
            Verifica que todos los datos sean correctos antes de continuar
          </p>
        </div>

        <div className="space-y-6">
          {/* Connection Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-mauve-400" />
              <span>Conexión</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">Correo electrónico</span>
                </div>
                <p className="text-white">{data.email || 'No especificado'}</p>
              </div>
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">Wallet</span>
                </div>
                <p className="text-white font-mono">{formatAddress(data.smartWalletAddress || data.eoaAddress || '')}</p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <User className="w-5 h-5 text-mauve-400" />
              <span>Información Personal</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">Nombre completo</span>
                </div>
                <p className="text-white">{data.nombre} {data.apellido}</p>
              </div>
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">Teléfono</span>
                </div>
                <p className="text-white">{data.telefono || 'No especificado'}</p>
              </div>
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium">Fecha de nacimiento</span>
                </div>
                <p className="text-white">{formatDate(data.fechaNacimiento || '')}</p>
              </div>
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium">Ubicación</span>
                </div>
                <p className="text-white">{data.ciudad}, {data.pais}</p>
              </div>
            </div>
          </div>

          {/* Role-specific Info */}
          {role === 'usuario' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Heart className="w-5 h-5 text-mauve-400" />
                <span>Perfil Terapéutico</span>
              </h3>
              <div className="space-y-4">
                <div className="p-4 glass rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="text-sm font-medium">Áreas relacionadas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deriveConcernFields({
                      tipoAtencion: data.tipoAtencion,
                      clinicalConcern: data.clinicalConcern,
                      problematica: data.problematica,
                    }).clinicalConcern.map(concern => (
                      <span
                        key={concern}
                        className="px-2 py-1 bg-mauve-500/20 text-mauve-300 rounded-full text-xs"
                      >
                        {concern}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 glass rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Edit className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Motivo de consulta</span>
                  </div>
                  <p className="text-white">{data.problematica || 'No especificado'}</p>
                </div>
                <div className="p-4 glass rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">Preferencia de asignación</span>
                  </div>
                  <p className="text-white capitalize">
                    {data.preferenciaAsignacion === 'automatica' ? 'Asignación automática' : 'Explorar perfiles'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Award className="w-5 h-5 text-mauve-400" />
                <span>Información Profesional</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 glass rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">Cédula profesional</span>
                  </div>
                  <p className="text-white">{data.cedulaProfesional || 'No especificada'}</p>
                </div>
                <div className="p-4 glass rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Años de experiencia</span>
                  </div>
                  <p className="text-white">{data.experienciaAnios || 0} años</p>
                </div>
                <div className="p-4 glass-card rounded-lg md:col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Edit className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">Formación académica</span>
                  </div>
                  <p className="text-white">{data.formacionAcademica || 'No especificada'}</p>
                </div>
                {(data.professionalNarrative || data.biografia) && (
                  <div className="p-4 glass-card rounded-lg md:col-span-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <Edit className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium">Descripción de tu práctica</span>
                    </div>
                    <p className="text-white">{data.professionalNarrative || data.biografia}</p>
                  </div>
                )}
                <div className="p-4 glass-card rounded-lg md:col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium">Enfoque terapéutico</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.therapyStyles?.map((style, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs"
                      >
                        {getTherapyStyleLabel(style)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 glass-card rounded-lg md:col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="w-4 h-4 text-pink-400" />
                    <span className="text-sm font-medium">Especialización</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.especialidades?.map((especialidad, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-mauve-500/20 text-mauve-300 rounded-full text-xs"
                      >
                        {getEspecialidadLabel(especialidad)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform Preferences (PSM only) */}
          {role === 'psm' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <User className="w-5 h-5 text-mauve-400" />
                <span>Preferencias de Plataforma</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.participaSupervision && (
                  <div className="p-3 glass-card rounded-lg text-center">
                    <User className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-white">Supervisión</p>
                  </div>
                )}
                {data.participaCursos && (
                  <div className="p-3 glass-card rounded-lg text-center">
                    <Award className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <p className="text-xs text-white">Cursos</p>
                  </div>
                )}
                {data.participaInvestigacion && (
                  <div className="p-3 glass-card rounded-lg text-center">
                    <Edit className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <p className="text-xs text-white">Investigación</p>
                  </div>
                )}
                {data.participaComunidad && (
                  <div className="p-3 glass-card rounded-lg text-center">
                    <User className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                    <p className="text-xs text-white">Comunidad</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="pt-8 space-y-4">
          {submitError && (
            <p className="text-sm text-red-400 text-center">{submitError}</p>
          )}
          {(txHash || tokenURI) && (
            <div className="text-xs text-center text-mauve-300 space-y-1">
              {txHash && (
                <p>
                  NFT de perfil registrado. Tx:{' '}
                  <a
                    href={`https://explorer.celo.org/mainnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ver en Celo Explorer
                  </a>
                </p>
              )}
              {tokenURI && (
                <p>
                  Metadata almacenada en IPFS/Filecoin:{' '}
                  <a
                    href={`https://gateway.lighthouse.storage/ipfs/${tokenURI.replace('ipfs://', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ver en Lighthouse/IPFS
                  </a>
                </p>
              )}
            </div>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Atrás
            </button>
            
            <CTAButton
              onClick={handleContinue}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              <span>
                {isSubmitting
                  ? 'Guardando registro...'
                  : 'Completar registro'}
              </span>
            </CTAButton>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
