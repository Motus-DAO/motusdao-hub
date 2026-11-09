import { redirect } from 'next/navigation'

/** Escrow sessions moved to Wallet/Pagos; keep old links working. */
export default function LegacyCobrosSesionesPage() {
  redirect('/pagos/sesiones')
}
