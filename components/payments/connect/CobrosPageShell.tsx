import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3 } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { connectSectionHref } from '@/lib/stripe-connect-paths'
import { CobrosNav } from './CobrosNav'
import { ConnectOnboardingButton } from './ConnectOnboardingButton'

type CobrosPageShellProps = {
  title: string
  description: string
  accountId: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  children: ReactNode
}

export function CobrosPageShell({
  title,
  description,
  accountId,
  chargesEnabled,
  payoutsEnabled,
  children,
}: CobrosPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Section padding="md">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            href={connectSectionHref('home', accountId)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Panel de cobros
          </Link>

          <header className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mauve-400">
              Cobros con tarjeta
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </header>

          <CobrosNav accountId={accountId} />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                {chargesEnabled ? (
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {chargesEnabled ? 'Puedes cobrar con tarjeta' : 'Verificación pendiente'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chargesEnabled
                      ? 'Stripe ya activó los cobros en tu cuenta conectada.'
                      : 'Stripe todavía necesita verificar tu identidad, RFC y cuenta bancaria.'}
                  </p>
                </div>
              </div>
              {!chargesEnabled && (
                <ConnectOnboardingButton
                  className="mt-4"
                  label="Terminar verificación en Stripe"
                />
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                {payoutsEnabled ? (
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {payoutsEnabled ? 'Depósitos activos' : 'Depósitos pendientes'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {payoutsEnabled
                      ? 'Stripe deposita a tu cuenta bancaria según tu calendario.'
                      : 'Agrega o confirma tu cuenta bancaria para recibir depósitos.'}
                  </p>
                </div>
              </div>
              {!payoutsEnabled && (
                <Link
                  href={connectSectionHref('account', accountId)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-mauve-300 transition hover:text-mauve-200"
                >
                  Revisar cuenta y banco
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">{children}</div>

          <footer className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-muted-foreground">
            Cuenta conectada{' '}
            <span className="font-mono text-foreground">{accountId}</span>. Los cobros y depósitos
            los procesa Stripe directamente en tu cuenta; Motus no custodia tu dinero.
          </footer>
        </div>
      </Section>
    </div>
  )
}
