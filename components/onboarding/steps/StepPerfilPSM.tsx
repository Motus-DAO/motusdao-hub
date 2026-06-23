'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Phone, 
  Calendar, 
  MapPin, 
  GraduationCap,
  Award,
  Briefcase,
  Users,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { useOnboardingStore, getStepBlockerKeys } from '@/lib/onboarding-store'
import {
  buildPsmFormValues,
  flattenFormErrors,
  groupFieldClass,
  inputFieldClass,
  labelForField,
  normalizePhone,
} from '@/lib/onboarding-form-helpers'
import {
  getFileNameFromStoragePath,
  uploadProfessionalDocument,
  uploadProfileAvatar,
} from '@/lib/storage-client'
import { StepAIIntake } from './StepAIIntake'
import { IntakeLiveForm } from '@/components/onboarding/IntakeLiveForm'

const optionalNumber = z.preprocess(
  value => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number().int().nonnegative().optional()
)

const psmSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  telefono: z.preprocess(
    (value) => normalizePhone(value),
    z
      .string()
      .min(1, 'El teléfono es obligatorio')
      .regex(/^[\+]?[1-9]\d{7,15}$/, 'Formato de teléfono inválido')
  ),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  cedulaProfesional: z.string().min(1, 'La cédula profesional es obligatoria'),
  formacionAcademica: z.string().min(1, 'La formación académica es obligatoria'),
  experienciaAnios: z.coerce.number().min(0, 'Los años de experiencia deben ser 0 o mayor'),
  biografia: z.string().optional(),
  especialidades: z.array(z.string()).min(1, 'Debes seleccionar al menos una especialidad'),
  therapyStyles: z.array(z.string()).min(1, 'Selecciona al menos un enfoque terapéutico'),
  languages: z.array(z.string()).min(1, 'Selecciona al menos un idioma'),
  licensedCountries: z.array(z.string()).min(1, 'Selecciona al menos un país donde puedes atender'),
  licensedRegions: z.array(z.string()).default([]),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  availabilityNotes: z.string().min(3, 'Describe tu disponibilidad'),
  modalities: z.array(z.enum(['video', 'chat', 'in_person', 'hybrid'])).min(1, 'Selecciona al menos una modalidad'),
  sessionPrice: optionalNumber,
  currency: z.string().min(1, 'La moneda es obligatoria'),
  acceptsSlidingScale: z.boolean().default(false),
  worksWithUrgencyLevels: z.array(z.enum(['low', 'medium', 'high', 'crisis'])).min(1, 'Selecciona al menos un nivel de urgencia'),
  exclusionCriteria: z.array(z.string()).default([]),
  isAcceptingPatients: z.boolean().default(false),
  maxActivePatients: z.coerce
    .number()
    .int()
    .positive('La capacidad debe ser mayor a 0'),
  participaSupervision: z.boolean().default(false),
  participaCursos: z.boolean().default(false),
  participaInvestigacion: z.boolean().default(false),
  participaComunidad: z.boolean().default(false),
})

type PSMFormInput = z.input<typeof psmSchema>
type PSMFormData = z.output<typeof psmSchema>

interface StepPerfilPSMProps {
  onNext: () => void
  onBack: () => void
}

const especialidades = [
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'trauma', label: 'Trauma y TEPT' },
  { value: 'pareja', label: 'Terapia de pareja' },
  { value: 'familiar', label: 'Terapia familiar' },
  { value: 'infantil', label: 'Psicología infantil' },
  { value: 'adolescentes', label: 'Psicología adolescente' },
  { value: 'adicciones', label: 'Adicciones' },
  { value: 'duelo', label: 'Duelo y pérdidas' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'estres', label: 'Manejo del estrés' },
  { value: 'cognitivo', label: 'Terapia cognitivo-conductual' },
  { value: 'humanista', label: 'Terapia humanista' },
  { value: 'psicoanalisis', label: 'Psicoanálisis' },
  { value: 'sistemica', label: 'Terapia sistémica' },
  { value: 'otros', label: 'Otros' }
]

const therapyStyles = [
  { value: 'cognitivo', label: 'Cognitivo-conductual' },
  { value: 'humanista', label: 'Humanista' },
  { value: 'psicoanalisis', label: 'Psicoanálisis' },
  { value: 'sistemica', label: 'Sistémica' },
  { value: 'integrativa', label: 'Integrativa' }
]

const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' }
]

const modalityOptions = [
  { value: 'video', label: 'Video' },
  { value: 'chat', label: 'Chat' },
  { value: 'in_person', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrida' }
] as const

const urgencyOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'crisis', label: 'Crisis' }
] as const

const exclusionOptions = [
  { value: 'self_harm_crisis', label: 'Crisis suicida activa' },
  { value: 'active_psychosis', label: 'Psicosis activa' },
  { value: 'substance_detox', label: 'Desintoxicación' },
  { value: 'legal_forensic', label: 'Casos legales/forenses' }
]

const paises = [
  { value: 'mexico', label: 'México' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'chile', label: 'Chile' },
  { value: 'peru', label: 'Perú' },
  { value: 'venezuela', label: 'Venezuela' },
  { value: 'ecuador', label: 'Ecuador' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'espana', label: 'España' },
  { value: 'otros', label: 'Otros' }
]

export function StepPerfilPSM({ onNext, onBack }: StepPerfilPSMProps) {
  const { data, updateData, profileIntakeMode, setProfileIntakeMode } = useOnboardingStore()
  const intakeMode = profileIntakeMode ?? 'manual'
  const [documentError, setDocumentError] = useState<string | null>(null)

  useEffect(() => {
    const missing = getStepBlockerKeys(3, 'psm', data)
    if (missing.length > 0 && missing.length <= 3) {
      setProfileIntakeMode('manual')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const uploadDocument = async (
    file: File,
    documentType: 'cedula' | 'titulo'
  ) => {
    if (!data.eoaAddress) {
      throw new Error('Conecta tu wallet antes de subir documentos')
    }

    const result = await uploadProfessionalDocument({
      file,
      documentType,
      eoaAddress: data.eoaAddress,
    })

    updateData(
      documentType === 'cedula'
        ? { cedulaDocumentPath: result.storagePath }
        : { tituloDocumentPath: result.storagePath }
    )
    setDocumentError(null)
  }

  const uploadAvatar = async (file: File) => {
    if (!data.eoaAddress) {
      throw new Error('Conecta tu wallet antes de subir tu foto')
    }

    const result = await uploadProfileAvatar({
      file,
      eoaAddress: data.eoaAddress,
    })

    updateData({
      avatarUrl: result.avatarUrl,
      avatarStoragePath: result.storagePath,
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
    watch,
    setValue
  } = useForm<PSMFormInput, unknown, PSMFormData>({
    resolver: zodResolver(psmSchema),
    defaultValues: buildPsmFormValues(data),
    mode: 'all'
  })

  useEffect(() => {
    if (intakeMode !== 'manual') return
    reset(buildPsmFormValues(useOnboardingStore.getState().data))
  }, [intakeMode, reset])

  const flatErrors = flattenFormErrors(errors)
  const missingDocument = !data.cedulaDocumentPath && !data.tituloDocumentPath

  const watchedEspecialidades = watch('especialidades')

  const handleArrayChange = (
    field: 'especialidades' | 'therapyStyles' | 'languages' | 'licensedCountries' | 'modalities' | 'worksWithUrgencyLevels' | 'exclusionCriteria',
    value: string,
    checked: boolean
  ) => {
    const current = (watch(field) || []) as string[]
    if (checked) {
      setValue(field, [...current, value] as never, { shouldValidate: true })
    } else {
      setValue(field, current.filter(item => item !== value) as never, { shouldValidate: true })
    }
  }

  const onSubmit = (formData: PSMFormData) => {
    if (missingDocument) {
      setDocumentError('Debes subir al menos un documento: cédula profesional o título.')
      document.getElementById('psm-documents')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    updateData({
      ...formData,
      intakeSource: data.intakeSource === 'ai_assisted' ? 'ai_assisted' : 'manual',
      availability: { notes: formData.availabilityNotes },
    })
    onNext()
  }

  const onInvalid = (invalidErrors: typeof errors) => {
    const flat = flattenFormErrors(invalidErrors)
    const first = flat[0]
    if (first) {
      document.getElementById(first.field.split('.')[0])?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
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
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Información Profesional</h2>
          <p className="text-muted-foreground">
            Cuéntanos sobre tu formación y experiencia profesional
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setProfileIntakeMode('manual')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${intakeMode === 'manual' ? 'bg-mauve-500 text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            Llenarlo yo
          </button>
          <button
            type="button"
            onClick={() => setProfileIntakeMode('ai')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${intakeMode === 'ai' ? 'bg-mauve-500 text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            Hablar con IA
          </button>
        </div>

        {intakeMode === 'ai' ? (
          <StepAIIntake role="psm" onNext={onNext} />
        ) : (

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          <FileUploadField
            label="Foto de perfil (opcional)"
            description="Imagen visible para pacientes y en tu perfil."
            accept="image/jpeg,image/png,image/webp,image/gif"
            hint="JPEG, PNG, WebP o GIF. Máximo 5MB."
            fileName={getFileNameFromStoragePath(data.avatarStoragePath)}
            previewUrl={data.avatarUrl}
            onUpload={uploadAvatar}
            onClear={() =>
              updateData({ avatarUrl: undefined, avatarStoragePath: undefined })
            }
          />

          {/* Personal Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="nombre" className="block text-sm font-medium">
                Nombre *
              </label>
              <input
                {...register('nombre')}
                type="text"
                id="nombre"
                placeholder="Tu nombre"
                className={inputFieldClass(!!errors.nombre)}
              />
              {errors.nombre && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.nombre.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="apellido" className="block text-sm font-medium">
                Apellidos *
              </label>
              <input
                {...register('apellido')}
                type="text"
                id="apellido"
                placeholder="Tus apellidos"
                className={inputFieldClass(!!errors.apellido)}
              />
              {errors.apellido && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.apellido.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="telefono" className="block text-sm font-medium">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('telefono')}
                  type="tel"
                  id="telefono"
                  placeholder="+52 55 1234 5678"
                  className={inputFieldClass(!!errors.telefono, 'pl-10 pr-4 py-3')}
                />
              </div>
              {errors.telefono && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.telefono.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="fechaNacimiento" className="block text-sm font-medium">
                Fecha de nacimiento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('fechaNacimiento')}
                  type="date"
                  id="fechaNacimiento"
                  className={inputFieldClass(!!errors.fechaNacimiento, 'pl-10 pr-4 py-3')}
                />
              </div>
              {errors.fechaNacimiento && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.fechaNacimiento.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ciudad" className="block text-sm font-medium">
                Ciudad *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('ciudad')}
                  type="text"
                  id="ciudad"
                  placeholder="Tu ciudad"
                  className={inputFieldClass(!!errors.ciudad, 'pl-10 pr-4 py-3')}
                />
              </div>
              {errors.ciudad && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.ciudad.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pais" className="block text-sm font-medium">
                País *
              </label>
              <div className="relative">
                <select
                  {...register('pais')}
                  id="pais"
                  className={inputFieldClass(!!errors.pais, 'appearance-none')}
                >
                  <option value="">Selecciona tu país</option>
                  {paises.map(pais => (
                    <option key={pais.value} value={pais.value}>
                      {pais.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.pais && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.pais.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold">Información Profesional</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="cedulaProfesional" className="block text-sm font-medium">
                  Cédula profesional *
                </label>
                <input
                  {...register('cedulaProfesional')}
                  type="text"
                  id="cedulaProfesional"
                  placeholder="Ej: 12345678"
                  className={inputFieldClass(!!errors.cedulaProfesional)}
                />
                {errors.cedulaProfesional && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.cedulaProfesional.message}</span>
                  </p>
                )}
              </div>

              <div
                id="psm-documents"
                className={groupFieldClass(
                  !!documentError || (isSubmitted && missingDocument)
                )}
              >
              <div className="grid gap-4 md:grid-cols-2">
                <FileUploadField
                  label="Documento de cédula"
                  description="PDF o imagen de tu cédula profesional."
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  hint="PDF o imagen. Máximo 10MB."
                  fileName={getFileNameFromStoragePath(data.cedulaDocumentPath)}
                  onUpload={(file) => uploadDocument(file, 'cedula')}
                  onClear={() => updateData({ cedulaDocumentPath: undefined })}
                />
                <FileUploadField
                  label="Documento de título"
                  description="PDF o imagen de tu título universitario."
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  hint="PDF o imagen. Máximo 10MB."
                  fileName={getFileNameFromStoragePath(data.tituloDocumentPath)}
                  onUpload={(file) => uploadDocument(file, 'titulo')}
                  onClear={() => updateData({ tituloDocumentPath: undefined })}
                />
              </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sube al menos uno: cédula profesional o título. Solo visible para administradores durante la verificación.
              </p>
              {documentError && (
                <p className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{documentError}</span>
                </p>
              )}

              <div className="space-y-2">
                <label htmlFor="formacionAcademica" className="block text-sm font-medium">
                  Formación académica *
                </label>
                <input
                  {...register('formacionAcademica')}
                  type="text"
                  id="formacionAcademica"
                  placeholder="Ej: Licenciatura en Psicología, Universidad Nacional"
                  className={inputFieldClass(!!errors.formacionAcademica)}
                />
                {errors.formacionAcademica && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.formacionAcademica.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="experienciaAnios" className="block text-sm font-medium">
                  Años de experiencia *
                </label>
                <input
                  {...register('experienciaAnios')}
                  type="number"
                  id="experienciaAnios"
                  min="0"
                  placeholder="0"
                  className={inputFieldClass(!!errors.experienciaAnios)}
                />
                {errors.experienciaAnios && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.experienciaAnios.message}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="biografia" className="block text-sm font-medium">
                  Biografía breve (opcional)
                </label>
                <textarea
                  {...register('biografia')}
                  id="biografia"
                  rows={3}
                  placeholder="Cuéntanos brevemente sobre tu enfoque terapéutico y experiencia..."
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none"
                />
              </div>

              <div className={groupFieldClass(!!errors.especialidades)}>
                <label className="block text-sm font-medium">
                  Especialidades *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {especialidades.map(especialidad => (
                    <label
                      key={especialidad.value}
                      className="flex items-center space-x-2 p-2 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={watchedEspecialidades?.includes(especialidad.value) || false}
                        onChange={(e) => handleArrayChange('especialidades', especialidad.value, e.target.checked)}
                        className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
                      />
                      <span className="text-sm">{especialidad.label}</span>
                    </label>
                  ))}
                </div>
                {errors.especialidades && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.especialidades.message}</span>
                  </p>
                )}
              </div>

              <div className={groupFieldClass(!!errors.therapyStyles)}>
                <label className="block text-sm font-medium">Enfoques terapéuticos *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {therapyStyles.map(style => (
                    <label key={style.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                      <input type="checkbox" checked={(watch('therapyStyles') || []).includes(style.value)} onChange={(e) => handleArrayChange('therapyStyles', style.value, e.target.checked)} />
                      <span className="text-sm">{style.label}</span>
                    </label>
                  ))}
                </div>
                {errors.therapyStyles && <p className="text-red-400 text-sm">{errors.therapyStyles.message}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className={groupFieldClass(!!errors.languages)}>
                  <label className="block text-sm font-medium">Idiomas *</label>
                  <div className="space-y-2 mt-2">
                    {languageOptions.map(language => (
                      <label key={language.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                        <input type="checkbox" checked={(watch('languages') || []).includes(language.value)} onChange={(e) => handleArrayChange('languages', language.value, e.target.checked)} />
                        <span className="text-sm">{language.label}</span>
                      </label>
                    ))}
                  </div>
                {errors.languages && <p className="text-red-400 text-sm">{errors.languages.message}</p>}
                </div>
                <div className={groupFieldClass(!!errors.licensedCountries)}>
                  <label className="block text-sm font-medium">Países donde puedes atender *</label>
                  <div className="space-y-2 mt-2">
                    {paises.slice(0, 6).map(country => (
                      <label key={country.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                        <input type="checkbox" checked={(watch('licensedCountries') || []).includes(country.value)} onChange={(e) => handleArrayChange('licensedCountries', country.value, e.target.checked)} />
                        <span className="text-sm">{country.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.licensedCountries && (
                    <p className="text-red-400 text-sm">{errors.licensedCountries.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="timezone" className="block text-sm font-medium">Zona horaria *</label>
                  <input {...register('timezone')} id="timezone" placeholder="America/Mexico_City" className={inputFieldClass(!!errors.timezone)} />
                  {errors.timezone && <p className="text-red-400 text-sm">{errors.timezone.message}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="maxActivePatients" className="block text-sm font-medium">Capacidad activa *</label>
                  <input {...register('maxActivePatients')} type="number" min="1" id="maxActivePatients" className={inputFieldClass(!!errors.maxActivePatients)} />
                  {errors.maxActivePatients && <p className="text-red-400 text-sm">{errors.maxActivePatients.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="availabilityNotes" className="block text-sm font-medium">Disponibilidad *</label>
                <textarea {...register('availabilityNotes')} id="availabilityNotes" rows={3} placeholder="Ej: lunes a jueves 16:00-20:00..." className={inputFieldClass(!!errors.availabilityNotes, 'resize-none')} />
                {errors.availabilityNotes && <p className="text-red-400 text-sm">{errors.availabilityNotes.message}</p>}
              </div>

              <div className={groupFieldClass(!!errors.modalities)}>
                <label className="block text-sm font-medium">Modalidades *</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {modalityOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                      <input type="checkbox" checked={(watch('modalities') || []).includes(option.value)} onChange={(e) => handleArrayChange('modalities', option.value, e.target.checked)} />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.modalities && <p className="text-red-400 text-sm">{errors.modalities.message}</p>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sessionPrice" className="block text-sm font-medium">Precio por sesión</label>
                  <input {...register('sessionPrice')} type="number" min="0" id="sessionPrice" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="currency" className="block text-sm font-medium">Moneda *</label>
                  <input {...register('currency')} id="currency" className={inputFieldClass(!!errors.currency)} />
                  {errors.currency && <p className="text-red-400 text-sm">{errors.currency.message}</p>}
                </div>
                <label className="flex items-center gap-2 p-3 glass rounded-xl self-end">
                  <input {...register('acceptsSlidingScale')} type="checkbox" />
                  <span className="text-sm">Escala flexible</span>
                </label>
              </div>

              <div className={groupFieldClass(!!errors.worksWithUrgencyLevels)}>
                <label className="block text-sm font-medium">Niveles de urgencia que puedes atender *</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {urgencyOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                      <input type="checkbox" checked={(watch('worksWithUrgencyLevels') || []).includes(option.value)} onChange={(e) => handleArrayChange('worksWithUrgencyLevels', option.value, e.target.checked)} />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.worksWithUrgencyLevels && (
                  <p className="text-red-400 text-sm">{errors.worksWithUrgencyLevels.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">Casos que no tomas</label>
                <div className="grid md:grid-cols-2 gap-2">
                  {exclusionOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 p-2 glass rounded-xl">
                      <input type="checkbox" checked={(watch('exclusionCriteria') || []).includes(option.value)} onChange={(e) => handleArrayChange('exclusionCriteria', option.value, e.target.checked)} />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 glass rounded-xl">
                <input {...register('isAcceptingPatients')} type="checkbox" />
                <span className="text-sm">Quiero aparecer como disponible después de aprobación administrativa</span>
              </label>

              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Preferencias de plataforma
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('participaSupervision')}
                      type="checkbox"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
                    />
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Supervisión</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('participaCursos')}
                      type="checkbox"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
                    />
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      <span className="text-sm">Cursos</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('participaInvestigacion')}
                      type="checkbox"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
                    />
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Investigación</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('participaComunidad')}
                      type="checkbox"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 rounded focus:ring-mauve-500"
                    />
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-pink-400" />
                      <span className="text-sm">Comunidad</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <IntakeLiveForm role="psm" className="pt-2" />

          {(isSubmitted && flatErrors.length > 0) || (isSubmitted && missingDocument) ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm font-medium mb-2">
                Completa los siguientes campos para continuar:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-300 text-sm">
                {flatErrors.map(({ field, message }) => (
                  <li key={field}>
                    <span className="font-medium">{labelForField(field)}:</span> {message}
                  </li>
                ))}
                {isSubmitted && missingDocument && (
                  <li>Documento de cédula o título (sube al menos uno)</li>
                )}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Atrás
            </button>
            
            <CTAButton
              type="submit"
              className="flex items-center space-x-2"
            >
              <span>Continuar</span>
            </CTAButton>
          </div>
        </form>
        )}
      </GlassCard>
    </motion.div>
  )
}
