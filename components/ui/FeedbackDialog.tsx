'use client'

import { Loader, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { GlassCard } from './GlassCard'
import { CTAButton } from './CTAButton'
import { cn } from '@/lib/utils'

export type FeedbackDialogVariant = 'loading' | 'info' | 'warning' | 'error' | 'success'

type FeedbackAction = {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

type FeedbackDialogProps = {
  title: string
  description?: ReactNode
  children?: ReactNode
  variant?: FeedbackDialogVariant
  icon?: LucideIcon
  primaryAction?: FeedbackAction
  secondaryAction?: FeedbackAction
  onClose?: () => void
  overlay?: boolean
  className?: string
}

const iconWrap: Record<FeedbackDialogVariant, string> = {
  loading: 'bg-mauve-500/20 text-mauve-300',
  info: 'bg-white/10 text-foreground',
  warning: 'bg-amber-500/20 text-amber-300',
  error: 'bg-red-500/20 text-red-400',
  success: 'bg-emerald-500/20 text-emerald-300',
}

export function FeedbackDialog({
  title,
  description,
  children,
  variant = 'info',
  icon: Icon,
  primaryAction,
  secondaryAction,
  onClose,
  overlay = false,
  className,
}: FeedbackDialogProps) {
  const card = (
    <GlassCard
      variant="strong"
      className={cn('relative w-full max-w-md p-8', className)}
      onClick={overlay ? (event) => event.stopPropagation() : undefined}
    >
      <div
        role="dialog"
        aria-modal={overlay || undefined}
        aria-labelledby="feedback-dialog-title"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        )}

      <div className="text-center">
        <div
          className={cn(
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            iconWrap[variant]
          )}
        >
          {variant === 'loading' ? (
            <Loader className="h-6 w-6 animate-spin" />
          ) : (
            Icon && <Icon className="h-6 w-6" />
          )}
        </div>
        <h2 id="feedback-dialog-title" className="text-2xl font-bold">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>

      {children && <div className="mt-6 text-left">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          {secondaryAction && (
            <CTAButton
              type="button"
              variant="secondary"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </CTAButton>
          )}
          {primaryAction && (
            <CTAButton
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className="w-full sm:w-auto"
            >
              {primaryAction.loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  {primaryAction.label}
                </span>
              ) : (
                primaryAction.label
              )}
            </CTAButton>
          )}
        </div>
      )}
      </div>
    </GlassCard>
  )

  if (!overlay) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {card}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {card}
    </div>
  )
}
