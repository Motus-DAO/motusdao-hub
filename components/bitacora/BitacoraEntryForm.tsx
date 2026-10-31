'use client'

import {
  BITACORA_ENTRY_KIND_META,
  type BitacoraEntryKind,
} from '@/lib/safe-notes/entry-types'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { BitacoraKindPicker } from '@/components/bitacora/BitacoraKindPicker'
import { Heart, Smile, Frown, Meh, TrendingUp } from 'lucide-react'

const moodIcons = {
  happy: Smile,
  sad: Frown,
  anxious: TrendingUp,
  calm: Heart,
  neutral: Meh,
}

const moodColors = {
  happy: 'text-yellow-500',
  sad: 'text-blue-500',
  anxious: 'text-red-500',
  calm: 'text-green-500',
  neutral: 'text-gray-500',
}

export type BitacoraFormState = {
  kind: BitacoraEntryKind
  title: string
  content: string
  mood: string
  tags: string
}

type Props = {
  editing: boolean
  formData: BitacoraFormState
  isSubmitting: boolean
  onChange: (next: BitacoraFormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function BitacoraEntryForm({
  editing,
  formData,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const meta = BITACORA_ENTRY_KIND_META[formData.kind]

  return (
    <GlassCard className="p-6 min-w-0 overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-0.5">
            {editing ? 'Editar entrada' : 'Nueva entrada cifrada'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>
        <div className="shrink-0">
          <label htmlFor="bitacora-kind-picker" className="sr-only">
            Categoría
          </label>
          <BitacoraKindPicker
            id="bitacora-kind-picker"
            value={formData.kind}
            disabled={isSubmitting}
            onChange={(kind) => {
              const k = BITACORA_ENTRY_KIND_META[kind]
              onChange({
                ...formData,
                kind,
                mood: k.showMood ? formData.mood : 'neutral',
              })
            }}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Título <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onChange({ ...formData, title: e.target.value })}
            placeholder="Para encontrarla rápido en la lista"
            className="w-full p-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{meta.contentLabel}</label>
          <textarea
            value={formData.content}
            onChange={(e) => onChange({ ...formData, content: e.target.value })}
            placeholder={meta.contentPlaceholder}
            className="w-full p-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-y min-h-[10rem]"
            rows={7}
            required
            disabled={isSubmitting}
            autoFocus={!editing}
          />
        </div>

        {meta.showMood && (
          <div>
            <label className="block text-sm font-medium mb-2">Estado de ánimo</label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Estado de ánimo">
              {Object.entries(moodIcons).map(([mood, Icon]) => {
                const on = formData.mood === mood
                return (
                  <button
                    key={mood}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ ...formData, mood })}
                    disabled={isSubmitting}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all ${
                      on
                        ? 'border-mauve-500 bg-mauve-500/20'
                        : 'border-white/10 hover:border-white/20'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${moodColors[mood as keyof typeof moodColors]}`} />
                    <span className="capitalize text-sm">{mood}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <details className="group rounded-xl border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            Etiquetas (opcional)
          </summary>
          <div className="px-3 pb-3 pt-0">
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => onChange({ ...formData, tags: e.target.value })}
              placeholder="trabajo, personal, sesión…"
              className="w-full p-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
              disabled={isSubmitting}
            />
          </div>
        </details>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <CTAButton type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'} entrada
          </CTAButton>
          <CTAButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </CTAButton>
        </div>
      </form>
    </GlassCard>
  )
}
