import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type StatusBannerVariant = 'success' | 'warning' | 'error' | 'info'

const variantStyles: Record<
  StatusBannerVariant,
  { root: string; title: string; description: string; icon: string }
> = {
  success: {
    root:
      'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/75 dark:text-emerald-100',
    title: 'font-medium text-emerald-800 dark:text-emerald-100',
    description: 'text-emerald-700 dark:text-emerald-200/90',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    root:
      'border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/75 dark:text-amber-50',
    title: 'font-medium text-amber-950 dark:text-amber-50',
    description: 'text-amber-800 dark:text-amber-100/90',
    icon: 'text-amber-600 dark:text-amber-300',
  },
  error: {
    root:
      'border-red-300/70 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/75 dark:text-red-100',
    title: 'font-medium text-red-800 dark:text-red-100',
    description: 'text-red-700 dark:text-red-200/90',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    root:
      'border-border bg-muted/50 text-foreground dark:border-white/15 dark:bg-white/5 dark:text-foreground',
    title: 'font-medium text-foreground',
    description: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
}

type Props = {
  variant?: StatusBannerVariant
  icon?: LucideIcon
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
  role?: 'alert' | 'status'
}

export function StatusBanner({
  variant = 'info',
  icon: Icon,
  title,
  description,
  children,
  className,
  role = 'status',
}: Props) {
  const styles = variantStyles[variant]

  return (
    <div
      role={role}
      data-variant={variant}
      className={cn(
        'ui-status-banner rounded-xl border px-4 py-3 text-sm',
        styles.root,
        className
      )}
    >
      <div className="flex items-start gap-2">
        {Icon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', styles.icon)} />}
        <div className="min-w-0 space-y-1">
          {title && <div className={styles.title}>{title}</div>}
          {description && (
            <div className={cn(styles.description, 'text-xs leading-relaxed')}>{description}</div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
