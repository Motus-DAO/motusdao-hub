'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowDownToLine,
  CreditCard,
  FileText,
  LayoutDashboard,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  CONNECT_PATHS,
  connectSectionHref,
  type ConnectSection,
} from '@/lib/stripe-connect-paths'
import { cn } from '@/lib/utils'

const ITEMS: Array<{ section: ConnectSection; label: string; icon: LucideIcon }> = [
  { section: 'home', label: 'Resumen', icon: LayoutDashboard },
  { section: 'account', label: 'Cuenta y banco', icon: User },
  { section: 'payments', label: 'Pagos', icon: CreditCard },
  { section: 'payouts', label: 'Depósitos', icon: ArrowDownToLine },
  { section: 'balances', label: 'Saldos', icon: Wallet },
  { section: 'documents', label: 'Documentos', icon: FileText },
]

export function CobrosNav({ accountId }: { accountId: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones de cobros" className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {ITEMS.map(({ section, label, icon: Icon }) => {
        const active = pathname === CONNECT_PATHS[section]
        return (
          <Link
            key={section}
            href={connectSectionHref(section, accountId)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition',
              active
                ? 'border-mauve-500/40 bg-mauve-500/15 text-mauve-300'
                : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
