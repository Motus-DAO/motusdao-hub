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
  PSM_CLINICAL_COMPLEXITY_LEVELS,
  PSM_EXCLUSION_CRITERIA,
  PSM_SERVICE_TYPES,
  PSM_EMERGENCY_PROTOCOL_OPTIONS,
} from '@/lib/intake/psm-intake-options'
import {
  PSM_MIN_WEEKLY_THERAPY_HOURS,
  PSM_MAX_WEEKLY_THERAPY_HOURS,
  getPsmWizardStepBlockers,
  resolveWeeklyTherapyHours,
  buildPsmAvailability,
} from '@/lib/intake/psm-intake-v1'
import {
  mapClinicalComplexityToUrgencyLevels,
  resolveClinicalComplexityLevels,
  resolveCountriesWhereCanReceivePatients,
  resolveCredentialedCountries,
  resolveEmergencyProtocolStatus,
  resolveExcludedCases,
  resolveServiceTypes,
} from '@/lib/intake/psm-operations-compat'
import { resolvePsmTimezoneDefault } from '@/lib/intake/psm-timezone-options'
import { PsmChipGroup } from '../PsmChipGroup'
import { PsmTagSelect } from '../PsmTagSelect'
import { PsmSectionBlock } from '../PsmSectionBlock'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'
import { PsmTimezoneSelect } from '../PsmTimezoneSelect'

const emergencyProtocolEnum = z.enum([
  'own_protocol',
  'institutional_protocol',
  'not_yet',
  'want_motus_guidance',
])

const schema = z.object({
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  weeklyTherapyHours: z.coerce
    .number()
    .int('Las horas deben ser un número entero')
    .min(PSM_MIN_WEEKLY_THERAPY_HOURS, `Indica al menos ${PSM_MIN_WEEKLY_THERAPY_HOURS} hora semanal`)
    .max(
      PSM_MAX_WEEKLY_THERAPY_HOURS,
      `Indica como máximo ${PSM_MAX_WEEKLY_THERAPY_HOURS} horas semanales`
    ),
  maxActiveUsers: z.coerce.number().int().positive('El cupo máximo debe ser mayor a 0'),
  credentialedCountries: z
    .array(z.string())
    .min(1, 'Selecciona al menos un país con cédula, licencia o registro'),
  countriesWhereCanReceivePatients: z
    .array(z.string())
    .min(1, 'Selecciona al menos un país donde declaras poder recibir pacientes'),
  serviceTypes: z.array(z.string()).min(1, 'Selecciona al menos un tipo de servicio'),
  clinicalComplexityLevels: z
    .array(
      z.enum(['low_complexity', 'medium_complexity', 'high_with_support', 'no_active_crisis'])
    )
    .min(1, 'Selecciona al menos un nivel de complejidad clínica'),
  excludedCases: z
    .array(z.string())
    .default([]),
  emergencyProtocolStatus: emergencyProtocolEnum,
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
      credentialedCountries: resolveCredentialedCountries(data),
      countriesWhereCanReceivePatients: resolveCountriesWhereCanReceivePatients(data),
      serviceTypes: resolveServiceTypes(data),
      clinicalComplexityLevels: resolveClinicalComplexityLevels(data) as FormData['clinicalComplexityLevels'],
      excludedCases: resolveExcludedCases(data),
      emergencyProtocolStatus: resolveEmergencyProtocolStatus(data) as FormData['emergencyProtocolStatus'] | undefined,
      timezone: resolvePsmTimezoneDefault({
        timezone: data.timezone,
        pais: data.pais,
        browserTimezone: browserTz,
      }),
      weeklyTherapyHours: resolveWeeklyTherapyHours(data) ?? PSM_MIN_WEEKLY_THERAPY_HOURS,
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
    const merged = { ...data, ...formData }
    updateData({
      ...formData,
      licensedCountries: formData.credentialedCountries,
      licensedRegions: formData.countriesWhereCanReceivePatients,
      exclusionCriteria: formData.excludedCases,
      worksWithUrgencyLevels: mapClinicalComplexityToUrgencyLevels(formData.clinicalComplexityLevels),
      isAcceptingPatients: formData.isAcceptingUsers,
      maxActivePatients: formData.maxActiveUsers,
      availability: buildPsmAvailability(merged),
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
    <form onSubmit={handleSubmit(onSubmit, () => setShowBlockers(true))} className="space-y-8">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}

      <PsmSectionBlock title="Disponibilidad">
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
            <label className="block text-sm font-medium">Cupo máximo de usuarios activos *</label>
            <p className="text-xs text-muted-foreground">
              Número aproximado de personas que puedes acompañar simultáneamente sin afectar la
              calidad de atención.
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
      </PsmSectionBlock>

      <PsmSectionBlock title="Jurisdicción y alcance">
        <PsmChipGroup
          label="País(es) donde tienes cédula, licencia o registro profesional *"
          options={PSM_PAISES}
          selected={watch('credentialedCountries') || []}
          onChange={(next) => setValue('credentialedCountries', next, { shouldValidate: true })}
          hasError={!!errors.credentialedCountries}
          columns={3}
        />
        {errors.credentialedCountries && (
          <p className="text-red-400 text-sm">{errors.credentialedCountries.message}</p>
        )}

        <PsmChipGroup
          label="Países donde declaras poder recibir pacientes *"
          hint="Esta selección no implica autorización automática de MotusDAO. Cada profesional declara su alcance de práctica y MotusDAO puede revisar credenciales, país de habilitación, tipo de servicio y nivel de riesgo antes de asignar pacientes."
          options={PSM_PAISES}
          selected={watch('countriesWhereCanReceivePatients') || []}
          onChange={(next) =>
            setValue('countriesWhereCanReceivePatients', next, { shouldValidate: true })
          }
          hasError={!!errors.countriesWhereCanReceivePatients}
          columns={3}
        />
        {errors.countriesWhereCanReceivePatients && (
          <p className="text-red-400 text-sm">{errors.countriesWhereCanReceivePatients.message}</p>
        )}

        <PsmChipGroup
          label="Tipo de servicios que deseas ofrecer en MotusDAO *"
          options={PSM_SERVICE_TYPES}
          selected={watch('serviceTypes') || []}
          onChange={(next) => setValue('serviceTypes', next, { shouldValidate: true })}
          hasError={!!errors.serviceTypes}
          columns={2}
        />
        {errors.serviceTypes && (
          <p className="text-red-400 text-sm">{errors.serviceTypes.message}</p>
        )}
      </PsmSectionBlock>

      <PsmSectionBlock title="Límites clínicos">
        <PsmChipGroup
          label="Nivel de complejidad clínica que aceptas en teleterapia *"
          hint="Selecciona el nivel de complejidad que puedes atender de forma segura dentro de un entorno de teleterapia. MotusDAO no debe usarse como servicio de emergencia."
          options={PSM_CLINICAL_COMPLEXITY_LEVELS}
          selected={watch('clinicalComplexityLevels') || []}
          onChange={(next) =>
            setValue('clinicalComplexityLevels', next as FormData['clinicalComplexityLevels'], {
              shouldValidate: true,
            })
          }
          hasError={!!errors.clinicalComplexityLevels}
        />
        {errors.clinicalComplexityLevels && (
          <p className="text-red-400 text-sm">{errors.clinicalComplexityLevels.message}</p>
        )}

        <PsmTagSelect
          label="Casos que tú prefieres no atender en MotusDAO (opcional)"
          hint="Si quieres, declara qué tipos de casos normalmente derivas a otros servicios (crisis, riesgo alto, población fuera de tu alcance, etc.). Puedes dejarlo vacío y completarlo después."
          options={PSM_EXCLUSION_CRITERIA}
          value={watch('excludedCases') || []}
          onChange={(next) => setValue('excludedCases', next, { shouldValidate: true })}
          hasError={!!errors.excludedCases}
          errorMessage={errors.excludedCases?.message}
          columns={2}
          addPlaceholder="Otro caso que no atiendes (ej. trastornos alimentarios activos)"
        />

        <fieldset className="space-y-3">
          <legend className="block text-sm font-medium">
            ¿Tienes protocolo de derivación o emergencia? *
          </legend>
          <div className="space-y-2">
            {PSM_EMERGENCY_PROTOCOL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 glass rounded-xl cursor-pointer hover:bg-white/10"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register('emergencyProtocolStatus')}
                  className="w-4 h-4"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
          {errors.emergencyProtocolStatus && (
            <p className="text-red-400 text-sm">{errors.emergencyProtocolStatus.message}</p>
          )}
        </fieldset>
      </PsmSectionBlock>

      <PsmSectionBlock title="Preferencias de plataforma">
        <p className="text-sm text-muted-foreground">
          Servicios que me gustaría recibir por parte de MotusDAO.
        </p>
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
      </PsmSectionBlock>

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
