import { Building2, CreditCard, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethods } from '@/lib/psm/payment-methods'

const METHODS = [
  {
    key: 'wallet' as const,
    label: 'Wallet',
    title: 'Pago con wMXN en escrow',
    icon: Wallet,
    className: 'border-mauve-500/30 bg-mauve-500/10 text-mauve-200',
  },
  {
    key: 'card' as const,
    label: 'Tarjeta',
    title: 'Pago con tarjeta (Stripe)',
    icon: CreditCard,
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  {
    key: 'spei' as const,
    label: 'SPEI',
    title: 'Transferencia bancaria SPEI',
    icon: Building2,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
]

export function PaymentMethodTags({
  methods,
  className,
}: {
  methods: PaymentMethods
  className?: string
}) {
  const active = METHODS.filter((method) => methods[method.key])
  if (active.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        Sin métodos de pago activos
      </p>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {active.map((method) => {
        const Icon = method.icon
        return (
          <span
            key={method.key}
            title={method.title}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              method.className
            )}
          >
            <Icon className="h-3 w-3" />
            {method.label}
          </span>
        )
      })}
    </div>
  )
}
