'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, Phone, Calendar, MapPin, AlertCircle, Globe } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { PLATFORM_USE_CASES } from '@/lib/intake/user-intake-v1'
import { onboardingBackButtonClass } from '@/lib/onboarding-ui'

const platformSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  telefono: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  ciudad: z.string().min(1, 'La ciudad es obligatoria'),
  pais: z.string().min(1, 'El país es obligatorio'),
  platformUseCases: z
    .array(z.string())
    .min(1, 'Selecciona al menos una opción'),
  platformNotes: z.string().optional(),
})

type PlatformFormData = z.infer<typeof platformSchema>

interface StepPerfilPlataformaProps {
  onNext: () => void
  onBack: () => void
}

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
  { value: 'otros', label: 'Otros' },
]

export function StepPerfilPlataforma({ onNext, onBack }: StepPerfilPlataformaProps) {
  const { data, updateData } = useOnboardingStore()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      ciudad: data.ciudad || '',
      pais: data.pais || '',
      platformUseCases: data.platformUseCases || [],
      platformNotes: data.platformNotes || '',
    },
    mode: 'onChange',
  })

  const selectedUseCases = watch('platformUseCases') || []

  const toggleUseCase = (value: string) => {
    const next = selectedUseCases.includes(value)
      ? selectedUseCases.filter((item) => item !== value)
      : [...selectedUseCases, value]
    setValue('platformUseCases', next, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = (formData: PlatformFormData) => {
    updateData({
      ...formData,
      intakeSource: 'manual',
      languages: data.languages?.length ? data.languages : ['es'],
    })
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="mx-auto w-full max-w-2xl"
    >
      <GlassCard className="p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-mauve-500 to-iris-500">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Tu perfil en MotusDAO</h2>
          <p className="text-muted-foreground">
            Datos básicos para activar tu cuenta y usar Motus Name Service
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="nombre" className="block text-sm font-medium">
                Nombre *
              </label>
              <input
                {...register('nombre')}
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                className="focus-ring smooth-transition w-full rounded-xl border border-border px-4 py-3 glass"
              />
              {errors.nombre && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
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
                id="apellido"
                type="text"
                placeholder="Tus apellidos"
                className="focus-ring smooth-transition w-full rounded-xl border border-border px-4 py-3 glass"
              />
              {errors.apellido && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.apellido.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="telefono" className="block text-sm font-medium">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  {...register('telefono')}
                  id="telefono"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  className="focus-ring smooth-transition w-full rounded-xl border border-border py-3 pl-10 pr-4 glass"
                />
              </div>
              {errors.telefono && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.telefono.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="fechaNacimiento" className="block text-sm font-medium">
                Fecha de nacimiento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  {...register('fechaNacimiento')}
                  id="fechaNacimiento"
                  type="date"
                  className="focus-ring smooth-transition w-full rounded-xl border border-border py-3 pl-10 pr-4 glass"
                />
              </div>
              {errors.fechaNacimiento && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.fechaNacimiento.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="ciudad" className="block text-sm font-medium">
                Ciudad *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  {...register('ciudad')}
                  id="ciudad"
                  type="text"
                  placeholder="Tu ciudad"
                  className="focus-ring smooth-transition w-full rounded-xl border border-border py-3 pl-10 pr-4 glass"
                />
              </div>
              {errors.ciudad && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.ciudad.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pais" className="block text-sm font-medium">
                País *
              </label>
              <select
                {...register('pais')}
                id="pais"
                className="focus-ring smooth-transition w-full appearance-none rounded-xl border border-border px-4 py-3 glass"
              >
                <option value="">Selecciona tu país</option>
                {paises.map((pais) => (
                  <option key={pais.value} value={pais.value}>
                    {pais.label}
                  </option>
                ))}
              </select>
              {errors.pais && (
                <p className="flex items-center space-x-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.pais.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-mauve-400" />
              <h3 className="text-lg font-semibold">¿Cómo planeas usar MotusDAO? *</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Motus Name Service y el Hub están disponibles para todos los usuarios de la plataforma.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORM_USE_CASES.map((option) => {
                const selected = selectedUseCases.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleUseCase(option.value)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? 'border-mauve-500 bg-mauve-500/15 text-foreground'
                        : 'border-border hover:border-mauve-400/50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {errors.platformUseCases && (
              <p className="flex items-center space-x-1 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.platformUseCases.message}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="platformNotes" className="block text-sm font-medium">
              Notas adicionales (opcional)
            </label>
            <textarea
              {...register('platformNotes')}
              id="platformNotes"
              rows={3}
              placeholder="Cuéntanos si hay algo más que quieras hacer en la plataforma"
              className="focus-ring smooth-transition w-full resize-none rounded-xl border border-border px-4 py-3 glass"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button type="button" onClick={onBack} className={onboardingBackButtonClass}>
              Atrás
            </button>
            <CTAButton type="submit" className="flex items-center space-x-2">
              <span>Continuar</span>
            </CTAButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  )
}
