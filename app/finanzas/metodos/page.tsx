'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, CreditCard, Landmark, Wallet } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { ripioCountryFromEnv, ripioTokenForCountry } from '@/lib/ripio/public-ramp'

function shortAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export default function MetodosPage() {
  const { role } = useUIStore()
  const { authenticated } = useWallet()
  const { wallets } = useWallets()
  const address = getEOAAddress(wallets)
  const isPsm = role !== 'usuario'

  const country = ripioCountryFromEnv()
  const token = ripioTokenForCountry(country)

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/finanzas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Finanzas
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Métodos de pago</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cómo entra y sale el dinero de tu cuenta
          </p>
        </div>

        <div className="space-y-3">
          <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Wallet (WaaP)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Autocustodia. Aquí viven tus wFIAT y desde aquí envías o recibes.
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {authenticated && address ? shortAddress(address) : 'Conecta tu wallet'}
                  </p>
                </div>
              </div>
              <Link
                href="/pagos"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mauve-300 underline"
              >
                Abrir
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Ripio · {country} · {token}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compra y venta con fiat en Celo. El KYC y la cuenta bancaria se gestionan
                    dentro de Ripio; la app solo prellena y verifica.
                  </p>
                </div>
              </div>
              <Link
                href="/pagos"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mauve-300 underline"
              >
                Comprar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>

          {isPsm && (
            <>
              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold">Tarjeta (Stripe Connect)</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cobros de terapia con tarjeta y depósitos a tu banco desde el panel
                        embebido.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/cobros/cuenta"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mauve-300 underline"
                  >
                    Ver
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold">CLABE / SPEI</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cuenta bancaria para transferencias directas y confirmación manual.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/perfil"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mauve-300 underline"
                  >
                    Editar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          No movemos las rutas de cobros: Stripe tiene sus Site links configurados en
          <span className="font-mono"> /cobros/*</span> y cambiarlas rompería las sesiones live.
        </p>
      </div>
    </div>
  )
}
