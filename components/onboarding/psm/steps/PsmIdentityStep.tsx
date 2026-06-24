'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone, Calendar, MapPin, AlertCircle } from 'lucide-react'
import { FileUploadField } from '@/components/ui/FileUploadField'
import { useOnboardingStore } from '@/lib/onboarding-store'
import {
  inputFieldClass,
  normalizePhone,
} from '@/lib/onboarding-form-helpers'
import { PSM_PAISES } from '@/lib/intake/psm-intake-options'
import { getPsmWizardStepBlockers } from '@/lib/intake/psm-intake-v1'
import { PsmStepValidationBanner } from '../PsmStepValidationBanner'
import {
  getFileNameFromStoragePath,
  uploadProfileAvatar,
} from '@/lib/storage-client'

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
  formacionAcademica: z.string().min(1, 'La formación académica es obligatoria'),
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

  const {
    register,
    handleSubmit,
    getValues,
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
      formacionAcademica: data.formacionAcademica || '',
      experienciaAnios: data.experienciaAnios ?? 0,
    },
  })

  const uploadAvatar = async (file: File) => {
    if (!data.eoaAddress) throw new Error('Conecta tu wallet antes de subir tu foto')
    const result = await uploadProfileAvatar({ file, eoaAddress: data.eoaAddress })
    updateData({ avatarUrl: result.avatarUrl, avatarStoragePath: result.storagePath })
  }

  const onSubmit = (formData: FormData) => {
    setShowBlockers(false)
    updateData({ ...formData, intakeSource: data.intakeSource || 'manual' })
    onContinue()
  }

  const blockers = showBlockers
    ? getPsmWizardStepBlockers(0, { ...data, ...(getValues() as FormData) })
    : []

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setShowBlockers(true))} className="space-y-6">
      {blockers.length > 0 && <PsmStepValidationBanner blockers={blockers} />}
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

      <div className="border-t border-white/10 pt-6 space-y-4">
        <h3 className="text-lg font-semibold">Credenciales profesionales</h3>
        <Field label="Cédula profesional *" error={errors.cedulaProfesional?.message}>
          <input
            {...register('cedulaProfesional')}
            placeholder="Ej: 12345678"
            className={inputFieldClass(!!errors.cedulaProfesional)}
          />
        </Field>
        <Field label="Formación académica *" error={errors.formacionAcademica?.message}>
          <input
            {...register('formacionAcademica')}
            placeholder="Ej: Licenciatura en Psicología, Universidad Nacional"
            className={inputFieldClass(!!errors.formacionAcademica)}
          />
        </Field>
        <Field label="Años de experiencia *" error={errors.experienciaAnios?.message}>
          <input
            {...register('experienciaAnios')}
            type="number"
            min={0}
            className={inputFieldClass(!!errors.experienciaAnios)}
          />
        </Field>
      </div>

      <div className="flex justify-end">
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
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
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
