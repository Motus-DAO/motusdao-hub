import { ConnectAccessGate } from '@/components/payments/connect/ConnectAccessGate'
import { ConnectProvider } from '@/components/payments/connect/ConnectProvider'
import { CobrosPageShell } from '@/components/payments/connect/CobrosPageShell'
import { EmbeddedAccountManagement } from '@/components/payments/connect/ConnectEmbedded'
import { resolveConnectAccess } from '@/lib/stripe-connect-access'
import {
  requestedConnectAccountId,
  type ConnectSearchParams,
} from '@/lib/stripe-connect-paths'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<ConnectSearchParams>
}

export default async function CobrosAccountPage({ searchParams }: Props) {
  const params = await searchParams
  const access = await resolveConnectAccess(requestedConnectAccountId(params))

  if (access.kind !== 'ready') {
    return <ConnectAccessGate access={access} />
  }

  return (
    <CobrosPageShell
      title="Cuenta y banco"
      description="Actualiza tu identidad, RFC, información del negocio y la cuenta bancaria donde Stripe deposita tus cobros."
      accountId={access.accountId}
      chargesEnabled={access.chargesEnabled}
      payoutsEnabled={access.payoutsEnabled}
    >
      <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
        Por seguridad, Stripe puede abrir una ventana para que confirmes tu identidad antes de
        cambiar datos sensibles. Es la autenticación de Stripe, no la de Motus.
      </p>

      <ConnectProvider accountId={access.accountId}>
        <EmbeddedAccountManagement />
      </ConnectProvider>
    </CobrosPageShell>
  )
}
