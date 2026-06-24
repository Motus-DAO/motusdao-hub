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
import {
  PSM_MIN_WEEKLY_THERAPY_HOURS,
  PSM_MAX_WEEKLY_THERAPY_HOURS,
  getPsmWizardStepBlockers,
  resolveWeeklyTherapyHours,
} from '@/lib/intake/psm-intake-v1'
import { resolvePsmTimezoneDefault } from '@/lib/intake/psm-timezone-options'
import { PsmChipGroup } from '../PsmChipGroup'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'
import { PsmTimezoneSelect } from '../PsmTimezoneSelect'

const schema = z.object({
  licensedCountries: z.array(z.string()).min(1, 'Selecciona al menos un país donde puedes atender'),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  weeklyTherapyHours: z.coerce
    .number()
    .int('Las horas deben ser un número entero')
    .min(PSM_MIN_WEEKLY_THERAPY_HOURS, `Indica al menos ${PSM_MIN_WEEKLY_THERAPY_HOURS} hora semanal`)
    .max(
      PSM_MAX_WEEKLY_THERAPY_HOURS,
      `Indica como máximo ${PSM_MAX_WEEKLY_THERAPY_HOURS} horas semanales`
    ),
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
      timezone: resolvePsmTimezoneDefault({
        timezone: data.timezone,
        pais: data.pais,
        browserTimezone: browserTz,
      }),
      weeklyTherapyHours: resolveWeeklyTherapyHours(data) ?? PSM_MIN_WEEKLY_THERAPY_HOURS,
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
      availability: { weeklyTherapyHours: formData.weeklyTherapyHours },
    })
    onContinue()
  }

  const weeklyHours = watch('weeklyTherapyHours')
  const maxUsers = watch('maxActiveUsers')
  const capacityHint =
    typeof weeklyHours === 'number' &&
    typeof maxUsers === 'number' &&
    weeklyHours > 0 &&
    maxUsers > weeklyHours
      ? 'Con sesiones semanales de ~1 h, el cupo de usuarios activos suele ser similar o menor que tus horas disponibles.'
      : null

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

      <PsmTimezoneSelect
        value={watch('timezone') || ''}
        onChange={(next) => setValue('timezone', next, { shouldValidate: true })}
        preferredCountry={data.pais}
        hasError={!!errors.timezone}
        errorMessage={errors.timezone?.message}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Horas semanales para terapia *</label>
          <p className="text-xs text-muted-foreground">
            Tiempo aproximado que puedes dedicar a sesiones por semana.
          </p>
          <input
            {...register('weeklyTherapyHours')}
            type="number"
            min={PSM_MIN_WEEKLY_THERAPY_HOURS}
            max={PSM_MAX_WEEKLY_THERAPY_HOURS}
            className={inputFieldClass(!!errors.weeklyTherapyHours)}
          />
          {errors.weeklyTherapyHours && (
            <p className="text-red-400 text-sm">{errors.weeklyTherapyHours.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Usuarios activos que puedes atender *</label>
          <p className="text-xs text-muted-foreground">
            Personas con las que puedes trabajar al mismo tiempo.
          </p>
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
      {capacityHint && <p className="text-xs text-amber-300/90">{capacityHint}</p>}

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
