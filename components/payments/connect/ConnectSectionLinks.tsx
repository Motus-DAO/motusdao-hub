import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowRight,
  CreditCard,
  FileText,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { connectSectionHref, type ConnectSection } from '@/lib/stripe-connect-paths'

const SECTIONS: Array<{
  section: Exclude<ConnectSection, 'home'>
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    section: 'account',
    title: 'Cuenta y banco',
    description: 'Identidad, RFC y cuenta bancaria para recibir depósitos.',
    icon: User,
  },
  {
    section: 'payments',
    title: 'Pagos',
    description: 'Cobros de tus sesiones, reembolsos y disputas.',
    icon: CreditCard,
  },
  {
    section: 'payouts',
    title: 'Depósitos',
    description: 'Historial y calendario de depósitos a tu banco.',
    icon: ArrowDownToLine,
  },
  {
    section: 'balances',
    title: 'Saldos',
    description: 'Disponible, pendiente y en tránsito.',
    icon: Wallet,
  },
  {
    section: 'documents',
    title: 'Documentos',
    description: 'Facturas y formas fiscales que emite Stripe.',
    icon: FileText,
  },
]

export function ConnectSectionLinks({ accountId }: { accountId: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.map(({ section, title, description, icon: Icon }) => (
        <Link
          key={section}
          href={connectSectionHref(section, accountId)}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-mauve-500/40 hover:bg-mauve-500/[0.06]"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mauve-500/15 text-mauve-300">
              <Icon className="h-4 w-4" />
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-mauve-300" />
          </div>
          <p className="mt-3 text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </Link>
      ))}
    </div>
  )
}
