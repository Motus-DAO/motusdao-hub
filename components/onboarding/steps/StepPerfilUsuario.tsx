'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Heart,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore, getStepBlockerKeys } from '@/lib/onboarding-store'
import { StepAIIntake } from './StepAIIntake'
import { IntakeLiveForm } from '@/components/onboarding/IntakeLiveForm'
import { deriveConcernFields } from '@/lib/intake-concerns'

const optionalNumber = z.preprocess(
  value => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number().int().nonnegative().optional()
)

const usuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  telefono: z.string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  tipoAtencion: z.string().optional(),
  clinicalConcern: z.array(z.string()).default([]),
  problematica: z.string().min(20, 'Cuéntanos un poco más sobre lo que te trae aquí (mínimo 20 caracteres)'),
  preferenciaAsignacion: z.enum(['automatica', 'explorar'], {
    required_error: 'Debes seleccionar una preferencia de asignación'
  }),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'crisis']),
  preferredModality: z.enum(['video', 'chat', 'in_person', 'hybrid']),
  preferredTherapyStyle: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['es']),
  availabilityNotes: z.string().optional(),
  budgetMin: optionalNumber,
  budgetMax: optionalNumber,
  paymentPreference: z.string().optional(),
  therapistGenderPreference: z.string().optional(),
  priorTherapyExperience: z.boolean().default(false),
  medicationOrDiagnosisContext: z.string().optional(),
  riskFlags: z.array(z.string()).default([]),
  consentToAIProcessing: z.boolean().default(false),
  consentToShareWithPSM: z.boolean().refine(value => value === true, 'Debes aceptar compartir tu perfil con el profesional asignado'),
  consentToClinicalMatching: z.boolean().refine(value => value === true, 'Debes aceptar el uso de tus datos para matching clínico')
})

type UsuarioFormInput = z.input<typeof usuarioSchema>
type UsuarioFormData = z.output<typeof usuarioSchema>

interface StepPerfilUsuarioProps {
  onNext: () => void
  onBack: () => void
}

const tiposAtencion = [
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'depresion', label: 'Depresión' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'alimentarios', label: 'Trastornos alimentarios' },
  { value: 'adicciones', label: 'Adicciones' },
  { value: 'duelo', label: 'Duelo' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'estres', label: 'Estrés' },
  { value: 'otros', label: 'Otros' }
]

const therapyStyles = [
  { value: 'cognitivo', label: 'Cognitivo-conductual' },
  { value: 'humanista', label: 'Humanista' },
  { value: 'psicoanalisis', label: 'Psicoanálisis' },
  { value: 'sistemica', label: 'Sistémica' },
  { value: 'no_preference', label: 'Sin preferencia' }
]

const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' }
]

const riskFlagOptions = [
  { value: 'none', label: 'Ninguno' },
  { value: 'self_harm', label: 'Autolesión o ideación suicida' },
  { value: 'violence', label: 'Riesgo de violencia' },
  { value: 'abuse', label: 'Abuso o violencia familiar' },
  { value: 'substance_use', label: 'Uso problemático de sustancias' }
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

export function StepPerfilUsuario({ onNext, onBack }: StepPerfilUsuarioProps) {
  const { data, updateData, profileIntakeMode, setProfileIntakeMode } = useOnboardingStore()
  const intakeMode = profileIntakeMode ?? 'manual'

  useEffect(() => {
    const missing = getStepBlockerKeys(3, 'usuario', data)
    if (missing.length > 0 && missing.length <= 3) {
      setProfileIntakeMode('manual')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted }
  } = useForm<UsuarioFormInput, unknown, UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      ciudad: data.ciudad || '',
      pais: data.pais || '',
      tipoAtencion: data.tipoAtencion || '',
      clinicalConcern: data.clinicalConcern || (data.tipoAtencion ? [data.tipoAtencion] : []),
      problematica: data.problematica || '',
      preferenciaAsignacion: data.preferenciaAsignacion || undefined,
      urgencyLevel: data.urgencyLevel || 'medium',
      preferredModality: data.preferredModality || 'video',
      preferredTherapyStyle: data.preferredTherapyStyle || [],
      languages: data.languages || ['es'],
      availabilityNotes: data.availabilityNotes || '',
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      paymentPreference: data.paymentPreference || '',
      therapistGenderPreference: data.therapistGenderPreference || 'no_preference',
      priorTherapyExperience: data.priorTherapyExperience ?? false,
      medicationOrDiagnosisContext: data.medicationOrDiagnosisContext || '',
      riskFlags: data.riskFlags || ['none'],
      consentToAIProcessing: data.consentToAIProcessing ?? false,
      consentToShareWithPSM: data.consentToShareWithPSM ?? false,
      consentToClinicalMatching: data.consentToClinicalMatching ?? false
    },
    mode: 'all'
  })

  const selectedConcerns = watch('clinicalConcern') || []

  const toggleConcern = (value: string) => {
    const next = selectedConcerns.includes(value)
      ? selectedConcerns.filter(item => item !== value)
      : [...selectedConcerns, value]

    setValue('clinicalConcern', next, { shouldDirty: true, shouldValidate: true })
    setValue('tipoAtencion', next[0] || undefined, { shouldDirty: true, shouldValidate: false })
  }

  const onSubmit = (formData: UsuarioFormData) => {
    const concernFields = deriveConcernFields({
      tipoAtencion: formData.tipoAtencion,
      clinicalConcern: formData.clinicalConcern,
      problematica: formData.problematica,
    })

    updateData({
      ...formData,
      tipoAtencion: concernFields.tipoAtencion,
      intakeSource: 'manual',
      clinicalConcern: concernFields.clinicalConcern,
      availability: formData.availabilityNotes ? { notes: formData.availabilityNotes } : {}
    })
    onNext()
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
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Información Personal</h2>
          <p className="text-muted-foreground">
            Cuéntanos sobre ti para personalizar tu experiencia
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
          <StepAIIntake role="usuario" onNext={onNext} />
        ) : (

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
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
                className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
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
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
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
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
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
                  className="w-full pl-10 pr-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
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
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition appearance-none"
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

          {/* Therapeutic Profile */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold">Perfil Terapéutico</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="problematica" className="block text-sm font-medium">
                  ¿Qué te trae a MotusDAO en este momento? *
                </label>
                <textarea
                  {...register('problematica')}
                  id="problematica"
                  rows={5}
                  placeholder="Escribe con tus palabras qué está pasando, qué te preocupa o qué te gustaría trabajar. No necesitas elegir una categoría perfecta."
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esta respuesta abierta será la base de tu perfil de intake. Las opciones rápidas de abajo solo ayudan al matching.
                </p>
                {errors.problematica && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.problematica.message}</span>
                  </p>
                )}
              </div>

              <input type="hidden" {...register('tipoAtencion')} />

              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Opcional: áreas relacionadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {tiposAtencion.map(tipo => {
                    const active = selectedConcerns.includes(tipo.value)
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => toggleConcern(tipo.value)}
                        className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-mauve-400 bg-mauve-500/25 text-white'
                            : 'border-white/15 bg-white/[0.03] text-muted-foreground hover:text-white'
                        }`}
                      >
                        {tipo.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Puedes dejarlo vacío si no estás seguro; haremos una inferencia básica desde tu respuesta abierta.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Preferencia de asignación *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('preferenciaAsignacion')}
                      type="radio"
                      value="automatica"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 focus:ring-mauve-500"
                    />
                    <div>
                      <p className="font-medium">Asignación automática</p>
                      <p className="text-sm text-muted-foreground">
                        Te asignaremos el profesional más adecuado según tu perfil
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 glass rounded-xl cursor-pointer hover:bg-white/15 transition-colors">
                    <input
                      {...register('preferenciaAsignacion')}
                      type="radio"
                      value="explorar"
                      className="w-4 h-4 text-mauve-600 bg-transparent border-white/20 focus:ring-mauve-500"
                    />
                    <div>
                      <p className="font-medium">Explorar perfiles</p>
                      <p className="text-sm text-muted-foreground">
                        Podrás revisar y elegir entre diferentes profesionales
                      </p>
                    </div>
                  </label>
                </div>
                {errors.preferenciaAsignacion && (
                  <p className="text-red-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.preferenciaAsignacion.message}</span>
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="urgencyLevel" className="block text-sm font-medium">
                    Urgencia *
                  </label>
                  <select {...register('urgencyLevel')} id="urgencyLevel" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="crisis">Crisis</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="preferredModality" className="block text-sm font-medium">
                    Modalidad preferida *
                  </label>
                  <select {...register('preferredModality')} id="preferredModality" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition">
                    <option value="video">Video</option>
                    <option value="chat">Chat</option>
                    <option value="in_person">Presencial</option>
                    <option value="hybrid">Híbrida</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">Enfoque terapéutico preferido</label>
                <div className="grid grid-cols-2 gap-2">
                  {therapyStyles.map(style => (
                    <label key={style.value} className="flex items-center gap-2 p-2 glass rounded-xl">
                      <input {...register('preferredTherapyStyle')} type="checkbox" value={style.value} />
                      <span className="text-sm">{style.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">Idiomas *</label>
                <div className="grid grid-cols-3 gap-2">
                  {languageOptions.map(language => (
                    <label key={language.value} className="flex items-center gap-2 p-2 glass rounded-xl">
                      <input {...register('languages')} type="checkbox" value={language.value} />
                      <span className="text-sm">{language.label}</span>
                    </label>
                  ))}
                </div>
                {errors.languages && <p className="text-red-400 text-sm">{errors.languages.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="availabilityNotes" className="block text-sm font-medium">
                  Disponibilidad general *
                </label>
                <textarea
                  {...register('availabilityNotes')}
                  id="availabilityNotes"
                  rows={3}
                  placeholder="Ej: tardes entre semana, sábados por la mañana..."
                  className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none"
                />
                {errors.availabilityNotes && <p className="text-red-400 text-sm">{errors.availabilityNotes.message}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="budgetMin" className="block text-sm font-medium">Presupuesto mínimo</label>
                  <input {...register('budgetMin')} type="number" min="0" id="budgetMin" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="budgetMax" className="block text-sm font-medium">Presupuesto máximo</label>
                  <input {...register('budgetMax')} type="number" min="0" id="budgetMax" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="paymentPreference" className="block text-sm font-medium">Preferencia de pago</label>
                  <input {...register('paymentPreference')} id="paymentPreference" placeholder="Tarjeta, cripto, transferencia..." className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="therapistGenderPreference" className="block text-sm font-medium">Preferencia de terapeuta</label>
                  <select {...register('therapistGenderPreference')} id="therapistGenderPreference" className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition">
                    <option value="no_preference">Sin preferencia</option>
                    <option value="female">Mujer</option>
                    <option value="male">Hombre</option>
                    <option value="non_binary">No binario</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 glass rounded-xl">
                <input {...register('priorTherapyExperience')} type="checkbox" />
                <span className="text-sm">He tenido terapia antes</span>
              </label>

              <div className="space-y-2">
                <label htmlFor="medicationOrDiagnosisContext" className="block text-sm font-medium">
                  Contexto diagnóstico o medicación (opcional)
                </label>
                <textarea {...register('medicationOrDiagnosisContext')} id="medicationOrDiagnosisContext" rows={3} className="w-full px-4 py-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none" />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium">Señales de riesgo</label>
                <div className="grid md:grid-cols-2 gap-2">
                  {riskFlagOptions.map(flag => (
                    <label key={flag.value} className="flex items-center gap-2 p-2 glass rounded-xl">
                      <input {...register('riskFlags')} type="checkbox" value={flag.value} />
                      <span className="text-sm">{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <label className="flex items-start gap-2">
                  <input {...register('consentToAIProcessing')} type="checkbox" className="mt-1" />
                  <span className="text-sm">Acepto que la IA procese mis respuestas si uso intake asistido</span>
                </label>
                <label className="flex items-start gap-2">
                  <input {...register('consentToShareWithPSM')} type="checkbox" className="mt-1" />
                  <span className="text-sm">Acepto compartir mi perfil de intake con el profesional asignado *</span>
                </label>
                {errors.consentToShareWithPSM && <p className="text-red-400 text-sm">{errors.consentToShareWithPSM.message}</p>}
                <label className="flex items-start gap-2">
                  <input {...register('consentToClinicalMatching')} type="checkbox" className="mt-1" />
                  <span className="text-sm">Acepto que MotusDAO use estos datos para matching clínico *</span>
                </label>
                {errors.consentToClinicalMatching && <p className="text-red-400 text-sm">{errors.consentToClinicalMatching.message}</p>}
              </div>
            </div>
          </div>

          {/* Error summary (shows after first submit attempt) */}
          {isSubmitted && Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm font-medium mb-2">
                Completa los siguientes campos para continuar:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-300 text-xs">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error?.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation Buttons */}
          <IntakeLiveForm role="usuario" className="pt-2" />

          <div className="flex justify-between items-center pt-6">
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
