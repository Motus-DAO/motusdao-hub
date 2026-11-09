import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SpeiPaymentCard } from '@/components/payments/SpeiPaymentCard'

export default function DepositosPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/finanzas"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Resumen
        </Link>

        <h1 className="text-3xl font-bold">Depósitos SPEI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu CLABE, las transferencias de tus pacientes y la confirmación manual,
          en un solo lugar.
        </p>

        <div className="mt-6">
          <SpeiPaymentCard />
        </div>
      </div>
    </div>
  )
}
