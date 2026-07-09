'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OnboardingModalProps = {
  open: boolean
  onClose?: () => void
  children: ReactNode
  className?: string
  panelClassName?: string
  closeLabel?: string
}

/**
 * Opaque modal surface for onboarding — readable in light and dark themes.
 * Avoids transparent GlassCard over dark overlays.
 */
export function OnboardingModal({
  open,
  onClose,
  children,
  className,
  panelClassName,
  closeLabel = 'Cerrar',
}: OnboardingModalProps) {
  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn('relative w-full max-w-lg', panelClassName)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={cn(
            'relative rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
            'p-6 md:p-8 text-left'
          )}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={closeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </motion.div>
    </div>
  )
}
