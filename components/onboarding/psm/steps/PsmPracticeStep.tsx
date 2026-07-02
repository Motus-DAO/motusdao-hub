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
  PSM_THERAPY_STYLES,
  PSM_ESPECIALIDADES,
  getEspecialidadLabel,
} from '@/lib/intake/psm-intake-options'
import {
  PSM_MIN_NARRATIVE_LENGTH,
  PSM_MIN_ESPECIALIDADES,
  deriveTopSpecialties,
  getPsmWizardStepBlockers,
  resolveProfessionalNarrative,
} from '@/lib/intake/psm-intake-v1'
import { PsmChipGroup } from '../PsmChipGroup'
import { PsmSectionBlock } from '../PsmSectionBlock'
import { PsmTagSelect } from '../PsmTagSelect'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'

const schema = z.object({
  professionalNarrative: z
    .string()
    .min(
      PSM_MIN_NARRATIVE_LENGTH,
      `Necesitas al menos ${PSM_MIN_NARRATIVE_LENGTH} caracteres en tu descripción`
    ),
  tagline: z
    .string()
    .min(10, 'La frase de presentación debe tener al menos 10 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  especialidades: z
    .array(z.string())
    .min(
      PSM_MIN_ESPECIALIDADES,
      `Selecciona al menos ${PSM_MIN_ESPECIALIDADES} especialidades`
    ),
  therapyStyles: z.array(z.string()).min(1, 'Selecciona o escribe al menos un enfoque terapéutico'),
  languages: z.array(z.string()).min(1, 'Selecciona al menos un idioma'),
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
      tagline: data.tagline || '',
      therapyStyles: data.therapyStyles?.length ? data.therapyStyles : [],
      especialidades: data.especialidades || [],
      languages: data.languages?.length ? data.languages : ['es'],
    },
  })

  const narrative = watch('professionalNarrative') || ''
  const narrativeRemaining = Math.max(0, PSM_MIN_NARRATIVE_LENGTH - narrative.length)
  const narrativeReady = narrative.length >= PSM_MIN_NARRATIVE_LENGTH

  const especialidades = watch('especialidades') || []
  const highlightedSpecialties = deriveTopSpecialties(especialidades)

  const draftData = () => {
    const values = getValues()
    return {
      ...data,
      ...values,
      biografia: values.professionalNarrative,
      topSpecialties: deriveTopSpecialties(values.especialidades || []),
    }
  }

  const blockers = showBlockers ? getPsmWizardStepBlockers(1, draftData()) : []

  const onSubmit = (formData: FormData) => {
    setShowBlockers(false)
    updateData({
      ...formData,
      topSpecialties: deriveTopSpecialties(formData.especialidades),
      biografia: formData.professionalNarrative,
    })
    onContinue()
  }

  const onInvalid = () => setShowBlockers(true)

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}

      <PsmSectionBlock title="Describe tu práctica">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Cuéntanos sobre tu práctica profesional *
          </label>
          <p className="text-xs text-muted-foreground">
            Con tus palabras: ¿cómo trabajas, con quién te especializas y qué tipo de acompañamiento
            ofreces? Puedes añadir links a tu sitio web o redes sociales o publicaciones. (mínimo{' '}
            {PSM_MIN_NARRATIVE_LENGTH} caracteres)
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
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : narrative.length > 0
                    ? 'text-amber-700 dark:text-amber-300'
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
      </PsmSectionBlock>

      <PsmSectionBlock title="Perfil público">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Frase de presentación *</label>
          <p className="text-xs text-muted-foreground">
            Una línea cálida para pacientes (ej. &quot;Acompaño a adultos en ansiedad y transiciones de
            vida&quot;).
          </p>
          <input
            {...register('tagline')}
            maxLength={120}
            placeholder="¿Con quién trabajas y qué pueden esperar?"
            className={inputFieldClass(!!errors.tagline)}
          />
          {errors.tagline && (
            <p className="text-xs text-red-400">{errors.tagline.message}</p>
          )}
        </div>
      </PsmSectionBlock>

      <PsmSectionBlock title="Enfoque y especialización">
        <PsmTagSelect
          label="Enfoque terapéutico *"
          hint="Cómo trabajas. Marca los que apliquen o agrega el tuyo (ej. EMDR, gestalt)."
          options={PSM_THERAPY_STYLES}
          value={watch('therapyStyles') || []}
          onChange={(next) => setValue('therapyStyles', next, { shouldValidate: true })}
          hasError={!!errors.therapyStyles}
          errorMessage={errors.therapyStyles?.message}
          addPlaceholder="Otro enfoque (ej. EMDR)"
        />

        <PsmTagSelect
          label="Especialización / temas *"
          hint={`Marca al menos ${PSM_MIN_ESPECIALIDADES} temas o poblaciones. Las 3 primeras de tu lista se destacarán en tu perfil (mira la vista previa abajo).`}
          options={PSM_ESPECIALIDADES}
          value={especialidades}
          onChange={(next) => setValue('especialidades', next, { shouldValidate: true })}
          hasError={!!errors.especialidades}
          errorMessage={errors.especialidades?.message}
          columns={3}
          addPlaceholder="Otro tema (ej. perinatal)"
        />

        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            especialidades.length >= PSM_MIN_ESPECIALIDADES
              ? 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200'
              : 'border-border bg-muted/30 text-muted-foreground'
          }`}
        >
          {especialidades.length >= PSM_MIN_ESPECIALIDADES ? (
            <>
              <span className="font-medium text-emerald-800 dark:text-emerald-300">Destacadas en tu perfil: </span>
              {highlightedSpecialties.map(getEspecialidadLabel).join(' · ')}
              {especialidades.length > PSM_MIN_ESPECIALIDADES && (
                <span className="block mt-1 text-muted-foreground">
                  Las demás también aparecen en tu perfil, pero sin destacarse.
                </span>
              )}
            </>
          ) : (
            <span>
              Especialidades seleccionadas: {especialidades.length}/{PSM_MIN_ESPECIALIDADES} mínimo
            </span>
          )}
        </div>
      </PsmSectionBlock>

      <PsmSectionBlock title="Idiomas y modalidad">
        <PsmChipGroup
          label="Idiomas *"
          options={PSM_LANGUAGES}
          selected={watch('languages') || []}
          onChange={(next) => setValue('languages', next, { shouldValidate: true })}
          hasError={!!errors.languages}
        />

        <p className="text-xs text-muted-foreground">
          Las sesiones en MotusDAO son 100% teleterapia por video.
        </p>
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
