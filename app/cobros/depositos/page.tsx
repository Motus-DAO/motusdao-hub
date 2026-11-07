import { ConnectAccessGate } from '@/components/payments/connect/ConnectAccessGate'
import { ConnectProvider } from '@/components/payments/connect/ConnectProvider'
import { CobrosPageShell } from '@/components/payments/connect/CobrosPageShell'
import { EmbeddedPayouts } from '@/components/payments/connect/ConnectEmbedded'
import { resolveConnectAccess } from '@/lib/stripe-connect-access'
import {
  requestedConnectAccountId,
  type ConnectSearchParams,
} from '@/lib/stripe-connect-paths'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<ConnectSearchParams>
}

export default async function CobrosPayoutsPage({ searchParams }: Props) {
  const params = await searchParams
  const access = await resolveConnectAccess(requestedConnectAccountId(params))

  if (access.kind !== 'ready') {
    return <ConnectAccessGate access={access} />
  }

  return (
    <CobrosPageShell
      title="Depósitos"
      description="Revisa el historial y el calendario de depósitos que Stripe hace a tu cuenta bancaria."
      accountId={access.accountId}
      chargesEnabled={access.chargesEnabled}
      payoutsEnabled={access.payoutsEnabled}
    >
      <ConnectProvider accountId={access.accountId}>
        <EmbeddedPayouts />
      </ConnectProvider>
    </CobrosPageShell>
  )
}
