import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'

export function BitacoraBackupHelp() {
  return (
    <GlassCard className="p-6 space-y-4 text-sm text-muted-foreground">
      <GradientText as="h2" className="text-xl font-semibold">
        Tu copia cifrada (.json)
      </GradientText>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          <strong className="text-foreground">Exportar</strong> descarga un archivo. No es un
          Word legible: es tu diario <em>cerrado</em>. Nadie (ni Motus) lee el texto sin tu wallet.
        </li>
        <li>
          <strong className="text-foreground">Guárdalo</strong> donde quieras (Drive, USB, correo a
          ti mismo). Si borras entradas en Motus, el Hub ya no las tiene — el archivo es tu respaldo.
        </li>
        <li>
          <strong className="text-foreground">Recuperar</strong>: sube el mismo `.json` en{' '}
          <Link href="/bitacora/recuperar" className="text-mauve-400 underline">
            Recuperar copia
          </Link>
          , conecta la <em>misma</em> wallet, desbloquea y vuelve a ver o restaurar en tu cuenta.
        </li>
      </ol>
      <p>
        Necesitas la misma wallet que al exportar y la firma de desbloqueo de bitácora (no es el
        inicio de sesión).
      </p>
      <CTAButton asChild variant="secondary" size="lg" className="w-full sm:w-auto">
        <Link href="/bitacora/recuperar">Ir a recuperar copia</Link>
      </CTAButton>
    </GlassCard>
  )
}
