'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'
import {
  PSM_LANGUAGES,
  PSM_MODALITIES,
} from '@/lib/intake/psm-intake-options'
import {
  PSM_MIN_NARRATIVE_LENGTH,
  getPsmWizardStepBlockers,
  resolveProfessionalNarrative,
} from '@/lib/intake/psm-intake-v1'
import { PsmChipGroup } from '../PsmChipGroup'
import { PsmTherapyStyleField } from '../PsmTherapyStyleField'
import { PsmEspecialidadesField } from '../PsmEspecialidadesField'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'

const schema = z.object({
  professionalNarrative: z
    .string()
    .min(
      PSM_MIN_NARRATIVE_LENGTH,
      `Necesitas al menos ${PSM_MIN_NARRATIVE_LENGTH} caracteres en tu descripción`
    ),
  especialidades: z.array(z.string()).min(1, 'Selecciona o escribe al menos una especialidad'),
  therapyStyles: z.array(z.string()).min(1, 'Selecciona o escribe al menos un enfoque terapéutico'),
  languages: z.array(z.string()).min(1, 'Selecciona al menos un idioma'),
  modalities: z
    .array(z.enum(['video', 'chat', 'in_person', 'hybrid']))
    .min(1, 'Selecciona al menos una modalidad'),
})

type FormData = z.infer<typeof schema>

type Props = {
  onContinue: () => void
  onBack: () => void
}

export function PsmPracticeStep({ onContinue, onBack }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [showBlockers, setShowBlockers] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      professionalNarrative: resolveProfessionalNarrative(data),
      therapyStyles: data.therapyStyles?.length ? data.therapyStyles : [],
      especialidades: data.especialidades || [],
      languages: data.languages?.length ? data.languages : ['es'],
      modalities: data.modalities?.length ? data.modalities : ['video'],
    },
  })

  const narrative = watch('professionalNarrative') || ''
  const narrativeRemaining = Math.max(0, PSM_MIN_NARRATIVE_LENGTH - narrative.length)
  const narrativeReady = narrative.length >= PSM_MIN_NARRATIVE_LENGTH

  const draftData = () => ({
    ...data,
    ...getValues(),
    biografia: getValues('professionalNarrative'),
  })

  const blockers = showBlockers ? getPsmWizardStepBlockers(1, draftData()) : []

  const onSubmit = (formData: FormData) => {
    setShowBlockers(false)
    updateData({
      ...formData,
      biografia: formData.professionalNarrative,
    })
    onContinue()
  }

  const onInvalid = () => setShowBlockers(true)

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Cuéntanos sobre tu práctica profesional *
        </label>
        <p className="text-xs text-muted-foreground">
          Con tus palabras: ¿cómo trabajas, con quién te especializas y qué tipo de acompañamiento
          ofreces? (mínimo {PSM_MIN_NARRATIVE_LENGTH} caracteres)
        </p>
        <textarea
          {...register('professionalNarrative')}
          rows={5}
          placeholder="Ej: Soy psicóloga clínica con enfoque integrativo. Trabajo con adultos en procesos de ansiedad, estrés laboral y transiciones de vida..."
          className={inputFieldClass(!!errors.professionalNarrative, 'resize-none')}
        />
        <div className="flex justify-between text-xs">
          <span
            className={
              narrativeReady
                ? 'text-emerald-400'
                : narrative.length > 0
                  ? 'text-amber-300'
                  : 'text-muted-foreground'
            }
          >
            {narrative.length} / {PSM_MIN_NARRATIVE_LENGTH} mín.
            {!narrativeReady && narrative.length > 0 && ` (faltan ${narrativeRemaining})`}
          </span>
          {errors.professionalNarrative && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Amplía tu descripción: faltan {narrativeRemaining} caracteres
            </span>
          )}
        </div>
      </div>

      <PsmTherapyStyleField
        value={watch('therapyStyles') || []}
        onChange={(next) => setValue('therapyStyles', next, { shouldValidate: true })}
        hasError={!!errors.therapyStyles}
        errorMessage={errors.therapyStyles?.message}
      />

      <PsmEspecialidadesField
        value={watch('especialidades') || []}
        onChange={(next) => setValue('especialidades', next, { shouldValidate: true })}
        hasError={!!errors.especialidades}
        errorMessage={errors.especialidades?.message}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <PsmChipGroup
          label="Idiomas *"
          options={PSM_LANGUAGES}
          selected={watch('languages') || []}
          onChange={(next) => setValue('languages', next, { shouldValidate: true })}
          hasError={!!errors.languages}
        />
        <PsmChipGroup
          label="Modalidades *"
          options={PSM_MODALITIES}
          selected={watch('modalities') || []}
          onChange={(next) =>
            setValue('modalities', next as FormData['modalities'], { shouldValidate: true })
          }
          hasError={!!errors.modalities}
        />
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
