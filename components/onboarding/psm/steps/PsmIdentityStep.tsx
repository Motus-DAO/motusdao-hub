'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone, Calendar, MapPin, AlertCircle, GraduationCap } from 'lucide-react'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { useOnboardingStore } from '@/lib/onboarding-store'
import {
  inputFieldClass,
  normalizePhone,
} from '@/lib/onboarding-form-helpers'
import { PSM_PAISES } from '@/lib/intake/psm-intake-options'
import { getPsmWizardStepBlockers } from '@/lib/intake/psm-intake-v1'
import {
  composeFormacionAcademica,
  parseFormacionAcademica,
} from '@/lib/intake/psm-formacion-academica'
import { PsmSectionBlock } from '../PsmSectionBlock'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import {
  getFileNameFromStoragePath,
  uploadProfileAvatar,
} from '@/lib/storage-client'

const parsedFormacion = (stored?: string) => parseFormacionAcademica(stored)

const schema = z.object({
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
  tituloProfesional: z.string().min(1, 'Indica tu título o grado (ej. Licenciatura en Psicología)'),
  universidad: z.string().min(1, 'Indica la universidad o institución que expidió tu título'),
  posgrado: z.string().optional(),
  experienciaAnios: z.coerce.number().min(0, 'Los años de experiencia deben ser 0 o mayor'),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

type Props = {
  onContinue: () => void
}

export function PsmIdentityStep({ onContinue }: Props) {
  const { data, updateData } = useOnboardingStore()
  const [showBlockers, setShowBlockers] = useState(false)
  const initialFormacion = parsedFormacion(data.formacionAcademica)

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      telefono: data.telefono || '',
      fechaNacimiento: data.fechaNacimiento || '',
      ciudad: data.ciudad || '',
      pais: data.pais || '',
      cedulaProfesional: data.cedulaProfesional || '',
      tituloProfesional: initialFormacion.tituloProfesional,
      universidad: initialFormacion.universidad,
      posgrado: initialFormacion.posgrado || '',
      experienciaAnios: data.experienciaAnios ?? 0,
    },
  })

  const tituloProfesional = watch('tituloProfesional')
  const universidad = watch('universidad')
  const posgrado = watch('posgrado')

  const formacionPreview = useMemo(
    () =>
      composeFormacionAcademica({
        tituloProfesional: tituloProfesional || '',
        universidad: universidad || '',
        posgrado: posgrado || '',
      }),
    [tituloProfesional, universidad, posgrado]
  )

  const uploadAvatar = async (file: File) => {
    if (!data.eoaAddress) throw new Error('Conecta tu wallet antes de subir tu foto')
    const result = await uploadProfileAvatar({ file, eoaAddress: data.eoaAddress })
    updateData({ avatarUrl: result.avatarUrl, avatarStoragePath: result.storagePath })
  }

  const onSubmit = (formData: FormData) => {
    setShowBlockers(false)
    const { tituloProfesional, universidad, posgrado, ...identityFields } = formData
    updateData({
      ...identityFields,
      formacionAcademica: composeFormacionAcademica({
        tituloProfesional,
        universidad,
        posgrado,
      }),
      intakeSource: data.intakeSource || 'manual',
    })
    onContinue()
  }

  const blockers = showBlockers
    ? (() => {
        const values = getValues() as FormData
        return getPsmWizardStepBlockers(0, {
          ...data,
          ...values,
          formacionAcademica: composeFormacionAcademica({
            tituloProfesional: values.tituloProfesional || '',
            universidad: values.universidad || '',
            posgrado: values.posgrado || '',
          }),
        })
      })()
    : []

  const formacionError =
    errors.tituloProfesional?.message || errors.universidad?.message

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setShowBlockers(true))} className="space-y-8">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}

      <PsmSectionBlock title="Foto de perfil">
        <SiweSessionBanner compact />

        <FileUploadField
          label="Foto de perfil (opcional)"
          description="Imagen visible para usuarios y en tu perfil profesional."
          accept="image/jpeg,image/png,image/webp,image/gif"
          hint="JPEG, PNG, WebP o GIF. Máximo 5MB."
          fileName={getFileNameFromStoragePath(data.avatarStoragePath)}
          previewUrl={data.avatarUrl}
          onUpload={uploadAvatar}
          onClear={() => updateData({ avatarUrl: undefined, avatarStoragePath: undefined })}
        />
      </PsmSectionBlock>

      <PsmSectionBlock title="Datos personales">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre *" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputFieldClass(!!errors.nombre)} />
          </Field>
          <Field label="Apellidos *" error={errors.apellido?.message}>
            <input {...register('apellido')} className={inputFieldClass(!!errors.apellido)} />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Teléfono *" error={errors.telefono?.message}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('telefono')}
                type="tel"
                className={inputFieldClass(!!errors.telefono, 'pl-10')}
              />
            </div>
          </Field>
          <Field label="Fecha de nacimiento *" error={errors.fechaNacimiento?.message}>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('fechaNacimiento')}
                type="date"
                className={inputFieldClass(!!errors.fechaNacimiento, 'pl-10')}
              />
            </div>
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Ciudad *" error={errors.ciudad?.message}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('ciudad')} className={inputFieldClass(!!errors.ciudad, 'pl-10')} />
            </div>
          </Field>
          <Field label="País *" error={errors.pais?.message}>
            <select {...register('pais')} className={inputFieldClass(!!errors.pais)}>
              <option value="">Selecciona tu país</option>
              {PSM_PAISES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </PsmSectionBlock>

      <PsmSectionBlock title="Credenciales profesionales">
        <Field
          label="Cédula profesional *"
          description="Número de cédula o licencia que te habilita para ejercer. No es lo mismo que tu título universitario."
          error={errors.cedulaProfesional?.message}
        >
          <input
            {...register('cedulaProfesional')}
            placeholder="Ej: 12345678"
            className={inputFieldClass(!!errors.cedulaProfesional)}
          />
        </Field>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-mauve-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Formación académica *</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tu título de grado y la institución que lo expidió. Si tienes maestría, especialidad
                o doctorado, puedes agregarlo en el campo opcional. Esto no reemplaza la cédula ni
                los documentos que subirás más adelante.
              </p>
            </div>
          </div>

          <Field
            label="Título o grado *"
            error={errors.tituloProfesional?.message}
          >
            <input
              {...register('tituloProfesional')}
              placeholder="Ej: Licenciatura en Psicología"
              className={inputFieldClass(!!errors.tituloProfesional)}
            />
          </Field>

          <Field
            label="Universidad o institución *"
            error={errors.universidad?.message}
          >
            <input
              {...register('universidad')}
              placeholder="Ej: Universidad Nacional Autónoma de México"
              className={inputFieldClass(!!errors.universidad)}
            />
          </Field>

          <Field
            label="Posgrado (opcional)"
            description="Maestría, especialidad, doctorado u otro posgrado relevante."
          >
            <input
              {...register('posgrado')}
              placeholder="Ej: Maestría en Psicología Clínica, ITESM"
              className={inputFieldClass(false)}
            />
          </Field>

          {formacionError && !errors.tituloProfesional && !errors.universidad && (
            <p className="text-red-400 text-sm flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{formacionError}</span>
            </p>
          )}

          {formacionPreview && (
            <div className="rounded-lg border border-mauve-500/20 bg-mauve-500/5 px-3 py-2 text-left">
              <p className="text-[11px] uppercase tracking-wide text-mauve-300 mb-1">
                Vista previa en tu perfil
              </p>
              <p className="text-sm text-foreground">{formacionPreview}</p>
            </div>
          )}
        </div>

        <Field label="Años de experiencia clínica *" error={errors.experienciaAnios?.message}>
          <input
            {...register('experienciaAnios')}
            type="number"
            min={0}
            placeholder="0 si estás empezando"
            className={inputFieldClass(!!errors.experienciaAnios)}
          />
        </Field>
      </PsmSectionBlock>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-mauve-500 hover:bg-mauve-600 text-white font-medium transition-colors"
        >
          Continuar
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string
  description?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {error && (
        <p className="text-red-400 text-sm flex items-center space-x-1">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
