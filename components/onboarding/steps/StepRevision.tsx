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
  Edit,
  FileText,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Image from 'next/image'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { UploadedDocumentPreview } from '@/components/onboarding/UploadedDocumentPreview'
import { getFileNameFromStoragePath } from '@/lib/storage-client'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { deriveConcernFields } from '@/lib/intake-concerns'
import { buildPsmApiPayload, resolveWeeklyTherapyHours, arePsmLegalDeclarationsComplete, buildPsmAvailability } from '@/lib/intake/psm-intake-v1'
import {
  resolveClinicalComplexityLevels,
  resolveCountriesWhereCanReceivePatients,
  resolveCredentialedCountries,
  resolveEmergencyProtocolStatus,
  resolveExcludedCases,
  resolveLegalDeclarations,
  resolveServiceTypes,
} from '@/lib/intake/psm-operations-compat'
import {
  getEspecialidadLabel,
  getTherapyStyleLabel,
  getPaisLabel,
  getClinicalComplexityLabel,
  getServiceTypeLabel,
  getExcludedCaseLabel,
  getEmergencyProtocolLabel,
  PSM_LEGAL_DECLARATIONS,
} from '@/lib/intake/psm-intake-options'
import type { PsmLegalDeclarationKey } from '@/lib/intake/psm-operations-compat'

interface StepRevisionProps {
  onNext: () => void
  onBack: () => void
}

export function StepRevision({ onNext, onBack }: StepRevisionProps) {
  const { data, role, updateData, setCurrentStep, setPsmWizardStep } = useOnboardingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [tokenURI, setTokenURI] = useState<string | null>(null)
  const [activeDeclarationModal, setActiveDeclarationModal] = useState<PsmLegalDeclarationKey | null>(null)
  const [showLegalDetails, setShowLegalDetails] = useState(false)

  const goToPsmStep = (sub: number) => {
    setPsmWizardStep(sub)
    setCurrentStep(3)
  }

  const consentsComplete =
    role !== 'psm' || arePsmLegalDeclarationsComplete(data)
  const legalDeclarations = resolveLegalDeclarations(data)

  const toggleAllRequiredDeclarations = (checked: boolean) => {
    const nextDeclarations = Object.fromEntries(
      PSM_LEGAL_DECLARATIONS.map((item) => [item.key, checked])
    ) as Record<PsmLegalDeclarationKey, boolean>
    const merged = { ...data, legalDeclarations: nextDeclarations }
    updateData({
      legalDeclarations: nextDeclarations,
      availability: buildPsmAvailability(merged),
      consentToTerms: checked,
      consentToPrivacy: checked,
    })
  }

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

    if (!consentsComplete) {
      setSubmitError('Debes aceptar todas las declaraciones legales para continuar.')
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
        consentToTerms: role === 'psm' ? arePsmLegalDeclarationsComplete(data) : true,
        consentToPrivacy: role === 'psm' ? arePsmLegalDeclarationsComplete(data) : true,
        consentToAIProcessing: role === 'psm' ? (data.consentToAIProcessing ?? false) : false,
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
              {role === 'psm' && data.avatarUrl && (
                <div className="p-4 glass rounded-xl md:col-span-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="w-4 h-4 text-mauve-400" />
                    <span className="text-sm font-medium">Foto de perfil</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/15 bg-black/20">
                      <Image
                        src={data.avatarUrl}
                        alt="Foto de perfil"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    {data.avatarStoragePath && (
                      <p className="text-xs text-emerald-300">
                        ✓ {getFileNameFromStoragePath(data.avatarStoragePath)}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Award className="w-5 h-5 text-mauve-400" />
                  <span>Información Profesional</span>
                </h3>
                <EditButton onClick={() => goToPsmStep(0)} />
              </div>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium">Enfoque terapéutico</span>
                    </div>
                    <EditButton onClick={() => goToPsmStep(1)} />
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

          {/* PSM operations summary */}
          {role === 'psm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-mauve-400" />
                  <span>Operación y alcance profesional</span>
                </h3>
                <EditButton onClick={() => goToPsmStep(2)} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <SummaryCard
                  title="Horas semanales para terapia"
                  value={`${resolveWeeklyTherapyHours(data) ?? '—'} h/semana`}
                />
                <SummaryCard
                  title="Cupo máximo de usuarios activos"
                  value={String(data.maxActiveUsers ?? data.maxActivePatients ?? '—')}
                />
                <SummaryCard
                  title="Países con cédula/licencia/registro"
                  chips={resolveCredentialedCountries(data).map(getPaisLabel)}
                  className="md:col-span-2"
                />
                <SummaryCard
                  title="Países donde declara poder recibir pacientes"
                  chips={resolveCountriesWhereCanReceivePatients(data).map(getPaisLabel)}
                  className="md:col-span-2"
                />
                <SummaryCard
                  title="Tipos de servicio"
                  chips={resolveServiceTypes(data).map(getServiceTypeLabel)}
                  className="md:col-span-2"
                />
                <SummaryCard
                  title="Complejidad clínica aceptada"
                  chips={resolveClinicalComplexityLevels(data).map(getClinicalComplexityLabel)}
                  className="md:col-span-2"
                />
                <SummaryCard
                  title="Casos excluidos / derivación"
                  chips={resolveExcludedCases(data).map(getExcludedCaseLabel)}
                  className="md:col-span-2"
                />
                <SummaryCard
                  title="Protocolo de emergencia"
                  value={
                    resolveEmergencyProtocolStatus(data)
                      ? getEmergencyProtocolLabel(resolveEmergencyProtocolStatus(data)!)
                      : 'No indicado'
                  }
                  className="md:col-span-2"
                />
              </div>
            </div>
          )}

          {/* PSM uploaded documents */}
          {role === 'psm' && (data.cedulaDocumentPath || data.tituloDocumentPath) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-mauve-400" />
                  <span>Documentos de verificación</span>
                </h3>
                <EditButton onClick={() => goToPsmStep(3)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.cedulaDocumentPath && (
                  <UploadedDocumentPreview
                    label="Documento de cédula"
                    storagePath={data.cedulaDocumentPath}
                  />
                )}
                {data.tituloDocumentPath && (
                  <UploadedDocumentPreview
                    label="Documento de título"
                    storagePath={data.tituloDocumentPath}
                  />
                )}
              </div>
            </div>
          )}

          {/* Platform Preferences (PSM only) */}
          {role === 'psm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <User className="w-5 h-5 text-mauve-400" />
                  <span>Preferencias de Plataforma</span>
                </h3>
                <EditButton onClick={() => goToPsmStep(2)} />
              </div>
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

        {/* Legal declarations (PSM only) */}
        {role === 'psm' && (
          <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-mauve-400" />
              <span>Declaraciones legales</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Debes aceptar todas las declaraciones para enviar tu registro profesional.
            </p>
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={consentsComplete}
                onChange={(e) => toggleAllRequiredDeclarations(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="font-medium">
                Acepto todas las declaraciones legales obligatorias. *
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowLegalDetails((prev) => !prev)}
              className="inline-flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-mauve-200 hover:bg-white/10"
            >
              <span>Ver declaraciones incluidas</span>
              {showLegalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showLegalDetails && (
              <div className="space-y-2">
                {PSM_LEGAL_DECLARATIONS.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <p className="text-sm">
                      <span className={legalDeclarations[item.key as PsmLegalDeclarationKey] ? 'text-emerald-300' : 'text-amber-200'}>
                        {legalDeclarations[item.key as PsmLegalDeclarationKey] ? 'Aceptada' : 'Pendiente'}:
                      </span>{' '}
                      {item.label} *
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveDeclarationModal(item.key as PsmLegalDeclarationKey)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs text-mauve-200 hover:bg-white/10"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Ver detalle
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                checked={Boolean(data.consentToAIProcessing)}
                onChange={(e) => updateData({ consentToAIProcessing: e.target.checked })}
                  className="mt-1 w-4 h-4"
                />
              <span className="text-muted-foreground">
                Autorizo el uso de IA para apoyar el emparejamiento y mejorar mi perfil (opcional).
              </span>
            </label>
            {!consentsComplete && (
              <p className="text-xs text-amber-300">
                Marca todas las declaraciones obligatorias para poder completar tu registro.
              </p>
            )}
          </div>
        )}
        {role === 'psm' && activeDeclarationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setActiveDeclarationModal(null)}
              aria-label="Cerrar detalle legal"
            />
            <div className="relative w-full max-w-2xl rounded-xl border border-white/15 bg-[#0b0e12] p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h4 className="text-lg font-semibold text-white">
                  {LEGAL_DECLARATION_DETAILS[activeDeclarationModal].title}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveDeclarationModal(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                {LEGAL_DECLARATION_DETAILS[activeDeclarationModal].body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        )}

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
              disabled={isSubmitting || !consentsComplete}
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

const LEGAL_DECLARATION_DETAILS: Record<
  PsmLegalDeclarationKey,
  { title: string; body: string[] }
> = {
  infoIsTrue: {
    title: 'Información veraz y actualizada',
    body: [
      'Declaras que los datos personales, profesionales y documentos enviados son correctos al momento del registro.',
      'Si cambian tus credenciales, habilitaciones o datos de contacto, deberás actualizar tu perfil para mantenerlo vigente.',
    ],
  },
  professionalScope: {
    title: 'Alcance profesional y responsabilidad',
    body: [
      'Reconoces que solo ofrecerás servicios dentro de tu formación, certificaciones y alcance legal permitido.',
      'MotusDAO no sustituye tu criterio profesional ni tus obligaciones éticas y regulatorias como especialista.',
    ],
  },
  motusCanReview: {
    title: 'Revisión y decisiones de MotusDAO',
    body: [
      'MotusDAO puede revisar tu perfil y documentación para mantener estándares de calidad y seguridad para usuarios.',
      'Con base en esa revisión, tu perfil podría aprobarse, rechazarse, limitarse o requerir información adicional.',
    ],
  },
  notEmergency: {
    title: 'MotusDAO no es servicio de emergencia',
    body: [
      'La plataforma no reemplaza servicios de urgencia ni atención inmediata en crisis.',
      'Ante riesgo inminente o emergencias, el usuario debe ser canalizado a servicios locales de emergencia.',
    ],
  },
  termsPrivacy: {
    title: 'Términos, privacidad y tratamiento de datos',
    body: [
      'Aceptas los términos de uso, el aviso de privacidad y las reglas de tratamiento de datos de MotusDAO.',
      'Esto incluye el uso de información operativa necesaria para validar perfil, seguridad y funcionamiento de la plataforma.',
    ],
  },
  documentsReview: {
    title: 'Revisión administrativa de documentos',
    body: [
      'Autorizas que el equipo administrativo revise tus documentos para validar identidad y habilitación profesional.',
      'La revisión se limita a fines de verificación y cumplimiento interno de la plataforma.',
    ],
  },
  crossBorderReview: {
    title: 'Atención transfronteriza sujeta a revisión',
    body: [
      'Si atiendes usuarios fuera de tu país de habilitación, pueden aplicar requisitos o validaciones adicionales.',
      'MotusDAO puede solicitar evidencia complementaria o restringir cobertura territorial cuando sea necesario.',
    ],
  },
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
    >
      <Edit className="w-3.5 h-3.5" />
      Editar
    </button>
  )
}

function SummaryCard({
  title,
  value,
  chips,
  className,
}: {
  title: string
  value?: string
  chips?: string[]
  className?: string
}) {
  return (
    <div className={`p-4 glass rounded-xl ${className ?? ''}`}>
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      {value && <p className="text-white">{value}</p>}
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="px-2 py-1 bg-mauve-500/20 text-mauve-300 rounded-full text-xs"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
