'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnboardingStore, type UserRole, type OnboardingData } from '@/lib/onboarding-store'
import { fieldLabel } from '@/lib/intake-chat-progress'
import { concernOptions, deriveConcernFields } from '@/lib/intake-concerns'
import { computePsmIntakeProgress, resolveProfessionalNarrative, resolveWeeklyTherapyHours } from '@/lib/intake/psm-intake-v1'
import {
  resolveCredentialedCountries,
  resolveCountriesWhereCanReceivePatients,
  resolveServiceTypes,
  resolveClinicalComplexityLevels,
  resolveExcludedCases,
  resolveEmergencyProtocolStatus,
} from '@/lib/intake/psm-operations-compat'

type Props = {
  role: UserRole
  defaultOpen?: boolean
  highlightKeys?: string[]
  className?: string
}

function LiveInput({
  label,
  value,
  onChange,
  type = 'text',
  textarea,
  highlighted,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  textarea?: boolean
  highlighted?: boolean
}) {
  const cls = cn(
    'w-full rounded-lg border bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder:text-white/25 outline-none transition-colors',
    highlighted
      ? 'border-amber-400/60 ring-2 ring-amber-400/30'
      : 'border-white/10 focus:border-mauve-500/50 focus:ring-1 focus:ring-mauve-500/30'
  )

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-white/60">{label}</span>
      {textarea ? (
        <textarea
          rows={2}
          className={cn(cls, 'resize-none')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

function LiveCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-white/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>{label}</span>
    </label>
  )
}

export function IntakeLiveForm({
  role,
  defaultOpen = false,
  highlightKeys = [],
  className,
}: Props) {
  const { data, updateData } = useOnboardingStore()
  const [open, setOpen] = useState(defaultOpen || highlightKeys.length > 0)
  const hi = (key: string) => highlightKeys.includes(key)

  const set = (key: string, value: unknown) => {
    updateData({ [key]: value } as never)
  }

  const toggleConcern = (value: string) => {
    const current = data.clinicalConcern || []
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]
    const fields = deriveConcernFields({ clinicalConcern: next, problematica: data.problematica })

    updateData({
      clinicalConcern: next,
      tipoAtencion: next[0] || fields.tipoAtencion,
    })
  }

  const filledCount =
    role === 'psm'
      ? computePsmIntakeProgress(data).filledCount
      : Object.entries(data).filter(([, v]) => {
          if (v == null || v === '') return false
          if (Array.isArray(v)) return v.length > 0
          if (typeof v === 'boolean') return v
          return String(v).trim().length > 0
        }).length

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-white/50 hover:text-white/70 transition-colors"
      >
        <span>
          Formulario de registro · {filledCount} campos con datos
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] text-white/40">
                Edita cualquier campo. Los cambios se guardan automáticamente y se sincronizan con el chat.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LiveInput
                  label={fieldLabel('nombre')}
                  value={data.nombre || ''}
                  onChange={(v) => set('nombre', v)}
                  highlighted={hi('nombre')}
                />
                <LiveInput
                  label={fieldLabel('apellido')}
                  value={data.apellido || ''}
                  onChange={(v) => set('apellido', v)}
                  highlighted={hi('apellido')}
                />
                <LiveInput
                  label={fieldLabel('telefono')}
                  value={data.telefono || ''}
                  onChange={(v) => set('telefono', v)}
                  highlighted={hi('telefono')}
                />
                <LiveInput
                  label={fieldLabel('fechaNacimiento')}
                  value={data.fechaNacimiento || ''}
                  onChange={(v) => set('fechaNacimiento', v)}
                  type="date"
                  highlighted={hi('fechaNacimiento')}
                />
                <LiveInput
                  label={fieldLabel('ciudad')}
                  value={data.ciudad || ''}
                  onChange={(v) => set('ciudad', v)}
                  highlighted={hi('ciudad')}
                />
                <LiveInput
                  label={fieldLabel('pais')}
                  value={data.pais || ''}
                  onChange={(v) => set('pais', v)}
                  highlighted={hi('pais')}
                />
              </div>

              {role === 'usuario' ? (
                <>
                  <LiveInput
                    label={fieldLabel('problematica')}
                    value={data.problematica || ''}
                    onChange={(v) => set('problematica', v)}
                    textarea
                  />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-white/60">
                      {fieldLabel('clinicalConcern')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {concernOptions.map(option => {
                        const active = (data.clinicalConcern || []).includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleConcern(option.value)}
                            className={cn(
                              'rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                              active
                                ? 'border-mauve-400 bg-mauve-500/25 text-white'
                                : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80'
                            )}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <LiveInput
                      label={fieldLabel('preferenciaAsignacion')}
                      value={data.preferenciaAsignacion || ''}
                      onChange={(v) =>
                        set('preferenciaAsignacion', v as 'automatica' | 'explorar')
                      }
                    />
                    <LiveInput
                      label={fieldLabel('urgencyLevel')}
                      value={data.urgencyLevel || ''}
                      onChange={(v) => set('urgencyLevel', v)}
                    />
                    <LiveInput
                      label={fieldLabel('preferredModality')}
                      value={data.preferredModality || ''}
                      onChange={(v) => set('preferredModality', v)}
                    />
                    <LiveInput
                      label={fieldLabel('languages')}
                      value={(data.languages || []).join(', ')}
                      onChange={(v) =>
                        set(
                          'languages',
                          v.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                    />
                  </div>
                  <LiveInput
                    label={fieldLabel('availabilityNotes')}
                    value={data.availabilityNotes || ''}
                    onChange={(v) => {
                      set('availabilityNotes', v)
                      set('availability', { notes: v })
                    }}
                    textarea
                  />
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <LiveCheckbox
                      label={fieldLabel('consentToAIProcessing')}
                      checked={data.consentToAIProcessing ?? false}
                      onChange={(v) => set('consentToAIProcessing', v)}
                    />
                    <LiveCheckbox
                      label={fieldLabel('consentToShareWithPSM')}
                      checked={data.consentToShareWithPSM ?? false}
                      onChange={(v) => set('consentToShareWithPSM', v)}
                    />
                    <LiveCheckbox
                      label={fieldLabel('consentToClinicalMatching')}
                      checked={data.consentToClinicalMatching ?? false}
                      onChange={(v) => set('consentToClinicalMatching', v)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <LiveInput
                      label={fieldLabel('cedulaProfesional')}
                      value={data.cedulaProfesional || ''}
                      onChange={(v) => set('cedulaProfesional', v)}
                    />
                    <LiveInput
                      label={fieldLabel('experienciaAnios')}
                      value={data.experienciaAnios?.toString() || ''}
                      onChange={(v) => set('experienciaAnios', Number(v) || 0)}
                      type="number"
                    />
                  </div>
                  <LiveInput
                    label={fieldLabel('formacionAcademica')}
                    value={data.formacionAcademica || ''}
                    onChange={(v) => set('formacionAcademica', v)}
                    textarea
                  />
                  <LiveInput
                    label={fieldLabel('professionalNarrative')}
                    value={resolveProfessionalNarrative(data)}
                    onChange={(v) => {
                      set('professionalNarrative', v)
                      set('biografia', v)
                    }}
                    textarea
                    highlighted={hi('professionalNarrative')}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <LiveInput
                      label={fieldLabel('therapyStyles')}
                      value={(data.therapyStyles || []).join(', ')}
                      onChange={(v) =>
                        set(
                          'therapyStyles',
                          v.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                    />
                    <LiveInput
                      label={fieldLabel('especialidades')}
                      value={(data.especialidades || []).join(', ')}
                      onChange={(v) =>
                        set(
                          'especialidades',
                          v.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                    />
                    <LiveInput
                      label={fieldLabel('languages')}
                      value={(data.languages || []).join(', ')}
                      onChange={(v) =>
                        set(
                          'languages',
                          v.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                    />
                    <LiveInput
                      label={fieldLabel('weeklyTherapyHours')}
                      value={String(resolveWeeklyTherapyHours(data) ?? '')}
                      onChange={(v) => {
                        const n = Number(v) || 0
                        set('weeklyTherapyHours', n)
                        set('availability', { weeklyTherapyHours: n })
                      }}
                      type="number"
                    />
                  </div>
                  <LiveInput
                    label={fieldLabel('maxActiveUsers')}
                    value={String(data.maxActiveUsers ?? data.maxActivePatients ?? '')}
                    onChange={(v) => {
                      const n = Number(v) || 0
                      set('maxActiveUsers', n)
                      set('maxActivePatients', n)
                    }}
                    type="number"
                  />
                  <LiveInput
                    label={fieldLabel('credentialedCountries')}
                    value={resolveCredentialedCountries(data).join(', ')}
                    onChange={(v) =>
                      set(
                        'credentialedCountries',
                        v.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                  <LiveInput
                    label={fieldLabel('countriesWhereCanReceivePatients')}
                    value={resolveCountriesWhereCanReceivePatients(data).join(', ')}
                    onChange={(v) =>
                      set(
                        'countriesWhereCanReceivePatients',
                        v.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                  <LiveInput
                    label={fieldLabel('serviceTypes')}
                    value={resolveServiceTypes(data).join(', ')}
                    onChange={(v) => set('serviceTypes', v.split(',').map((s) => s.trim()).filter(Boolean))}
                  />
                  <LiveInput
                    label={fieldLabel('clinicalComplexityLevels')}
                    value={resolveClinicalComplexityLevels(data).join(', ')}
                    onChange={(v) =>
                      set(
                        'clinicalComplexityLevels',
                        v.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                  <LiveInput
                    label={fieldLabel('excludedCases')}
                    value={resolveExcludedCases(data).join(', ')}
                    onChange={(v) => {
                      const next = v.split(',').map((s) => s.trim()).filter(Boolean)
                      set('excludedCases', next)
                      set('exclusionCriteria', next)
                    }}
                  />
                  <LiveInput
                    label={fieldLabel('emergencyProtocolStatus')}
                    value={resolveEmergencyProtocolStatus(data) || ''}
                    onChange={(v) => set('emergencyProtocolStatus', v as OnboardingData['emergencyProtocolStatus'])}
                  />
                  {(data.cedulaDocumentPath || data.tituloDocumentPath) && (
                    <div className="text-xs text-emerald-300/90 space-y-1">
                      {data.cedulaDocumentPath && (
                        <p>✓ {fieldLabel('cedulaDocumentPath')}: subido</p>
                      )}
                      {data.tituloDocumentPath && (
                        <p>✓ {fieldLabel('tituloDocumentPath')}: subido</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
