import { ConnectAccessGate } from '@/components/payments/connect/ConnectAccessGate'
import { ConnectProvider } from '@/components/payments/connect/ConnectProvider'
import { ConnectSectionLinks } from '@/components/payments/connect/ConnectSectionLinks'
import { CobrosPageShell } from '@/components/payments/connect/CobrosPageShell'
import { EmbeddedNotificationBanner } from '@/components/payments/connect/ConnectEmbedded'
import { StripeEarningsCard } from '@/components/payments/StripeEarningsCard'
import { resolveConnectAccess } from '@/lib/stripe-connect-access'
import {
  requestedConnectAccountId,
  shouldRefreshConnectStatus,
  type ConnectSearchParams,
} from '@/lib/stripe-connect-paths'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<ConnectSearchParams>
}

export default async function CobrosHomePage({ searchParams }: Props) {
  const params = await searchParams
  const access = await resolveConnectAccess(requestedConnectAccountId(params), {
    refresh: shouldRefreshConnectStatus(params),
  })

  if (access.kind !== 'ready') {
    return <ConnectAccessGate access={access} />
  }

  return (
    <CobrosPageShell
      title="Panel de cobros"
      description="Revisa el estado de tu cuenta conectada, los avisos de Stripe y tus ingresos con tarjeta."
      accountId={access.accountId}
      chargesEnabled={access.chargesEnabled}
      payoutsEnabled={access.payoutsEnabled}
    >
      <ConnectProvider accountId={access.accountId}>
        <EmbeddedNotificationBanner />
      </ConnectProvider>

      <ConnectSectionLinks accountId={access.accountId} />

      <StripeEarningsCard />
    </CobrosPageShell>
  )
}
