import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

export default function DepositosPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Link
          href="/finanzas"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Resumen
        </Link>

        <h1 className="text-3xl font-bold">Depósitos SPEI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transferencias bancarias por CLABE. El banco hace el KYC; Motus confirma
          manualmente cada depósito.
        </p>

        <GlassCard className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Tu CLABE</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configura tu CLABE y titular en Perfil. Cuando recibas una
                transferencia, el equipo la confirma y aparecerá en Resumen.
              </p>
              <Link
                href="/perfil"
                className="mt-3 inline-flex text-sm font-semibold text-mauve-300 hover:text-mauve-200"
              >
                Configurar CLABE en Perfil
              </Link>
            </div>
          </div>
        </GlassCard>

        <p className="mt-6 text-xs text-muted-foreground">
          La interfaz completa de depósitos SPEI (historial y confirmación) llega
          después del hackathon. Por ahora, el movimiento se registra en Resumen y
          en la actividad.
        </p>
      </div>
    </div>
  )
}
