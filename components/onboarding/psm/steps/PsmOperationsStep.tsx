'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Briefcase, Users } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import {
  PSM_PAISES,
  PSM_URGENCY_LEVELS,
  PSM_EXCLUSION_CRITERIA,
} from '@/lib/intake/psm-intake-options'
import { getPsmWizardStepBlockers } from '@/lib/intake/psm-intake-v1'
import { PsmChipGroup } from '../PsmChipGroup'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'

const schema = z.object({
  licensedCountries: z.array(z.string()).min(1, 'Selecciona al menos un país donde puedes atender'),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  availabilityNotes: z.string().min(3, 'Describe tu disponibilidad'),
  worksWithUrgencyLevels: z
    .array(z.enum(['low', 'medium', 'high', 'crisis']))
    .min(1, 'Selecciona al menos un nivel de urgencia'),
  exclusionCriteria: z.array(z.string()).default([]),
  maxActiveUsers: z.coerce.number().int().positive('Los usuarios activos deben ser mayor a 0'),
  isAcceptingUsers: z.boolean().default(false),
  acceptsSlidingScale: z.boolean().default(false),
  participaSupervision: z.boolean().default(false),
  participaCursos: z.boolean().default(false),
  participaInvestigacion: z.boolean().default(false),
  participaComunidad: z.boolean().default(false),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

type Props = {
  onContinue: () => void
  onBack: () => void
}

export function PsmOperationsStep({ onContinue, onBack }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [showBlockers, setShowBlockers] = useState(false)

  const browserTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Mexico_City'

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      licensedCountries:
        data.licensedCountries?.length ? data.licensedCountries : data.pais ? [data.pais] : [],
      timezone: data.timezone || browserTz,
      availabilityNotes: data.availabilityNotes || '',
      worksWithUrgencyLevels: data.worksWithUrgencyLevels?.length
        ? data.worksWithUrgencyLevels
        : ['low', 'medium'],
      exclusionCriteria: data.exclusionCriteria || [],
      maxActiveUsers: data.maxActiveUsers ?? data.maxActivePatients ?? 10,
      isAcceptingUsers: data.isAcceptingUsers ?? data.isAcceptingPatients ?? false,
      acceptsSlidingScale: data.acceptsSlidingScale ?? false,
      participaSupervision: data.participaSupervision ?? false,
      participaCursos: data.participaCursos ?? false,
      participaInvestigacion: data.participaInvestigacion ?? false,
      participaComunidad: data.participaComunidad ?? false,
    },
  })

  const onSubmit = (formData: FormData) => {
    setShowBlockers(false)
    updateData({
      ...formData,
      isAcceptingPatients: formData.isAcceptingUsers,
      maxActivePatients: formData.maxActiveUsers,
      availability: { notes: formData.availabilityNotes },
    })
    onContinue()
  }

  const blockers = showBlockers
    ? getPsmWizardStepBlockers(2, { ...data, ...getValues() })
    : []

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setShowBlockers(true))} className="space-y-6">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}
      <PsmChipGroup
        label="Países donde puedes atender *"
        options={PSM_PAISES}
        selected={watch('licensedCountries') || []}
        onChange={(next) => setValue('licensedCountries', next, { shouldValidate: true })}
        hasError={!!errors.licensedCountries}
        columns={3}
      />
      {errors.licensedCountries && (
        <p className="text-red-400 text-sm">{errors.licensedCountries.message}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Zona horaria *</label>
          <input
            {...register('timezone')}
            placeholder="America/Mexico_City"
            className={inputFieldClass(!!errors.timezone)}
          />
          {errors.timezone && <p className="text-red-400 text-sm">{errors.timezone.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Usuarios activos que puedes atender *</label>
          <input
            {...register('maxActiveUsers')}
            type="number"
            min={1}
            className={inputFieldClass(!!errors.maxActiveUsers)}
          />
          {errors.maxActiveUsers && (
            <p className="text-red-400 text-sm">{errors.maxActiveUsers.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Disponibilidad *</label>
        <textarea
          {...register('availabilityNotes')}
          rows={3}
          placeholder="Ej: lunes a jueves 16:00–20:00, zona horaria Ciudad de México"
          className={inputFieldClass(!!errors.availabilityNotes, 'resize-none')}
        />
        {errors.availabilityNotes && (
          <p className="text-red-400 text-sm">{errors.availabilityNotes.message}</p>
        )}
      </div>

      <PsmChipGroup
        label="Niveles de urgencia que puedes atender *"
        options={PSM_URGENCY_LEVELS}
        selected={watch('worksWithUrgencyLevels') || []}
        onChange={(next) =>
          setValue('worksWithUrgencyLevels', next as FormData['worksWithUrgencyLevels'], {
            shouldValidate: true,
          })
        }
        hasError={!!errors.worksWithUrgencyLevels}
      />

      <PsmChipGroup
        label="Casos que no tomas (opcional)"
        options={PSM_EXCLUSION_CRITERIA}
        selected={watch('exclusionCriteria') || []}
        onChange={(next) => setValue('exclusionCriteria', next)}
        columns={2}
      />

      <label className="flex items-center gap-2 p-3 glass rounded-xl">
        <input {...register('isAcceptingUsers')} type="checkbox" />
        <span className="text-sm">
          Quiero recibir usuarios en la plataforma después de la aprobación administrativa
        </span>
      </label>

      <label className="flex items-center gap-2 p-3 glass rounded-xl">
        <input {...register('acceptsSlidingScale')} type="checkbox" />
        <span className="text-sm">Ofrezco escala flexible de honorarios</span>
      </label>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Preferencias de plataforma</label>
        <div className="grid grid-cols-2 gap-3">
          <PlatformToggle
            icon={<Users className="w-4 h-4 text-blue-400" />}
            label="Supervisión"
            {...register('participaSupervision')}
          />
          <PlatformToggle
            icon={<GraduationCap className="w-4 h-4 text-purple-400" />}
            label="Cursos"
            {...register('participaCursos')}
          />
          <PlatformToggle
            icon={<Briefcase className="w-4 h-4 text-green-400" />}
            label="Investigación"
            {...register('participaInvestigacion')}
          />
          <PlatformToggle
            icon={<Users className="w-4 h-4 text-pink-400" />}
            label="Comunidad"
            {...register('participaComunidad')}
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="px-6 py-3 text-gray-400 hover:text-white">
          Atrás
        </button>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-mauve-500 hover:bg-mauve-600 text-white font-medium"
        >
          Continuar
        </button>
      </div>
    </form>
  )
}

function PlatformToggle({
  icon,
  label,
  ...inputProps
}: {
  icon: React.ReactNode
  label: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center space-x-2 p-3 glass rounded-xl cursor-pointer hover:bg-white/15">
      <input type="checkbox" className="w-4 h-4" {...inputProps} />
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
    </label>
  )
}
