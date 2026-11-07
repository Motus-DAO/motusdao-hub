import { ConnectAccessGate } from '@/components/payments/connect/ConnectAccessGate'
import { ConnectProvider } from '@/components/payments/connect/ConnectProvider'
import { CobrosPageShell } from '@/components/payments/connect/CobrosPageShell'
import { EmbeddedDocuments } from '@/components/payments/connect/ConnectEmbedded'
import { resolveConnectAccess } from '@/lib/stripe-connect-access'
import {
  requestedConnectAccountId,
  type ConnectSearchParams,
} from '@/lib/stripe-connect-paths'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<ConnectSearchParams>
}

export default async function CobrosDocumentsPage({ searchParams }: Props) {
  const params = await searchParams
  const access = await resolveConnectAccess(requestedConnectAccountId(params))

  if (access.kind !== 'ready') {
    return <ConnectAccessGate access={access} />
  }

  return (
    <CobrosPageShell
      title="Documentos"
      description="Descarga las facturas y formas fiscales que Stripe emite por los cobros y comisiones de tu cuenta."
      accountId={access.accountId}
      chargesEnabled={access.chargesEnabled}
      payoutsEnabled={access.payoutsEnabled}
    >
      <ConnectProvider accountId={access.accountId}>
        <EmbeddedDocuments />
      </ConnectProvider>
    </CobrosPageShell>
  )
}
