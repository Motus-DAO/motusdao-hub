'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CreditCard,
  History,
  Landmark,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'

type HubCard = {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

function shortAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export default function FinanzasPage() {
  const { role } = useUIStore()
  const { authenticated } = useWallet()
  const { wallets } = useWallets()
  const address = getEOAAddress(wallets)
  const isPsm = role !== 'usuario'

  const cards: HubCard[] = [
    {
      href: '/pagos',
      title: 'Wallet',
      description: 'Saldos, enviar, recibir y comprar wFIAT con Ripio.',
      icon: Wallet,
    },
    {
      href: '/finanzas/actividad',
      title: 'Actividad',
      description: 'Todo lo que entró y salió, con hash y comprobante.',
      icon: History,
    },
    ...(isPsm
      ? [
          {
            href: '/cobros',
            title: 'Cobros',
            description: 'Stripe, CLABE/SPEI, depósitos y saldos del profesional.',
            icon: CreditCard,
          } satisfies HubCard,
        ]
      : []),
    {
      href: '/finanzas/metodos',
      title: 'Métodos',
      description: 'Wallet, Ripio, tarjeta y CLABE en un solo lugar.',
      icon: Landmark,
    },
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagos, cobros y movimientos de tu cuenta
            {authenticated && address ? ` · ${shortAddress(address)}` : ''}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <GlassCard className="h-full p-5 transition-colors group-hover:border-mauve-500/40">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <h2 className="mt-3 text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </GlassCard>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Las rutas de cobros (Stripe) no cambian: el hub solo las reúne. Los pagos con tarjeta y
          SPEI se siguen gestionando en <Link href="/cobros" className="underline">Cobros</Link> y{' '}
          <Link href="/perfil" className="underline">Perfil</Link>.
        </p>
      </div>
    </div>
  )
}
