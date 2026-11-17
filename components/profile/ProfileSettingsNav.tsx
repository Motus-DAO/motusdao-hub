'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Settings } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  isProfileSectionId,
  profileSectionsForRole,
  type ProfileSectionId,
} from '@/lib/profile-settings-sections'
import { cn } from '@/lib/utils'

type ProfileSettingsNavProps = {
  role?: string | null
  activeId: ProfileSectionId
  onSectionChange: (id: ProfileSectionId) => void
  className?: string
  /** sidebar = columna izquierda (desktop); scroll = chips horizontales (móvil) */
  layout?: 'sidebar' | 'scroll'
}

export function ProfileSettingsNav({
  role,
  activeId,
  onSectionChange,
  className = '',
  layout = 'sidebar',
}: ProfileSettingsNavProps) {
  const sections = useMemo(() => profileSectionsForRole(role), [role])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sections.some((s) => s.id === activeId) && sections[0]) {
      onSectionChange(sections[0].id)
    }
  }, [activeId, onSectionChange, sections])

  useEffect(() => {
    if (layout !== 'scroll') return
    const chip = document.getElementById(`profile-nav-chip-${activeId}`)
    chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeId, layout])

  if (layout === 'scroll') {
    return (
      <div className={cn('sticky top-0 z-20 mb-4', className)}>
        <GlassCard className="border border-mauve-500/35 bg-mauve-950/50 shadow-lg shadow-black/25 p-3">
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/20">
            <Settings className="h-4 w-4 text-mauve-300 shrink-0" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-mauve-200">
              Submenú del perfil
            </p>
          </div>
          <div
            ref={scrollRef}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
            role="tablist"
            aria-label="Secciones del perfil"
          >
            {sections.map((section) => {
              const isActive = activeId === section.id
              return (
                <button
                  key={section.id}
                  id={`profile-nav-chip-${section.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'relative shrink-0 snap-start rounded-md px-3 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-mauve-500 text-white shadow-md ring-1 ring-mauve-300/80'
                      : 'bg-black/45 text-mauve-100/70 border border-white/25 hover:bg-black/60 hover:text-foreground',
                  )}
                >
                  {section.label}
                  {isActive ? (
                    <span
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-white/90"
                      aria-hidden
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-mauve-200/80 mt-2 px-0.5">Desliza para ver más secciones →</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <aside className={cn('lg:max-h-[calc(100vh-8rem)] flex flex-col min-h-0', className)}>
      <GlassCard className="p-4 z-10 flex flex-col flex-1 min-h-0 lg:max-h-[calc(100vh-8rem)]">
        <div className="flex items-start gap-2 mb-3 shrink-0 pb-3 border-b border-white/10">
          <Settings className="h-5 w-5 text-mauve-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold">Ajustes</h2>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Elige una sección; el panel derecho muestra solo ese bloque.
            </p>
          </div>
        </div>

        <nav
          className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col gap-1"
          aria-label="Secciones del perfil"
        >
          {sections.map((section) => {
            const isActive = activeId === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`text-left rounded-lg transition-colors px-2.5 py-2 border-l-2 ${
                  isActive
                    ? 'border-l-mauve-400 bg-mauve-500/15'
                    : 'border-l-transparent hover:bg-white/5'
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="text-sm font-medium block leading-tight">{section.label}</span>
                <span className="text-[10px] text-muted-foreground leading-snug mt-0.5 block line-clamp-2">
                  {section.description}
                </span>
              </button>
            )
          })}
        </nav>
      </GlassCard>
    </aside>
  )
}

export function readProfileSectionFromHash(): ProfileSectionId | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  return isProfileSectionId(hash) ? hash : null
}