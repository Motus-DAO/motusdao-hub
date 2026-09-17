import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type StatusBannerVariant = 'success' | 'warning' | 'error' | 'info'

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
  return (
    <div
      role={role}
      data-variant={variant}
      className={cn('ui-status-banner rounded-xl border px-4 py-3 text-sm', className)}
    >
      <div className="flex items-start gap-2">
        {Icon && (
          <Icon
            data-slot="status-banner-icon"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
        )}
        <div data-slot="status-banner-content" className="min-w-0 space-y-1">
          {title && (
            <div data-slot="status-banner-title" className="font-medium">
              {title}
            </div>
          )}
          {description && (
            <div
              data-slot="status-banner-description"
              className="text-xs leading-relaxed"
            >
              {description}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
