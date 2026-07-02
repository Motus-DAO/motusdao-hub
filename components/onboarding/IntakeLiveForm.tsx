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
  composeFormacionAcademica,
  parseFormacionAcademica,
} from '@/lib/intake/psm-formacion-academica'
import {
  resolveCredentialedCountries,
  resolveCountriesWhereCanReceivePatients,
  resolveServiceTypes,
  resolveClinicalComplexityLevels,
  resolveExcludedCases,
  resolveEmergencyProtocolStatus,
} from '@/lib/intake/psm-operations-compat'
import { PsmSectionBlock } from '@/components/onboarding/psm/PsmSectionBlock'
import { inputFieldClass } from '@/lib/onboarding-form-helpers'

type Props = {
  role: UserRole
  defaultOpen?: boolean
  alwaysOpen?: boolean
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
    inputFieldClass(false),
    'px-3 py-2 text-sm',
    highlighted && 'border-amber-400/60 ring-2 ring-amber-400/30 bg-amber-50/50 dark:bg-amber-500/5'
  )

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={2}
          className={cn(cls, 'resize-none min-h-[4.5rem]')}
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
    <label className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground cursor-pointer hover:bg-muted/40 transition-colors">
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
  alwaysOpen = false,
  highlightKeys = [],
  className,
}: Props) {
  const { data, updateData } = useOnboardingStore()
  const [open, setOpen] = useState(alwaysOpen || defaultOpen || highlightKeys.length > 0)
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

  const formContent = (
    <div className="space-y-6 p-4 md:p-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Edita cualquier campo. Los cambios se guardan automáticamente y se sincronizan con el chat.
      </p>

      <PsmSectionBlock title="Datos personales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </PsmSectionBlock>

      {role === 'usuario' ? (
        <>
          <PsmSectionBlock title="Motivo de consulta">
            <LiveInput
              label={fieldLabel('problematica')}
              value={data.problematica || ''}
              onChange={(v) => set('problematica', v)}
              textarea
            />
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">
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
                          ? 'border-mauve-500 bg-mauve-500/15 text-mauve-800 dark:text-white'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-mauve-500/40'
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </PsmSectionBlock>

          <PsmSectionBlock title="Preferencias">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </PsmSectionBlock>

          <PsmSectionBlock title="Consentimientos">
            <div className="space-y-2">
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
          </PsmSectionBlock>
        </>
      ) : (
        <>
          <PsmSectionBlock title="Credenciales profesionales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LiveInput
                label={fieldLabel('cedulaProfesional')}
                value={data.cedulaProfesional || ''}
                onChange={(v) => set('cedulaProfesional', v)}
                highlighted={hi('cedulaProfesional')}
              />
              <LiveInput
                label={fieldLabel('experienciaAnios')}
                value={data.experienciaAnios?.toString() || ''}
                onChange={(v) => set('experienciaAnios', Number(v) || 0)}
                type="number"
                highlighted={hi('experienciaAnios')}
              />
            </div>
            <FormacionAcademicaLiveFields
              value={data.formacionAcademica}
              onChange={(v) => set('formacionAcademica', v)}
            />
          </PsmSectionBlock>

          <PsmSectionBlock title="Perfil profesional">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LiveInput
                label={fieldLabel('therapyStyles')}
                value={(data.therapyStyles || []).join(', ')}
                onChange={(v) =>
                  set(
                    'therapyStyles',
                    v.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                highlighted={hi('therapyStyles')}
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
                highlighted={hi('especialidades')}
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
          </PsmSectionBlock>

          <PsmSectionBlock title="Operaciones y alcance">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
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
              <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300/90 space-y-1">
                {data.cedulaDocumentPath && (
                  <p>✓ {fieldLabel('cedulaDocumentPath')}: subido</p>
                )}
                {data.tituloDocumentPath && (
                  <p>✓ {fieldLabel('tituloDocumentPath')}: subido</p>
                )}
              </div>
            )}
          </PsmSectionBlock>
        </>
      )}
    </div>
  )

  if (alwaysOpen) {
    return (
      <section className={cn('rounded-xl border border-border overflow-hidden', className)}>
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Formulario de registro</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filledCount} campos con datos · sincronizado con el chat
          </p>
        </div>
        {formContent}
      </section>
    )
  }

  return (
    <div className={cn('w-full rounded-xl border border-border overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <div>
          <span className="text-sm font-semibold text-foreground">Formulario de registro</span>
          <p className="text-xs text-muted-foreground mt-0.5">{filledCount} campos con datos</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
            {formContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FormacionAcademicaLiveFields({
  value,
  onChange,
}: {
  value?: string
  onChange: (composed: string) => void
}) {
  const parts = parseFormacionAcademica(value)

  const update = (patch: Partial<typeof parts>) => {
    onChange(
      composeFormacionAcademica({
        tituloProfesional: patch.tituloProfesional ?? parts.tituloProfesional,
        universidad: patch.universidad ?? parts.universidad,
        posgrado: patch.posgrado ?? parts.posgrado,
      })
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background/50 p-4">
      <p className="text-xs font-medium text-muted-foreground">Formación académica</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LiveInput
          label="Título o grado"
          value={parts.tituloProfesional}
          onChange={(v) => update({ tituloProfesional: v })}
        />
        <LiveInput
          label="Universidad o institución"
          value={parts.universidad}
          onChange={(v) => update({ universidad: v })}
        />
      </div>
      <LiveInput
        label="Posgrado (opcional)"
        value={parts.posgrado || ''}
        onChange={(v) => update({ posgrado: v })}
      />
    </div>
  )
}
